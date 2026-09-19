import { NextRequest, NextResponse } from 'next/server';
import { checkAndCreateWeeklyOverdueReminders } from '@/lib/db';
import { dispatchPendingNotifications } from '@/lib/whatsapp/provider';

export async function POST(request: NextRequest) {
  try {
    // Optional secret check
    const secret = request.headers.get('x-cron-secret') || new URL(request.url).searchParams.get('secret');
    const expectedSecret = process.env.WHATSAPP_SERVICE_SECRET || 'mention_wa_secret_2026';

    if (secret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Detect overdue loans and create max 1 reminder per week per loan
    const newEvents = await checkAndCreateWeeklyOverdueReminders();

    // 2. Dispatch pending notifications
    const dispatchResult = await dispatchPendingNotifications();

    return NextResponse.json({
      success: true,
      createdCount: newEvents.length,
      dispatched: dispatchResult,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
