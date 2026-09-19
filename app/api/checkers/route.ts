import { NextResponse } from 'next/server';
import { getCheckers } from '@/lib/db';

export async function GET() {
  try {
    const checkers = await getCheckers();
    return NextResponse.json({ success: true, data: checkers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
