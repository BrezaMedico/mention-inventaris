import { NextResponse } from 'next/server';
import { getGenerations } from '@/lib/db';

export async function GET() {
  try {
    const generations = await getGenerations();
    return NextResponse.json({ success: true, data: generations });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
