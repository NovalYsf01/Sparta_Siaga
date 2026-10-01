import { getDbPool } from "./db";
import { IncidentRecord, ManagementInstruction } from "@/types/incident";

function rowToIncident(row: Record<string, unknown>): IncidentRecord {
  return {
    id: row.id as string,
    date: row.date as string,
    disasterType: row.disaster_type as IncidentRecord["disasterType"],
    reportOrigin: (row.report_origin as IncidentRecord["reportOrigin"]) ?? "manual",
    earthquakeEventId: (row.earthquake_event_id as string) ?? undefined,
    earthquakeSource: (row.earthquake_source as string) ?? undefined,
    earthquakeProvenance: (row.earthquake_provenance as string) ?? undefined,
    tkpType: (row.tkp_type as IncidentRecord["tkpType"]) ?? undefined,
    storeId: row.store_id as string,
    storeName: row.store_name as string,
    branch: row.branch as string,
    locationCity: row.location_city as string,
    status: row.status as IncidentRecord["status"],
    progress: row.progress as number,
    disasterMetadata: (row.disaster_metadata as IncidentRecord["disasterMetadata"]) ?? undefined,
    affectedStores: (row.affected_stores as IncidentRecord["affectedStores"]) ?? undefined,
    affectedStoreCount: (row.affected_store_count as number) ?? undefined,
    dangerStoreCount: (row.danger_store_count as number) ?? undefined,
    verification: (row.verification as IncidentRecord["verification"]) ?? undefined,
    maintenanceTicket: (row.maintenance_ticket as IncidentRecord["maintenanceTicket"]) ?? undefined,
    fieldPhotos: (row.field_photos as string[]) ?? [],
    timeline: (row.timeline as IncidentRecord["timeline"]) ?? [],
    createdAt:
      row.created_at instanceof Date
        ? (row.created_at as Date).toISOString()
        : (row.created_at as string),
    updatedAt:
      row.updated_at instanceof Date
        ? (row.updated_at as Date).toISOString()
        : (row.updated_at as string),
    closedAt: row.closed_at
      ? row.closed_at instanceof Date
        ? (row.closed_at as Date).toISOString()
        : (row.closed_at as string)
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

/**
 * Find an existing automatic earthquake report for a given event + branch.
 * Used for deduplication: ONE earthquake event + ONE affected branch = ONE report.
 */
export async function dbFindAutoEarthquakeReport(
  earthquakeEventId: string,
  branch: string
): Promise<IncidentRecord | null> {
  const pool = getDbPool();
  const { rows } = await pool.query(
    `SELECT * FROM incidents
     WHERE earthquake_event_id = $1 AND branch = $2 AND report_origin = 'automatic_earthquake'
     LIMIT 1`,
    [earthquakeEventId, branch]
  );
  if (rows.length === 0) return null;
  return rowToIncident(rows[0]);
}

/**
 * Check if there is an active manual earthquake report for the branch.
 * Used to prevent auto-daemon from creating duplicates when a branch
 * has already manually reported an earthquake.
 */
export async function dbFindActiveManualEarthquakeReport(
  branch: string
): Promise<IncidentRecord | null> {
  const pool = getDbPool();
  const { rows } = await pool.query(
    `SELECT * FROM incidents
     WHERE branch = $1 
       AND disaster_type = 'earthquake' 
       AND report_origin = 'manual'
       AND status NOT IN ('resolved', 'archived')
     ORDER BY created_at DESC
     LIMIT 1`,
    [branch]
  );
  if (rows.length === 0) return null;
  return rowToIncident(rows[0]);
}

export async function dbLinkManualEarthquakeReport(
  reportId: string,
  earthquakeEventId: string,
  earthquakeSource: string,
  earthquakeProvenance: string,
  disasterMetadata?: IncidentRecord["disasterMetadata"]
): Promise<IncidentRecord | null> {
  const pool = getDbPool();
  const { rows } = await pool.query(
    `UPDATE incidents
     SET earthquake_event_id = $1,
         earthquake_source = $2,
         earthquake_provenance = $3,
         disaster_metadata = COALESCE(disaster_metadata, '{}'::jsonb) || $4::jsonb,
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [
      earthquakeEventId,
      earthquakeSource,
      earthquakeProvenance,
      JSON.stringify(disasterMetadata ?? {}),
      reportId,
    ]
  );
  if (rows.length === 0) return null;
  return rowToIncident(rows[0]);
}

/**
 * Links a fresh earthquake event to an already-created manual field report.
 * It never changes the manual report lifecycle, verification, photos, or progress.
 */
export async function dbCreateIncident(
  inc: IncidentRecord
): Promise<IncidentRecord> {
  const pool = getDbPool();
  try {
    const { rows } = await pool.query(
    `INSERT INTO incidents (
      id, date, disaster_type, report_origin,
      earthquake_event_id, earthquake_source, earthquake_provenance,
      tkp_type, store_id, store_name, branch, location_city,
      status, progress,
      disaster_metadata, affected_stores, affected_store_count, danger_store_count,
      verification, maintenance_ticket, field_photos,
      timeline, created_at, updated_at, closed_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
    ON CONFLICT (id) DO UPDATE SET
      status                   = EXCLUDED.status,
      progress                 = EXCLUDED.progress,
      disaster_metadata        = EXCLUDED.disaster_metadata,
      affected_stores          = EXCLUDED.affected_stores,
      affected_store_count     = EXCLUDED.affected_store_count,
      danger_store_count       = EXCLUDED.danger_store_count,
      verification             = EXCLUDED.verification,
      maintenance_ticket       = EXCLUDED.maintenance_ticket,
      field_photos             = EXCLUDED.field_photos,
      timeline                 = EXCLUDED.timeline,
      updated_at               = NOW()
    RETURNING *`,
    [
      inc.id,
      inc.date,
      inc.disasterType,
      inc.reportOrigin ?? "manual",
      inc.earthquakeEventId ?? null,
      inc.earthquakeSource ?? null,
      inc.earthquakeProvenance ?? null,
      inc.tkpType ?? null,
      inc.storeId,
      inc.storeName,
      inc.branch,
      inc.locationCity,
      inc.status,
      inc.progress,
      inc.disasterMetadata ? JSON.stringify(inc.disasterMetadata) : null,
      inc.affectedStores ? JSON.stringify(inc.affectedStores) : null,
      inc.affectedStoreCount ?? 0,
      inc.dangerStoreCount ?? 0,
      inc.verification ? JSON.stringify(inc.verification) : null,
      inc.maintenanceTicket ? JSON.stringify(inc.maintenanceTicket) : null,
      JSON.stringify(inc.fieldPhotos ?? []),
      JSON.stringify(inc.timeline),
      inc.createdAt,
      inc.updatedAt,
      inc.closedAt ?? null,
    ]
  );
  return rowToIncident(rows[0]);
} catch (error: unknown) {
  const pgError = error as { code?: string; constraint?: string };
  if (pgError.code === '23505' && pgError.constraint === 'idx_incidents_unique_auto_eq_branch') {
    console.warn(`[SPARTA SIAGA] Race condition avoided: Duplicate automatic report for event ${inc.earthquakeEventId} at branch ${inc.branch}. Returning existing record.`);
    // Fetch and return the existing record instead of failing
    const existing = await dbFindAutoEarthquakeReport(inc.earthquakeEventId!, inc.branch);
    if (existing) return existing;
  }
  throw error;
}
}

export async function dbUpdateIncident(
  id: string,
  patch: Partial<IncidentRecord>
): Promise<IncidentRecord | null> {
  const pool = getDbPool();
  const setClauses: string[] = [];
  const values: unknown[] = [];
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
    tkpType: "tkp_type",
    earthquakeEventId: "earthquake_event_id",
    earthquakeSource: "earthquake_source",
    earthquakeProvenance: "earthquake_provenance",
    affectedStoreCount: "affected_store_count",
    dangerStoreCount: "danger_store_count",
  };

  for (const [key, col] of Object.entries(scalarFieldMap)) {
    if (key in patch) {
      setClauses.push(`${col} = $${idx++}`);
      values.push((patch as Record<string, unknown>)[key]);
    }
  }

  const jsonbFieldMap: Record<string, string> = {
    disasterMetadata: "disaster_metadata",
    affectedStores: "affected_stores",
    verification: "verification",
    maintenanceTicket: "maintenance_ticket",
    fieldPhotos: "field_photos",
    timeline: "timeline",
  };

  for (const [key, col] of Object.entries(jsonbFieldMap)) {
    if (key in patch) {
      setClauses.push(`${col} = $${idx++}`);
      values.push(JSON.stringify((patch as Record<string, unknown>)[key]));
    }
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

// ============================================================
// Management Instructions DB operations
// ============================================================

export async function dbCreateInstruction(
  instruction: import("@/types/incident").ManagementInstruction
): Promise<void> {
  const pool = getDbPool();
  await pool.query(
    `INSERT INTO report_instructions (
      instruction_id, report_id, instruction_text,
      author_id, author_name, author_role,
      created_at, delivery_status, target_roles, delivery_channel, delivery_log
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      instruction.instruction_id,
      instruction.report_id,
      instruction.instruction_text,
      instruction.author_id,
      instruction.author_name,
      instruction.author_role,
      instruction.created_at,
      instruction.delivery_status,
      JSON.stringify(instruction.target_roles),
      instruction.delivery_channel,
      instruction.delivery_log ?? null,
    ]
  );
}

export async function dbGetInstructionsByReport(
  reportId: string
): Promise<import("@/types/incident").ManagementInstruction[]> {
  const pool = getDbPool();
  const { rows } = await pool.query(
    `SELECT * FROM report_instructions WHERE report_id = $1 ORDER BY created_at ASC`,
    [reportId]
  );
  return rows.map((row) => ({
    instruction_id: row.instruction_id as string,
    report_id: row.report_id as string,
    instruction_text: row.instruction_text as string,
    author_id: row.author_id as string,
    author_name: row.author_name as string,
    author_role: row.author_role as "gm_ho" | "sm_ho",
    created_at: row.created_at instanceof Date
      ? (row.created_at as Date).toISOString()
      : (row.created_at as string),
    delivery_status: row.delivery_status as ManagementInstruction["delivery_status"],
    target_roles: (row.target_roles as ManagementInstruction["target_roles"]) ?? [],
    delivery_channel: "wa" as const,
    delivery_log: (row.delivery_log as string) ?? undefined,
  }));
}
