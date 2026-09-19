import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import { getDashboardStats, getDatabaseStatus } from '@/lib/db';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getDashboardStats();
    const dbStatus = await getDatabaseStatus();
    return NextResponse.json({ success: true, stats, dbStatus });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
