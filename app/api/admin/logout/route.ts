import { NextResponse } from 'next/server';
import { destroyAdminSession, getAdminSession } from '@/lib/auth/session';

export async function POST() {
  await destroyAdminSession();
  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, admin: session });
}
