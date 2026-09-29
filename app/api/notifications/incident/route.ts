import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      action, 
      logId, 
      officerName = 'Duty Officer DC Cabang', 
      notes = '',
      storeCode,
      storeStatus, // 'safe' | 'damaged' | 'unverified'
      allStoreCodes, // for batch verify
    } = body;

    if (!logId) {
      return NextResponse.json({ success: false, error: 'logId is required' }, { status: 400 });
    }

    const pool = getDbPool();
    const now = new Date().toISOString();

    // 1. Fetch current record
    const currRes = await pool.query(`SELECT * FROM notification_logs WHERE id = $1`, [logId]);
    if (currRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Incident not found' }, { status: 404 });
    }
    const current = currRes.rows[0];
    let storeVerifications: Record<string, string> = current.store_verifications || {};

    // 2. Action Handlers
    if (action === 'acknowledge') {
      const res = await pool.query(
        `UPDATE notification_logs 
         SET status = 'acknowledged',
             acknowledged_at = $1,
             acknowledged_by = $2,
             acknowledgment_notes = $3
         WHERE id = $4
         RETURNING *;`,
        [now, officerName, notes || 'Diterima dan sedang ditindaklanjuti', logId]
      );
      const row = res.rows[0];
      return NextResponse.json({ success: true, message: `Insiden #${row.ticket_number} berhasil dikonfirmasi sedang ditangani.`, log: formatLog(row) });
    }

    if (action === 'update_store') {
      if (!storeCode || !storeStatus) {
        return NextResponse.json({ success: false, error: 'storeCode and storeStatus are required' }, { status: 400 });
      }
      storeVerifications[storeCode] = storeStatus;

      const res = await pool.query(
        `UPDATE notification_logs 
         SET store_verifications = $1
         WHERE id = $2
         RETURNING *;`,
        [JSON.stringify(storeVerifications), logId]
      );
      const row = res.rows[0];
      return NextResponse.json({ success: true, message: `Status toko ${storeCode} diperbarui ke ${storeStatus}.`, log: formatLog(row) });
    }

    if (action === 'batch_verify_all') {
      const codes: string[] = allStoreCodes || (current.affected_stores_sample || []).map((s: any) => s.kode_toko);
      for (const c of codes) {
        storeVerifications[c] = 'safe';
      }

      const res = await pool.query(
        `UPDATE notification_logs 
         SET store_verifications = $1
         WHERE id = $2
         RETURNING *;`,
        [JSON.stringify(storeVerifications), logId]
      );
      const row = res.rows[0];
      return NextResponse.json({ success: true, message: `Seluruh toko berhasil diverifikasi berstatus AMAN.`, log: formatLog(row) });
    }

    if (action === 'resolve') {
      const res = await pool.query(
        `UPDATE notification_logs 
         SET status = 'resolved',
             resolved_at = $1,
             resolved_by = $2,
             resolution_notes = $3
         WHERE id = $4
         RETURNING *;`,
        [now, officerName, notes || 'Seluruh gerai toko telah diverifikasi dan insiden selesai ditangani.', logId]
      );
      const row = res.rows[0];
      return NextResponse.json({ success: true, message: `Insiden #${row.ticket_number} resmi ditandai SELESAI DITANGANI.`, log: formatLog(row) });
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
