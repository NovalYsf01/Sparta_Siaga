import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { logId, acknowledgedBy = 'Duty Officer DC Cabang', notes = '' } = body;

    if (!logId) {
      return NextResponse.json({ success: false, error: 'logId is required' }, { status: 400 });
    }

    const pool = getDbPool();
    const now = new Date().toISOString();

    const res = await pool.query(
      `UPDATE notification_logs 
       SET status = 'acknowledged',
           acknowledged_at = $1,
           acknowledged_by = $2,
           acknowledgment_notes = $3
       WHERE id = $4
       RETURNING *;`,
      [now, acknowledgedBy, notes, logId]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Notification log not found' }, { status: 404 });
    }

    const updated = res.rows[0];
    return NextResponse.json({
      success: true,
      message: `Insiden ${updated.ticket_number} berhasil dikonfirmasi dan ditandai sedang ditangani oleh ${acknowledgedBy}.`,
      log: {
        id: updated.id,
        disaster_id: updated.disaster_id,
        disaster_type: updated.disaster_type,
        channel: updated.channel,
        branch: updated.branch,
        recipient_role: updated.recipient_role,
        recipient_contact: updated.recipient_contact,
        title: updated.title,
        message: updated.message,
        affected_stores_count: Number(updated.affected_stores_count),
        affected_stores_sample: updated.affected_stores_sample || [],
        ticket_number: updated.ticket_number,
        status: updated.status,
        sent_at: updated.sent_at,
        acknowledged_at: updated.acknowledged_at,
        acknowledged_by: updated.acknowledged_by,
        acknowledgment_notes: updated.acknowledgment_notes,
      }
    });
  } catch (error: any) {
    console.error('[Notification ACK API Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to acknowledge notification' }, { status: 500 });
  }
}
