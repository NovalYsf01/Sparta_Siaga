import { getDbPool } from "./db";

export async function claimIncidentPic(input: {
  incidentId: string;
  userId: string;
  branch: string | null;
  systemRole: string;
}): Promise<{ claimed: boolean; currentPicUserId: string | null }> {
  const client = await getDbPool().connect();
  try {
    await client.query("BEGIN");
    const values: unknown[] = [input.incidentId, input.userId];
    let branchClause = "";
    if (input.systemRole !== "ADMIN") {
      values.push(input.branch);
      branchClause = ` AND branch = $${values.length}`;
    }
    const result = await client.query<{ primary_pic_user_id: string }>(
      `UPDATE incidents
          SET primary_pic_user_id = $2, primary_pic_claimed_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND primary_pic_user_id IS NULL${branchClause}
        RETURNING primary_pic_user_id`,
      values
    );
    if (result.rows[0]) {
      await client.query(
        `INSERT INTO incident_pic_history
           (incident_id, action, to_user_id, actor_user_id)
         VALUES ($1, 'CLAIM', $2, $2)`,
        [input.incidentId, input.userId]
      );
      await client.query("COMMIT");
      return { claimed: true, currentPicUserId: input.userId };
    }
    const current = await client.query<{ primary_pic_user_id: string | null }>(
      `SELECT primary_pic_user_id FROM incidents WHERE id = $1${branchClause}`,
      input.systemRole === "ADMIN" ? [input.incidentId] : [input.incidentId, input.userId, input.branch]
    );
    await client.query("COMMIT");
    return { claimed: false, currentPicUserId: current.rows[0]?.primary_pic_user_id ?? null };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function changeIncidentPic(input: {
  incidentId: string;
  actorUserId: string;
  nextUserId: string | null;
  branch: string | null;
  systemRole: string;
  reason?: string;
}) {
  const client = await getDbPool().connect();
  try {
    await client.query("BEGIN");
    const values: unknown[] = [input.incidentId];
    let scope = "";
    if (input.systemRole !== "ADMIN") {
      values.push(input.branch);
      scope = ` AND branch = $${values.length}`;
    }
    const locked = await client.query<{ primary_pic_user_id: string | null; location_kind: string | null }>(
      `SELECT primary_pic_user_id, location_kind FROM incidents WHERE id = $1${scope} FOR UPDATE`, values
    );
    if (!locked.rows[0]) throw new Error("INCIDENT_NOT_FOUND");
    const previous = locked.rows[0].primary_pic_user_id;
    if (!previous && !input.nextUserId) throw new Error("PIC_NOT_ASSIGNED");
    if (input.nextUserId) {
      const requiredRole = locked.rows[0].location_kind === "FACILITY" ? "bes" : "bms";
      const eligible = await client.query(
        `SELECT id FROM users WHERE id = $1 AND status = 'ACTIVE'
          AND branch = (SELECT branch FROM incidents WHERE id = $2)
          AND business_role = $3`,
        [input.nextUserId, input.incidentId, requiredRole]
      );
      if (!eligible.rows[0]) throw new Error("TARGET_PIC_NOT_ELIGIBLE");
    }
    await client.query(
      `UPDATE incidents SET primary_pic_user_id = $2,
         primary_pic_claimed_at = CASE WHEN $2::text IS NULL THEN NULL ELSE NOW() END,
         updated_at = NOW() WHERE id = $1`,
      [input.incidentId, input.nextUserId]
    );
    const action = !previous ? "ASSIGN" : input.nextUserId ? "TRANSFER" : "RELEASE";
    await client.query(
      `INSERT INTO incident_pic_history
        (incident_id, action, from_user_id, to_user_id, actor_user_id, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [input.incidentId, action, previous,
        input.nextUserId, input.actorUserId, input.reason ?? null]
    );
    await client.query("COMMIT");
    return { previousPicUserId: previous, currentPicUserId: input.nextUserId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function getIncidentPicDetails(incidentId: string, branch?: string | null) {
  const values: unknown[] = [incidentId];
  let scope = "";
  if (branch !== undefined) { values.push(branch); scope = ` AND i.branch = $${values.length}`; }
  const incident = await getDbPool().query(
    `SELECT i.id, i.branch, i.location_kind, i.primary_pic_user_id, u.name AS primary_pic_name
       FROM incidents i LEFT JOIN users u ON u.id = i.primary_pic_user_id
      WHERE i.id = $1${scope}`, values
  );
  if (!incident.rows[0]) return null;
  const [history, eligible] = await Promise.all([
    getDbPool().query(
      `SELECT h.*, actor.name AS actor_name, previous.name AS from_user_name,
              target.name AS to_user_name
         FROM incident_pic_history h
         LEFT JOIN users actor ON actor.id = h.actor_user_id
         LEFT JOIN users previous ON previous.id = h.from_user_id
         LEFT JOIN users target ON target.id = h.to_user_id
        WHERE h.incident_id = $1 ORDER BY h.created_at DESC`, [incidentId]
    ),
    getDbPool().query(
      `SELECT id, name, business_role FROM users
        WHERE branch = $1 AND status = 'ACTIVE'
          AND business_role = CASE WHEN $2 = 'FACILITY' THEN 'bes' ELSE 'bms' END
        ORDER BY name`, [incident.rows[0].branch, incident.rows[0].location_kind]
    ),
  ]);
  return { ...incident.rows[0], history: history.rows, eligibleUsers: eligible.rows };
}
