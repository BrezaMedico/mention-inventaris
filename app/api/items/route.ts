import { NextRequest, NextResponse } from 'next/server';
import { getItems } from '@/lib/db';
import { ItemStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'AVAILABLE') as ItemStatus | 'ALL';
    const items = await getItems(status);
    return NextResponse.json({ success: true, data: items });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
