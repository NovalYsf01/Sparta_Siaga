import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // NON-NEGOTIABLE BUSINESS RULE: NOTIFICATION = PURE INFORMATION
    // All operational mutations (acknowledge, update_store, resolve) 
    // are forbidden on notification objects. Operational workflow belongs to Laporan Kejadian.
    
    if (['acknowledge', 'update_store', 'batch_verify_all', 'resolve'].includes(action)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Forbidden: Notifications are read-only information. Operational actions must be performed in Laporan Kejadian.' 
      }, { status: 403 });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });

  } catch (error: any) {
    console.error('[Incident Action API Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Operation failed' }, { status: 500 });
  }
}

function formatLog(row: any) {
  return {
    id: row.id,
    disaster_id: row.disaster_id,
    disaster_type: row.disaster_type,
    channel: row.channel,
    branch: row.branch,
    recipient_role: row.recipient_role,
    recipient_contact: row.recipient_contact,
    title: row.title,
    message: row.message,
    affected_stores_count: Number(row.affected_stores_count),
    affected_stores_sample: row.affected_stores_sample || [],
    ticket_number: row.ticket_number,
    status: row.status,
    sent_at: row.sent_at,
    acknowledged_at: row.acknowledged_at,
    acknowledged_by: row.acknowledged_by,
    acknowledgment_notes: row.acknowledgment_notes,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    resolution_notes: row.resolution_notes,
    store_verifications: row.store_verifications || {},
  };
}
