import { NextRequest, NextResponse } from 'next/server';
import { processReturnTransaction, verifyCheckerPin } from '@/lib/db';
import { dispatchPendingNotifications } from '@/lib/whatsapp/provider';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, checkerId, pin, items } = body;

    // 1. Validations
    if (!loanId) {
      return NextResponse.json({ success: false, error: 'Transaksi peminjaman harus ditentukan.' }, { status: 400 });
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

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Pilih minimal satu barang untuk dikembalikan.' }, { status: 400 });
    }

    // 3. Process return transaction
    const result = await processReturnTransaction({
      loanId,
      checkerId,
      items,
    });

    if (!result.success || !result.loan) {
      return NextResponse.json({ success: false, error: result.error || 'Gagal memproses pengembalian.' }, { status: 400 });
    }

    // 4. Trigger WhatsApp notification
    await dispatchPendingNotifications().catch((err) => {
      console.warn('WhatsApp notification dispatch error (non-fatal):', err.message);
    });

    return NextResponse.json({
      success: true,
      message: 'Pengembalian barang berhasil dicatat.',
      loanId: result.loan.id,
      loanStatus: result.loan.status,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
