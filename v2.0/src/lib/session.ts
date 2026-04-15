export type Role = 'admin' | 'user';

export interface Session {
  role: Role;
  iat: number;
  exp: number;
}

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
const DEV_SECRET = 'felswerke-dev-secret-change-in-production';

function getSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET environment variable is required in production');
  }
  console.warn('[session] AUTH_SECRET not set — using insecure dev secret');
  return DEV_SECRET;
}

export async function createSessionToken(role: Role): Promise<string> {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ role, iat: now, exp: now + SESSION_MAX_AGE });
  const encoded = btoa(payload);
  const sig = await hmacSign(encoded, secret);
  return `${encoded}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  const secret = getSecret();
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return null;

  const encoded = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);
  if (!encoded || !sig) return null;

  const valid = await hmacVerify(encoded, sig, secret);
  if (!valid) return null;

  try {
    const session: Session = JSON.parse(atob(encoded));
    if (session.exp < Math.floor(Date.now() / 1000)) return null;
    if (session.role !== 'admin' && session.role !== 'user') return null;
    return session;
  } catch {
    return null;
  }
}

export function getSessionMaxAge(): number {
  return SESSION_MAX_AGE;
}

// HMAC-SHA256 using Web Crypto API (works in Edge Runtime + Node.js)
async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacVerify(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const expected = await hmacSign(payload, secret);
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}
