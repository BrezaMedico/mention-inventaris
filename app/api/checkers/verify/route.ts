import { NextRequest, NextResponse } from 'next/server';
import { verifyCheckerPin } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkerId, pin } = body;

    if (!checkerId) {
      return NextResponse.json({ success: false, error: 'PIC Checker harus dipilih.' }, { status: 400 });
    }

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ success: false, error: 'Kode verifikasi harus diisi.' }, { status: 400 });
    }

    // Check exact 6 numeric digits
    if (!/^\d{6}$/.test(pin.trim())) {
      return NextResponse.json(
        { success: false, error: 'PIN PIC harus 6 digit angka.' },
        { status: 400 }
      );
    }

    const result = await verifyCheckerPin(checkerId, pin.trim());
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Kode verifikasi PIC salah.' }, { status: 401 });
    }

    return NextResponse.json({ success: true, checkerName: result.checkerName });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
