import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials, createAdminSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username dan password wajib diisi.' }, { status: 400 });
    }

    const verification = await verifyAdminCredentials(username, password);
    if (!verification.success || !verification.admin) {
      return NextResponse.json({ success: false, error: verification.error || 'Username atau password salah.' }, { status: 401 });
    }

    await createAdminSession({
      id: verification.admin.id,
      username: verification.admin.username,
      name: verification.admin.name,
    });

    return NextResponse.json({
      success: true,
      admin: { username: verification.admin.username, name: verification.admin.name },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
