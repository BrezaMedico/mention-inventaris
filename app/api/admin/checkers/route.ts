import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import { getAllCheckersAdmin, saveChecker, updateCheckerPin, toggleCheckerActive, deleteChecker } from '@/lib/db';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const checkers = await getAllCheckersAdmin();
    return NextResponse.json({ success: true, data: checkers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, pin } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Nama PIC wajib diisi.' }, { status: 400 });
    }

    if (!pin || !/^\d{6}$/.test(pin.trim())) {
      return NextResponse.json({ success: false, error: 'PIN PIC harus tepat 6 digit angka.' }, { status: 400 });
    }

    await saveChecker(name.trim(), pin.trim());
    return NextResponse.json({ success: true, message: 'PIC Checker berhasil ditambahkan.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { action, id, pin, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID PIC wajib diisi.' }, { status: 400 });
    }

    if (action === 'reset_pin') {
      if (!pin || !/^\d{6}$/.test(pin.trim())) {
        return NextResponse.json({ success: false, error: 'PIN baru harus tepat 6 digit angka.' }, { status: 400 });
      }
      const success = await updateCheckerPin(id, pin.trim());
      return NextResponse.json({ success, message: 'PIN 6 digit PIC berhasil diubah.' });
    }

    if (action === 'toggle_active') {
      const success = await toggleCheckerActive(id, is_active);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak dikenal.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID PIC wajib diisi.' }, { status: 400 });
    }

    const result = await deleteChecker(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Gagal menghapus PIC.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'PIC Checker berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
