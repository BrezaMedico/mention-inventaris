import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const serviceUrl = process.env.WHATSAPP_SERVICE_URL || 'https://mention-inventaris.onrender.com';
  const secret = process.env.WHATSAPP_SERVICE_SECRET || 'mention_wa_secret_2026';

  try {
    const res = await fetch(`${serviceUrl.replace(/\/$/, '')}/health`, {
      headers: {
        'User-Agent': 'Mention-NextJS-KeepAlive-Sentinel/2.0',
        'x-service-secret': secret,
      },
      cache: 'no-store',
    });

    const data = await res.json();

    return NextResponse.json({
      success: true,
      serviceUrl,
      health: data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        serviceUrl,
        error: err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
