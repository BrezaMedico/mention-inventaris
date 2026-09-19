import { NextRequest, NextResponse } from 'next/server';
import { getActiveLoansByMember } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ success: false, error: 'memberId harus disertakan.' }, { status: 400 });
    }

    const loans = await getActiveLoansByMember(memberId);
    return NextResponse.json({ success: true, data: loans });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
