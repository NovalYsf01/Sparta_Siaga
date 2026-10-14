import { getDbPool } from "./db";

export interface FacilityFilters {
  type?: string;
  branch?: string;
  mapping?: "mapped" | "unmapped";
  query?: string;
}

export async function listFacilities(filters: FacilityFilters = {}) {
  const values: unknown[] = [];
  const where: string[] = [];
  const add = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (filters.type) where.push(`facility_type = ${add(filters.type)}`);
  if (filters.branch) where.push(`branch_id = ${add(filters.branch)}`);
  if (filters.mapping === "mapped") where.push("branch_id IS NOT NULL AND mapping_verified_at IS NOT NULL");
  if (filters.mapping === "unmapped") where.push("(branch_id IS NULL OR mapping_verified_at IS NULL)");
  if (filters.query) {
    const placeholder = add(`%${filters.query}%`);
    where.push(`(code ILIKE ${placeholder} OR name ILIKE ${placeholder})`);
  }
  const { rows } = await getDbPool().query(
    `SELECT id, code, name, initials, facility_type, latitude, longitude,
            branch_id, mapping_verified_at, operational_status,
            auto_report_enabled, source_name, source_synced_at, created_at, updated_at
       FROM facilities
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY facility_type, code`,
    values
  );
  return rows;
}

export async function updateFacilityAdmin(input: {
  id: string;
  branchId?: string | null;
  latitude?: number;
  longitude?: number;
  operationalStatus?: "ACTIVE" | "INACTIVE";
  autoReportEnabled?: boolean;
  actorUserId: string;
}) {
  const client = await getDbPool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(`SELECT * FROM facilities WHERE id = $1 FOR UPDATE`, [input.id]);
    if (!current.rows[0]) throw new Error("FACILITY_NOT_FOUND");
    const nextBranch = input.branchId === undefined ? current.rows[0].branch_id : input.branchId;
    const nextMappingAt = input.branchId === undefined
      ? current.rows[0].mapping_verified_at
      : input.branchId
        ? new Date()
        : null;
    const nextAuto = input.autoReportEnabled ?? current.rows[0].auto_report_enabled;
    if (nextAuto && (!nextBranch || !nextMappingAt)) throw new Error("VERIFIED_MAPPING_REQUIRED");

    const result = await client.query(
      `UPDATE facilities SET
         branch_id = $2,
         mapping_verified_at = $3,
         mapping_verified_by = CASE WHEN $3::timestamptz IS NULL THEN NULL ELSE $4 END,
         latitude = COALESCE($5, latitude),
         longitude = COALESCE($6, longitude),
         operational_status = COALESCE($7, operational_status),
         auto_report_enabled = $8,
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [input.id, nextBranch, nextMappingAt, input.actorUserId, input.latitude ?? null,
        input.longitude ?? null, input.operationalStatus ?? null, nextAuto]
    );
    await client.query(
      `INSERT INTO facility_audit_logs (facility_id, action, changed_fields, actor_user_id)
       VALUES ($1, 'ADMIN_UPDATE', $2::jsonb, $3)`,
      [input.id, JSON.stringify(input), input.actorUserId]
    );
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listSharedQueue(user: {
  systemRole: string;
  scope: string | null;
  role: string | null;
  branch: string | null;
}) {
  const values: unknown[] = [];
  const where = ["closed_at IS NULL", "status NOT IN ('closed', 'resolved', 'archived')"];
  if (user.systemRole !== "ADMIN" && user.scope !== "HO") {
    values.push(user.branch);
    where.push(`branch = $${values.length}`);
  }
  if (user.role === "bms") where.push("COALESCE(location_kind, 'STORE') = 'STORE'");
  if (user.role === "bes") where.push("location_kind = 'FACILITY'");
  const { rows } = await getDbPool().query(
    `SELECT id, canonical_event_id, location_kind, location_id,
            COALESCE(location_name_snapshot, store_name) AS location_name,
            COALESCE(branch_snapshot, branch) AS branch,
            status, progress, primary_pic_user_id, primary_pic_claimed_at, created_at,
            EXTRACT(EPOCH FROM (NOW() - created_at))::bigint AS waiting_seconds
       FROM incidents WHERE ${where.join(" AND ")}
      ORDER BY created_at ASC`,
    values
  );
  return rows;
}
