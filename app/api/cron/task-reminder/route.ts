import { NextRequest, NextResponse } from 'next/server';
import { checkAndCreateTaskScheduleReminders } from '@/lib/db';
import { dispatchPendingNotifications } from '@/lib/whatsapp/provider';
import { getAdminSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    const url = new URL(request.url);
    const secret =
      request.headers.get('x-cron-secret') ||
      request.headers.get('x-service-secret') ||
      url.searchParams.get('secret');
    const expectedSecret = process.env.WHATSAPP_SERVICE_SECRET || 'mention_wa_secret_2026';

    if (!session && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ambil mode: 'all' (default: Hari H, H-1, H-2 sekaligus pada 07:00 WIB), 'morning'/'h0', 'afternoon'/'h1'/'h2'
    let mode: 'auto' | 'morning' | 'afternoon' | 'all' | 'h0' | 'h1' | 'h2' =
      (url.searchParams.get('mode') || 'all') as any;
    try {
      const body = await request.clone().json();
      if (body?.mode) mode = body.mode;
    } catch {}

    // 1. Evaluasi jadwal pengingat tugas (anti-spam & deduplikasi)
    const { newEvents, skippedCount, taskCount, modeExecuted } = await checkAndCreateTaskScheduleReminders(mode);

    // 2. Dispatch pending notifications ke grup WhatsApp jika ada pesan baru
    let dispatchResult = { sentCount: 0, failedCount: 0 };
    if (newEvents.length > 0) {
      dispatchResult = await dispatchPendingNotifications();
    }

    return NextResponse.json({
      success: true,
      mode: modeExecuted,
      message:
        newEvents.length > 0
          ? `Pengingat tugas (${modeExecuted}) berhasil diproses. ${taskCount} tugas digabungkan ke WhatsApp, ${skippedCount} dilewati (anti-spam).`
          : `Tidak ada pesan terkirim untuk jadwal ${modeExecuted} (tugas baru: 0, dilewati: ${skippedCount}). Data kosong tidak dikirim.`,
      remindersCreated: newEvents.length,
      taskCount,
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

