import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import { getAllTasks, createTask, updateTask, deleteTask } from '@/lib/db';
import { TaskPriority } from '@/types';

export async function GET() {
  try {
    const session = await getAdminSession();
    const tasks = await getAllTasks();
    return NextResponse.json({
      success: true,
      data: tasks,
      isAdmin: Boolean(session),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Hanya administrator yang dapat menambahkan tugas.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { title, description, pic, priority, due_date } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Judul tugas wajib diisi.' },
        { status: 400 }
      );
    }

    if (!pic || !pic.trim()) {
      return NextResponse.json(
        { success: false, error: 'PIC (Penanggung Jawab) tugas wajib diisi.' },
        { status: 400 }
      );
    }

    if (!priority || !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
      return NextResponse.json(
        { success: false, error: 'Prioritas tugas tidak valid (Rendah, Sedang, Tinggi).' },
        { status: 400 }
      );
    }

    if (!due_date || !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return NextResponse.json(
        { success: false, error: 'Tenggat tugas harus berupa tanggal yang valid (YYYY-MM-DD).' },
        { status: 400 }
      );
    }

    const newTask = await createTask({
      title: title.trim(),
      description: description?.trim() || '',
      pic: pic.trim(),
      priority: priority as TaskPriority,
      due_date,
    });

    return NextResponse.json({
      success: true,
      message: 'Tugas berhasil ditambahkan.',
      data: newTask,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Hanya administrator yang dapat mengubah tugas.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { id, title, description, pic, priority, due_date } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID tugas wajib disertakan.' },
        { status: 400 }
      );
    }

    if (title !== undefined && !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Judul tugas tidak boleh kosong.' },
        { status: 400 }
      );
    }

    if (pic !== undefined && !pic.trim()) {
      return NextResponse.json(
        { success: false, error: 'PIC (Penanggung Jawab) tugas tidak boleh kosong.' },
        { status: 400 }
      );
    }

    if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
      return NextResponse.json(
        { success: false, error: 'Prioritas tugas tidak valid.' },
        { status: 400 }
      );
    }

    if (due_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return NextResponse.json(
        { success: false, error: 'Format tenggat tugas tidak valid (YYYY-MM-DD).' },
        { status: 400 }
      );
    }

    const updatedTask = await updateTask(id, {
      title,
      description,
      pic,
      priority,
      due_date,
    });

    if (!updatedTask) {
      return NextResponse.json(
        { success: false, error: 'Tugas tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tugas berhasil diperbarui.',
      data: updatedTask,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Hanya administrator yang dapat menghapus tugas.' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID tugas wajib disertakan.' },
        { status: 400 }
      );
    }

    const result = await deleteTask(id);
    return NextResponse.json({
      success: true,
      message: 'Tugas berhasil dihapus.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
