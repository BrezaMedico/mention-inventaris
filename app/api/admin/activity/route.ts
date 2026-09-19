import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import { getLoansActivity, getCurrentlyBorrowedItems, deleteLoan } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view'); // 'loans' or 'borrowed_items'

    if (view === 'borrowed_items') {
      const items = await getCurrentlyBorrowedItems();
      return NextResponse.json({ success: true, data: items });
    }

    const allLoans = await getLoansActivity();
    const activeLoans = allLoans.filter((l) => l.status !== 'RETURNED');
    return NextResponse.json({ success: true, data: activeLoans });
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
      return NextResponse.json({ success: false, error: 'ID transaksi wajib diisi.' }, { status: 400 });
    }

    const result = await deleteLoan(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Gagal menghapus transaksi.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Transaksi berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
