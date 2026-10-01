import { getDbPool } from "./db";

export type EstimationType = "SPARTA_M" | "MANTRA" | "SPARTA_B";
export type EstimationStatus = "draft" | "submitted" | "approved" | "rejected" | "spk_issued";
export type TkpType = "toko" | "dc";

export interface EstimationRecord {
  id: string;
  reportId: string;
  reporterNik: string;
  reporterName: string;
  tkpType: TkpType;
  estimationType: EstimationType;
  status: EstimationStatus;
  approvalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export async function dbInitEstimationsTable() {
  const pool = getDbPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS estimations (
      id VARCHAR(50) PRIMARY KEY,
      report_id VARCHAR(50) NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
      reporter_nik VARCHAR(50) NOT NULL,
      reporter_name VARCHAR(100) NOT NULL,
      tkp_type VARCHAR(20) NOT NULL,
      estimation_type VARCHAR(30) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'submitted',
      approval_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function dbCreateEstimation(data: Omit<EstimationRecord, "id" | "createdAt" | "updatedAt">): Promise<EstimationRecord> {
  await dbInitEstimationsTable();
  const pool = getDbPool();
  
  const estId = `EST-${Date.now().toString().slice(-6)}`;
  
  const { rows } = await pool.query(
    `INSERT INTO estimations (id, report_id, reporter_nik, reporter_name, tkp_type, estimation_type, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [estId, data.reportId, data.reporterNik, data.reporterName, data.tkpType, data.estimationType, data.status]
  );
  
  const row = rows[0];
  return {
    id: row.id,
    reportId: row.report_id,
    reporterNik: row.reporter_nik,
    reporterName: row.reporter_name,
    tkpType: row.tkp_type,
    estimationType: row.estimation_type,
    status: row.status,
    approvalNotes: row.approval_notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function dbGetEstimationsForReport(reportId: string): Promise<EstimationRecord[]> {
  await dbInitEstimationsTable();
  const pool = getDbPool();
  const { rows } = await pool.query(`SELECT * FROM estimations WHERE report_id = $1 ORDER BY created_at DESC`, [reportId]);
  
  return rows.map(row => ({
    id: row.id,
    reportId: row.report_id,
    reporterNik: row.reporter_nik,
    reporterName: row.reporter_name,
    tkpType: row.tkp_type,
    estimationType: row.estimation_type,
    status: row.status,
    approvalNotes: row.approval_notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}
