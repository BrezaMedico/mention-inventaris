import { NextRequest, NextResponse } from 'next/server';
import { createLoanTransaction, verifyCheckerPin, getLoansActivity } from '@/lib/db';
import { dispatchPendingNotifications } from '@/lib/whatsapp/provider';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const loans = await getLoansActivity();
      const loan = loans.find((l) => l.id === id);
      if (!loan) {
        return NextResponse.json({ success: false, error: 'Peminjaman tidak ditemukan.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: loan });
    }

    const loans = await getLoansActivity();
    return NextResponse.json({ success: true, data: loans });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, customName, customPhone, generationId, borrowDate, expectedReturnDate, checkerId, pin, notes, items } = body;

    // 1. Mandatory validations
    if (!memberId && !customName) {
      return NextResponse.json({ success: false, error: 'Peminjam harus dipilih atau ditulis namanya.' }, { status: 400 });
    }

    if (!borrowDate || !expectedReturnDate) {
      return NextResponse.json({ success: false, error: 'Tanggal peminjaman dan pengembalian harus diisi.' }, { status: 400 });
    }

    if (new Date(expectedReturnDate) < new Date(borrowDate)) {
      return NextResponse.json(
        { success: false, error: 'Tanggal pengembalian tidak boleh lebih awal dari tanggal peminjaman.' },
        { status: 400 }
      );
    }

    if (!checkerId) {
      return NextResponse.json({ success: false, error: 'PIC Checker harus dipilih.' }, { status: 400 });
    }

    if (!pin || !/^\d{6}$/.test(pin.trim())) {
      return NextResponse.json({ success: false, error: 'PIN PIC harus 6 digit angka.' }, { status: 400 });
    }

    // 2. Re-verify PIC PIN on server
    const pinCheck = await verifyCheckerPin(checkerId, pin.trim());
    if (!pinCheck.success) {
      return NextResponse.json({ success: false, error: pinCheck.error || 'Kode PIC salah.' }, { status: 401 });
    }

    // 3. Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Minimal satu barang harus dipilih.' }, { status: 400 });
    }

    // 4. Create loan transaction (atomic with race-condition check)
    const result = await createLoanTransaction({
      memberId,
      customName,
      customPhone,
      generationId,
      borrowDate,
      expectedReturnDate,
      checkerId,
      notes,
      items,
    });

    if (!result.success || !result.loan) {
      return NextResponse.json({ success: false, error: result.error || 'Gagal menyimpan transaksi peminjaman.' }, { status: 409 });
    }

    // 5. Trigger WhatsApp notification
    await dispatchPendingNotifications().catch((err) => {
      console.warn('WhatsApp notification dispatch error (non-fatal):', err.message);
    });

    return NextResponse.json({
      success: true,
      message: 'Peminjaman berhasil dicatat.',
      loanId: result.loan.id,
      loanCode: result.loan.loan_code,
      data: result.loan,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
