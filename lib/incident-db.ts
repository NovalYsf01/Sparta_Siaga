import { getDbPool } from "./db";
import { IncidentRecord } from "@/types/incident";

function rowToIncident(row: any): IncidentRecord {
  return {
    id: row.id,
    date: row.date,
    disasterType: row.disaster_type,
    storeId: row.store_id,
    storeName: row.store_name,
    branch: row.branch,
    locationCity: row.location_city,
    status: row.status,
    progress: row.progress,
    disasterMetadata: row.disaster_metadata ?? undefined,
    verification: row.verification ?? undefined,
    maintenanceTicket: row.maintenance_ticket ?? undefined,
    timeline: row.timeline ?? [],
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at,
    closedAt: row.closed_at
      ? row.closed_at instanceof Date
        ? row.closed_at.toISOString()
        : row.closed_at
      : undefined,
  };
}

export async function dbGetAllIncidents(): Promise<IncidentRecord[]> {
  const pool = getDbPool();
  const { rows } = await pool.query(
    `SELECT * FROM incidents ORDER BY created_at DESC`
  );
  return rows.map(rowToIncident);
}

export async function dbGetIncidentById(
  id: string
): Promise<IncidentRecord | null> {
  const pool = getDbPool();
  const { rows } = await pool.query(
    `SELECT * FROM incidents WHERE id = $1`,
    [id]
  );
  if (rows.length === 0) return null;
  return rowToIncident(rows[0]);
}

export async function dbCreateIncident(
  inc: IncidentRecord
): Promise<IncidentRecord> {
  const pool = getDbPool();
  const { rows } = await pool.query(
    `INSERT INTO incidents (
      id, date, disaster_type, store_id, store_name, branch, location_city,
      status, progress, disaster_metadata, verification, maintenance_ticket,
      timeline, created_at, updated_at, closed_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    ON CONFLICT (id) DO UPDATE SET
      status             = EXCLUDED.status,
      progress           = EXCLUDED.progress,
      disaster_metadata  = EXCLUDED.disaster_metadata,
      verification       = EXCLUDED.verification,
      maintenance_ticket = EXCLUDED.maintenance_ticket,
      timeline           = EXCLUDED.timeline,
      updated_at         = NOW()
    RETURNING *`,
    [
      inc.id,
      inc.date,
      inc.disasterType,
      inc.storeId,
      inc.storeName,
      inc.branch,
      inc.locationCity,
      inc.status,
      inc.progress,
      inc.disasterMetadata ? JSON.stringify(inc.disasterMetadata) : null,
      inc.verification ? JSON.stringify(inc.verification) : null,
      inc.maintenanceTicket ? JSON.stringify(inc.maintenanceTicket) : null,
      JSON.stringify(inc.timeline),
      inc.createdAt,
      inc.updatedAt,
      inc.closedAt ?? null,
    ]
  );
  return rowToIncident(rows[0]);
}

export async function dbUpdateIncident(
  id: string,
  patch: Partial<IncidentRecord>
): Promise<IncidentRecord | null> {
  const pool = getDbPool();
  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const scalarFieldMap: Record<string, string> = {
    status: "status",
    progress: "progress",
    disasterType: "disaster_type",
    storeName: "store_name",
    branch: "branch",
    locationCity: "location_city",
    date: "date",
    storeId: "store_id",
  };

  for (const [key, col] of Object.entries(scalarFieldMap)) {
    if (key in patch) {
      setClauses.push(`${col} = $${idx++}`);
      values.push((patch as any)[key]);
    }
  }

  if (patch.verification !== undefined) {
    setClauses.push(`verification = $${idx++}`);
    values.push(JSON.stringify(patch.verification));
  }
  if (patch.maintenanceTicket !== undefined) {
    setClauses.push(`maintenance_ticket = $${idx++}`);
    values.push(JSON.stringify(patch.maintenanceTicket));
  }
  if (patch.timeline !== undefined) {
    setClauses.push(`timeline = $${idx++}`);
    values.push(JSON.stringify(patch.timeline));
  }
  if (patch.disasterMetadata !== undefined) {
    setClauses.push(`disaster_metadata = $${idx++}`);
    values.push(JSON.stringify(patch.disasterMetadata));
  }
  if (patch.closedAt !== undefined) {
    setClauses.push(`closed_at = $${idx++}`);
    values.push(patch.closedAt);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE incidents SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  if (rows.length === 0) return null;
  return rowToIncident(rows[0]);
}

export async function dbDeleteIncident(id: string): Promise<boolean> {
  const pool = getDbPool();
  const { rowCount } = await pool.query(
    `DELETE FROM incidents WHERE id = $1`,
    [id]
  );
  return (rowCount ?? 0) > 0;
}
