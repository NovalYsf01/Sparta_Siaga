import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Forbidden: Notifications are read-only information. Operational actions must be performed in Laporan Kejadian.',
    },
    { status: 403 }
  );
}
