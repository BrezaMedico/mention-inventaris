import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import {
  getAllGenerationsAdmin,
  getAllMembers,
  saveGeneration,
  toggleGenerationActive,
  saveMember,
  updateMember,
  deleteMember,
  deleteGeneration,
} from '@/lib/db';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const generations = await getAllGenerationsAdmin();
    const members = await getAllMembers();
    return NextResponse.json({ success: true, generations, members });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create_generation') {
      const { name, order_index } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, error: 'Nama angkatan wajib diisi.' }, { status: 400 });
      }
      const gen = await saveGeneration(name.trim(), order_index || 0);
      return NextResponse.json({ success: true, data: gen });
    }

    if (action === 'create_member') {
      const { generation_id, name, phone } = body;
      if (!generation_id || !name || !name.trim()) {
        return NextResponse.json({ success: false, error: 'Angkatan dan nama anggota wajib diisi.' }, { status: 400 });
      }
      const member = await saveMember(generation_id, name.trim(), phone?.trim());
      return NextResponse.json({ success: true, data: member });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak dikenal.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { action, id, is_active, name, generation_id, phone } = body;

    if (action === 'toggle_generation') {
      const success = await toggleGenerationActive(id, is_active);
      return NextResponse.json({ success });
    }

    if (action === 'update_member') {
      const updates: any = {};
      if (typeof is_active === 'boolean') updates.is_active = is_active;
      if (name) updates.name = name.trim();
      if (generation_id) updates.generation_id = generation_id;
      if (typeof phone !== 'undefined') updates.phone = phone?.trim();

      const success = await updateMember(id, updates);
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
    const type = searchParams.get('type') || 'member';

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID wajib diisi.' }, { status: 400 });
    }

    const result = type === 'generation' ? await deleteGeneration(id) : await deleteMember(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Gagal menghapus.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
