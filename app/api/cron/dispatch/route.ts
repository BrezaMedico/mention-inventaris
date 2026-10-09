import { NextRequest, NextResponse } from 'next/server';
import { dispatchPendingNotifications } from '@/lib/whatsapp/provider';

export async function POST(request: NextRequest) {
  try {
    const secret =
      request.headers.get('x-cron-secret') ||
      request.headers.get('x-service-secret') ||
      new URL(request.url).searchParams.get('secret');
    const expectedSecret = process.env.WHATSAPP_SERVICE_SECRET || 'mention_wa_secret_2026';

    if (secret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await dispatchPendingNotifications();

    return NextResponse.json({
      success: true,
      dispatched: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
