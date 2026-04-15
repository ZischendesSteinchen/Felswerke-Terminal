import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('felswerke-session')?.value;

  if (!token) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  return NextResponse.json({
    role: session.role,
    exp: session.exp,
  });
}
