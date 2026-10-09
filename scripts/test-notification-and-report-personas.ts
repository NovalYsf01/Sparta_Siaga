import { createNotificationLogsHandler } from "../app/api/notifications/logs/route";
import { UserContext, canViewReport } from "../lib/report-permissions";
import { canViewReportAsync, checkMutationAuthorization } from "../lib/permission-service";
import { NotificationLog } from "../types/notification";
import { IncidentRecord } from "../types/incident";

// Sample notification logs representing disaster events in different branches
const sampleNotificationLogs: NotificationLog[] = [
  {
    id: "NOTIF-CIKOKOL-01",
    disaster_id: "EQ-BMKG-001",
    disaster_type: "earthquake",
    channel: "email_and_pwa",
    branch: "CIKOKOL",
    recipient_role: "Duty Officer DC Cabang",
    recipient_contact: "dc.cikokol@alfamart.co.id",
    title: "Gempa M5.2 Banten - Cabang Cikokol",
    message: "Gempa terdeteksi BMKG berdampak pada area Cikokol",
    affected_stores_count: 3,
    affected_stores_sample: [],
    ticket_number: "ESC-CIK-1001",
    status: "sent",
    sent_at: "2026-10-08T01:00:00.000Z",
  },
  {
    id: "NOTIF-MANADO-01",
    disaster_id: "EQ-BMKG-002",
    disaster_type: "earthquake",
    channel: "email_and_pwa",
    branch: "MANADO",
    recipient_role: "Duty Officer DC Cabang",
    recipient_contact: "dc.manado@alfamart.co.id",
    title: "Gempa M6.0 Minahasa - Cabang Manado",
    message: "Gempa terdeteksi BMKG berdampak pada area Manado",
    affected_stores_count: 5,
    affected_stores_sample: [],
    ticket_number: "ESC-MAN-2001",
    status: "sent",
    sent_at: "2026-10-08T02:00:00.000Z",
  },
];

// Sample operational incidents
const incidentCikokol: IncidentRecord = {
  id: "INC-CIK-001",
  branch: "CIKOKOL",
  storeId: "T-CIK-01",
  disasterType: "earthquake",
  title: "Kerusakan Rak Gempa Toko Cikokol",
  status: "submitted",
  createdAt: "2026-10-08T01:10:00.000Z",
  reporterName: "Staff Cikokol",
} as any;

const incidentManado: IncidentRecord = {
  id: "INC-MAN-001",
  branch: "MANADO",
  storeId: "T-MAN-01",
  disasterType: "earthquake",
  title: "Plafon Runtuh Gempa Toko Manado",
  status: "submitted",
  createdAt: "2026-10-08T02:10:00.000Z",
  reporterName: "Staff Manado",
} as any;

// 7 Representative Personas
const personas: Record<string, UserContext> = {
  hoAdmin: {
    id: "USR-HO-ADMIN",
    name: "HO Administrator",
    role: "ho_admin",
    systemRole: "USER",
    scope: "HO",
    branch: null,
  },
  gmHo: {
    id: "USR-GM-HO",
    name: "General Manager HO",
    role: "gm_ho",
    systemRole: "USER",
    scope: "HO",
    branch: null,
  },
  mgrBranchCikokol: {
    id: "USR-MGR-CIKOKOL",
    name: "Branch Manager Cikokol",
    role: "bm",
    systemRole: "USER",
    scope: "BRANCH",
    branch: "CIKOKOL",
  },
  timTokoCikokol: {
    id: "USR-TOKO-CIKOKOL",
    name: "Tim Toko Cikokol",
    role: "tim_toko",
    systemRole: "USER",
    scope: "BRANCH",
    branch: "CIKOKOL",
  },
  bmsCikokol: {
    id: "USR-BMS-CIKOKOL",
    name: "BMS Cikokol",
    role: "bms",
    systemRole: "USER",
    scope: "BRANCH",
    branch: "CIKOKOL",
  },
  branchUserManado: {
    id: "USR-MANADO",
    name: "Branch User Manado",
    role: "tim_toko",
    systemRole: "USER",
    scope: "BRANCH",
    branch: "MANADO",
  },
  systemAdmin: {
    id: "USR-SYSADMIN",
    name: "System Administrator",
    role: null,
    systemRole: "ADMIN",
    scope: null,
    branch: null,
  },
};

let passed = 0;
let total = 0;

function assert(condition: boolean, code: string, description: string) {
  total++;
  if (!condition) {
    console.error(`[FAIL] ${code}: ${description}`);
    process.exitCode = 1;
    return;
  }
  passed++;
  console.log(`[PASS] ${code}: ${description}`);
}

function buildHandler(user: UserContext) {
  return createNotificationLogsHandler({
    getSessionUser: async () => user,
    checkNotificationPermission: async () => ({ authorized: true }),
    getNotificationLogs: async (limit, branch) => {
      const scoped = branch
        ? sampleNotificationLogs.filter((l) => l.branch === branch)
        : sampleNotificationLogs;
      return scoped.slice(0, limit);
    },
  });
}

async function run() {
  console.log("=== 1. GLOBAL DISASTER NOTIFICATION VISIBILITY ACROSS PERSONAS ===");
  for (const [key, user] of Object.entries(personas)) {
    const handler = buildHandler(user);
    const res = await handler(new Request("http://localhost/api/notifications/logs?limit=50"));
    const body = await res.json();
    assert(
      res.status === 200 && body.logs?.length === 2,
      `P1-${key}`,
      `Persona ${user.name} (${user.role || user.systemRole}) dapat melihat seluruh informasi bencana global (${body.logs?.length} logs)`
    );
  }

  console.log("\n=== 2. BRANCH ISOLATION FOR OPERATIONAL INCIDENT REPORTS ===");
  // Cikokol users can view Cikokol report, but CANNOT view Manado report
  for (const personaKey of ["mgrBranchCikokol", "timTokoCikokol", "bmsCikokol"] as const) {
    const user = personas[personaKey];
    
    // Client-side check
    const clientCanViewCikokol = canViewReport(user, incidentCikokol);
    const clientCanViewManado = canViewReport(user, incidentManado);
    assert(clientCanViewCikokol === true, `P2-${personaKey}-own`, `${user.name} dapat melihat laporan insiden Cikokol`);
    assert(clientCanViewManado === false, `P2-${personaKey}-other`, `${user.name} DITOLAK melihat laporan insiden Manado`);

    // Server-side check
    const serverCanViewCikokol = await canViewReportAsync(user, incidentCikokol);
    const serverCanViewManado = await canViewReportAsync(user, incidentManado);
    assert(serverCanViewCikokol === true, `P2-${personaKey}-srv-own`, `[Server] ${user.name} dapat melihat laporan Cikokol`);
    assert(serverCanViewManado === false, `P2-${personaKey}-srv-other`, `[Server] ${user.name} DITOLAK melihat laporan Manado`);
  }

  // Manado user can view Manado report, but CANNOT view Cikokol report
  const manadoUser = personas.branchUserManado;
  assert(canViewReport(manadoUser, incidentManado) === true, "P3-manado-own", "User Manado dapat melihat laporan insiden Manado");
  assert(canViewReport(manadoUser, incidentCikokol) === false, "P3-manado-other", "User Manado DITOLAK melihat laporan insiden Cikokol");
  assert(await canViewReportAsync(manadoUser, incidentManado) === true, "P3-manado-srv-own", "[Server] User Manado dapat melihat laporan Manado");
  assert(await canViewReportAsync(manadoUser, incidentCikokol) === false, "P3-manado-srv-other", "[Server] User Manado DITOLAK melihat laporan Cikokol");

  // Head Office (HO) monitoring visibility across all branches
  for (const hoKey of ["hoAdmin", "gmHo"] as const) {
    const user = personas[hoKey];
    assert(canViewReport(user, incidentCikokol) === true, `P4-${hoKey}-cikokol`, `${user.name} dapat memonitor laporan Cikokol`);
    assert(canViewReport(user, incidentManado) === true, `P4-${hoKey}-manado`, `${user.name} dapat memonitor laporan Manado`);
    assert(await canViewReportAsync(user, incidentCikokol) === true, `P4-${hoKey}-srv-cikokol`, `[Server] ${user.name} dapat memonitor laporan Cikokol`);
    assert(await canViewReportAsync(user, incidentManado) === true, `P4-${hoKey}-srv-manado`, `[Server] ${user.name} dapat memonitor laporan Manado`);
  }

  // System Admin can view for monitoring, but cannot execute operational mutations
  const adminUser = personas.systemAdmin;
  assert(canViewReport(adminUser, incidentCikokol) === true, "P5-admin-view-cik", "System Admin dapat melihat laporan Cikokol (monitoring)");
  assert(canViewReport(adminUser, incidentManado) === true, "P5-admin-view-man", "System Admin dapat melihat laporan Manado (monitoring)");
  
  // Test mutation authorization for System Admin (MUST BE DENIED)
  const adminMutation = await checkMutationAuthorization(
    "update_progress",
    adminUser,
    incidentCikokol
  );
  assert(adminMutation.authorized === false, "P5-admin-mutation-denied", "System Admin DITOLAK melakukan mutasi status operasional insiden");

  // Cross-branch mutation denial (Manado trying to mutate Cikokol)
  const crossBranchMutation = await checkMutationAuthorization(
    "update_progress",
    manadoUser,
    incidentCikokol
  );
  assert(crossBranchMutation.authorized === false, "P6-cross-branch-denied", "User Manado DITOLAK melakukan mutasi status insiden Cabang Cikokol");

  console.log(`\n==================================================`);
  console.log(`PERSONA TEST RESULTS: ${passed} / ${total} PASSED`);
  if (passed !== total) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
