import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import { getLoansActivity, deleteLoan } from '@/lib/db';
import { LoanStatus } from '@/types';

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = (searchParams.get('status') || 'ALL') as LoanStatus | 'ALL';

    const history = await getLoansActivity({ search, status });
    return NextResponse.json({ success: true, data: history });
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
      return NextResponse.json({ success: false, error: 'ID riwayat transaksi wajib diisi.' }, { status: 400 });
    }

    const result = await deleteLoan(id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Gagal menghapus riwayat transaksi.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Riwayat transaksi berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
