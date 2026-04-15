import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { createSessionToken, getSessionMaxAge, type Role } from '@/lib/session';

// In-memory rate limiter (sufficient for local/single-instance use)
const attempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000; // 30 seconds

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry) return true;
  if (now - entry.lastAttempt > LOCKOUT_MS) {
    attempts.delete(ip);
    return true;
  }
  return entry.count < MAX_ATTEMPTS;
}

function recordAttempt(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.lastAttempt > LOCKOUT_MS) {
    attempts.set(ip, { count: 1, lastAttempt: now });
  } else {
    entry.count++;
    entry.lastAttempt = now;
  }
}

function clearAttempts(ip: string) {
  attempts.delete(ip);
}

async function setSessionCookie(
  response: NextResponse,
  role: Role,
): Promise<void> {
  const token = await createSessionToken(role);
  response.cookies.set('felswerke-session', token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: getSessionMaxAge(),
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function POST(request: Request) {
  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for') ?? hdrs.get('x-real-ip') ?? '127.0.0.1';

  const adminHash = process.env.ADMIN_PIN_HASH;
  const userHash = process.env.USER_PIN_HASH;

  // If no PIN hashes configured → auto-authenticate as admin (dev convenience)
  if (!adminHash && !userHash) {
    const response = NextResponse.json({ success: true, role: 'admin' });
    await setSessionCookie(response, 'admin');
    return response;
  }

  // Rate limiting
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  let body: { pin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  if (!body.pin || typeof body.pin !== 'string') {
    return NextResponse.json({ error: 'PIN required' }, { status: 400 });
  }

  // Validate: exactly 4 digits
  if (!/^\d{4}$/.test(body.pin)) {
    return NextResponse.json(
      { error: 'PIN must be exactly 4 digits' },
      { status: 400 },
    );
  }

  // Check admin PIN first, then user PIN
  if (adminHash && (await bcrypt.compare(body.pin, adminHash))) {
    clearAttempts(ip);
    const response = NextResponse.json({ success: true, role: 'admin' });
    await setSessionCookie(response, 'admin');
    return response;
  }

  if (userHash && (await bcrypt.compare(body.pin, userHash))) {
    clearAttempts(ip);
    const response = NextResponse.json({ success: true, role: 'user' });
    await setSessionCookie(response, 'user');
    return response;
  }

  // No match
  recordAttempt(ip);
  return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
}
