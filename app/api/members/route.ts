import { NextRequest, NextResponse } from 'next/server';
import { getMembersByGeneration, getAllMembers } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const generationId = searchParams.get('generationId');

    if (generationId) {
      const onlyActiveLoans = searchParams.get('onlyActiveLoans') === 'true';
      const members = await getMembersByGeneration(generationId, { onlyActiveLoans });
      return NextResponse.json({ success: true, data: members });
    }

    const allMembers = await getAllMembers();
    return NextResponse.json({ success: true, data: allMembers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
