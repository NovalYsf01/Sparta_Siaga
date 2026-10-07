import { createNotificationLogsHandler } from "../app/api/notifications/logs/route";
import { UserContext } from "../lib/report-permissions";
import { NotificationLog } from "../types/notification";
import { POST as acknowledgeNotification } from "../app/api/notifications/ack/route";
import { checkUserPermission } from "../lib/permission-service";

const logs: NotificationLog[] = [
  {
    id: "NOTIF-G001",
    disaster_id: "EQ-001",
    disaster_type: "earthquake",
    channel: "pwa_only",
    branch: "G001",
    recipient_role: "Duty Officer DC Cabang",
    recipient_contact: "duty.g001@example.test",
    title: "Gempa G001",
    message: "Monitoring cabang G001",
    affected_stores_count: 1,
    affected_stores_sample: [],
    ticket_number: "ESC-G001-001",
    status: "sent",
    sent_at: "2026-10-07T01:00:00.000Z",
  },
  {
    id: "NOTIF-G002",
    disaster_id: "EQ-002",
    disaster_type: "earthquake",
    channel: "pwa_only",
    branch: "G002",
    recipient_role: "Duty Officer DC Cabang",
    recipient_contact: "duty.g002@example.test",
    title: "Gempa G002",
    message: "Monitoring cabang G002",
    affected_stores_count: 1,
    affected_stores_sample: [],
    ticket_number: "ESC-G002-001",
    status: "sent",
    sent_at: "2026-10-07T01:00:00.000Z",
  },
];

const branchUser: UserContext = {
  id: "USR-G001",
  name: "User G001",
  role: "bms",
  systemRole: "USER",
  scope: "BRANCH",
  branch: "G001",
};

const hoUser: UserContext = {
  id: "USR-HO",
  name: "HO Monitor",
  role: "ho_admin",
  systemRole: "USER",
  scope: "HO",
  branch: null,
};

const systemAdmin: UserContext = {
  id: "USR-ADMIN",
  name: "System Admin",
  role: null,
  systemRole: "ADMIN",
  scope: null,
  branch: null,
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

function buildHandler(user: UserContext | null, notificationAuthorized = true) {
  return createNotificationLogsHandler({
    getSessionUser: async () => user,
    checkNotificationPermission: async () => ({
      authorized: notificationAuthorized,
      reason: notificationAuthorized ? undefined : "NOTIFICATION_VIEW denied",
    }),
    getNotificationLogs: async (limit, branch) => {
      const scoped = branch
        ? logs.filter((log) => log.branch === branch)
        : logs;
      return scoped.slice(0, limit);
    },
  });
}

async function responseJson(response: Response) {
  return (await response.json()) as {
    success?: boolean;
    count?: number;
    logs?: NotificationLog[];
    error?: string;
  };
}

async function run() {
  const branchHandler = buildHandler(branchUser);

  const ownBranchResponse = await branchHandler(
    new Request("http://localhost/api/notifications/logs?limit=100")
  );
  const ownBranchBody = await responseJson(ownBranchResponse);
  assert(
    ownBranchResponse.status === 200 &&
      ownBranchBody.logs?.length === 1 &&
      ownBranchBody.logs[0].branch === "G001",
    "N1",
    "Branch G001 hanya menerima notification G001"
  );

  const manipulatedResponse = await branchHandler(
    new Request("http://localhost/api/notifications/logs?limit=100&branch=G002")
  );
  const manipulatedBody = await responseJson(manipulatedResponse);
  assert(
    manipulatedResponse.status === 200 &&
      manipulatedBody.logs?.length === 1 &&
      manipulatedBody.logs[0].branch === "G001",
    "N2",
    "Manipulasi query branch G002 diabaikan untuk user G001"
  );

  const normalizedBranchResponse = await buildHandler({
    ...branchUser,
    branch: " g001 ",
  })(new Request("http://localhost/api/notifications/logs?limit=100"));
  const normalizedBranchBody = await responseJson(normalizedBranchResponse);
  assert(
    normalizedBranchResponse.status === 200 &&
      normalizedBranchBody.logs?.length === 1 &&
      normalizedBranchBody.logs[0].branch === "G001",
    "N3",
    "Branch session dinormalisasi agar konsisten dengan branch database"
  );

  const hoResponse = await buildHandler(hoUser)(
    new Request("http://localhost/api/notifications/logs?limit=100")
  );
  const hoBody = await responseJson(hoResponse);
  assert(
    hoResponse.status === 200 && hoBody.logs?.length === 2,
    "N4",
    "HO authorized dapat memonitor lintas cabang"
  );

  const hoNarrowedResponse = await buildHandler(hoUser)(
    new Request("http://localhost/api/notifications/logs?limit=100&branch=G002")
  );
  const hoNarrowedBody = await responseJson(hoNarrowedResponse);
  assert(
    hoNarrowedResponse.status === 200 &&
      hoNarrowedBody.logs?.length === 1 &&
      hoNarrowedBody.logs[0].branch === "G002",
    "N5",
    "HO authorized dapat mempersempit monitoring ke branch yang diminta"
  );

  const adminResponse = await buildHandler(systemAdmin)(
    new Request("http://localhost/api/notifications/logs?limit=100")
  );
  const adminBody = await responseJson(adminResponse);
  assert(
    adminResponse.status === 200 && adminBody.logs?.length === 2,
    "N6",
    "System Admin mengikuti monitoring architecture lintas cabang"
  );

  const unauthenticatedResponse = await buildHandler(null)(
    new Request("http://localhost/api/notifications/logs")
  );
  assert(
    unauthenticatedResponse.status === 401,
    "N7",
    "Request tanpa authenticated session ditolak 401"
  );

  const forbiddenResponse = await buildHandler(branchUser, false)(
    new Request("http://localhost/api/notifications/logs")
  );
  assert(
    forbiddenResponse.status === 403,
    "N8",
    "User tanpa NOTIFICATION_VIEW ditolak 403"
  );

  for (const [code, actorType] of [
    ["N9", "BRANCH"],
    ["N10", "HO"],
    ["N11", "SYSTEM_ADMIN"],
  ] as const) {
    const mutationResponse = await acknowledgeNotification();
    assert(
      mutationResponse.status === 403,
      code,
      `${actorType} tidak dapat memutasi notification acknowledgement`
    );
  }

  const actualAdminPermission = await checkUserPermission({
    user: systemAdmin,
    permission: "NOTIFICATION_VIEW",
  });
  assert(
    actualAdminPermission.authorized && actualAdminPermission.source === "SYSTEM_ADMIN",
    "N12",
    "Central permission resolver memberi System Admin monitoring-only NOTIFICATION_VIEW"
  );

  console.log(`NOTIFICATION ISOLATION SUMMARY: ${passed} / ${total} PASSED`);
  if (passed !== total) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
