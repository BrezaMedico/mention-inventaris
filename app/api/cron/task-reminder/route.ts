import { NextRequest, NextResponse } from 'next/server';
import { checkAndCreateTaskH1Reminders } from '@/lib/db';
import { dispatchPendingNotifications } from '@/lib/whatsapp/provider';
import { getAdminSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    // Autentikasi: Izinkan jika admin sedang login, atau jika request menyertakan cron secret yang benar
    const session = await getAdminSession();
    const secret = request.headers.get('x-cron-secret') || new URL(request.url).searchParams.get('secret');
    const expectedSecret = process.env.WHATSAPP_SERVICE_SECRET || 'mention_wa_secret_2026';

    if (!session && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Cek tugas yang besok deadline (H-1) dengan proteksi anti-spam & anti-double
    const { newEvents, skippedCount, targetDate } = await checkAndCreateTaskH1Reminders();

    // 2. Dispatch pending notifications ke grup WhatsApp
    const dispatchResult = await dispatchPendingNotifications();

    return NextResponse.json({
      success: true,
      message: `Pengingat H-1 selesai diproses. ${newEvents.length} pesan baru dikirim, ${skippedCount} dilewati (sudah pernah dikirim).`,
      targetDueDate: targetDate,
      remindersCreated: newEvents.length,
      skippedDueToDuplicate: skippedCount,
      dispatched: dispatchResult,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Task reminder cron error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
