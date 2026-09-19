import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import { getItems, saveItem, updateItem, deleteItem } from '@/lib/db';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const items = await getItems('ALL');
    return NextResponse.json({ success: true, data: items });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, code, description, status, accessories } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Nama barang wajib diisi.' }, { status: 400 });
    }

    const item = await saveItem(
      {
        name: name.trim(),
        code: code?.trim(),
        description: description?.trim(),
        status: status || 'AVAILABLE',
      },
      accessories || []
    );

    return NextResponse.json({ success: true, data: item });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, name, code, description, status, accessories } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Item ID wajib diisi.' }, { status: 400 });
    }

    const updated = await updateItem(
      id,
      {
        name: name.trim(),
        code: code?.trim(),
        description: description?.trim(),
        status: status || 'AVAILABLE',
      },
      accessories
    );

    return NextResponse.json({ success: updated });
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
      return NextResponse.json({ success: false, error: 'Item ID wajib diisi.' }, { status: 400 });
    }

    const result = await deleteItem(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Gagal menghapus barang.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Barang berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
