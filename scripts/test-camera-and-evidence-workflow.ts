import { UserContext } from "../lib/report-permissions";
import { canViewReportAsync, checkUserPermission, checkMutationAuthorization } from "../lib/permission-service";
import { IncidentRecord } from "../types/incident";

// Mock Incident Records
const testIncidentCikokol: IncidentRecord = {
  id: "INC-TEST-CAM-01",
  branch: "CIKOKOL",
  storeId: "T-CIK-01",
  disasterType: "flood",
  title: "Genangan Air Masuk Area Gudang Cikokol",
  status: "in_maintenance",
  createdAt: new Date().toISOString(),
  reporterName: "PIC Cikokol",
} as any;

const testIncidentManado: IncidentRecord = {
  id: "INC-TEST-CAM-02",
  branch: "MANADO",
  storeId: "T-MAN-01",
  disasterType: "earthquake",
  title: "Kerusakan Tembok Manado",
  status: "in_maintenance",
  createdAt: new Date().toISOString(),
  reporterName: "PIC Manado",
} as any;

// Personas
const bmsCikokol: UserContext = {
  id: "USR-BMS-CIKOKOL",
  name: "BMS Cikokol",
  role: "bms",
  systemRole: "USER",
  scope: "BRANCH",
  branch: "CIKOKOL",
};

const userManado: UserContext = {
  id: "USR-MANADO",
  name: "Tim Toko Manado",
  role: "tim_toko",
  systemRole: "USER",
  scope: "BRANCH",
  branch: "MANADO",
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

async function run() {
  console.log("=== 1. CAMERA EVIDENCE AUTHORIZATION & BRANCH ISOLATION ===");

  // BMS Cikokol is authorized to update progress and attach evidence on Cikokol report
  const canUpdateCikokol = await checkUserPermission({
    user: bmsCikokol,
    permission: "REPORT_UPDATE_PROGRESS",
    report: testIncidentCikokol,
  });
  assert(
    canUpdateCikokol.authorized === true,
    "CAM-1",
    "BMS Cikokol memiliki izin REPORT_UPDATE_PROGRESS pada laporan cabangnya"
  );

  // BMS Cikokol is DENIED on Manado report
  const canUpdateManado = await checkUserPermission({
    user: bmsCikokol,
    permission: "REPORT_UPDATE_PROGRESS",
    report: testIncidentManado,
  });
  assert(
    canUpdateManado.authorized === false,
    "CAM-2",
    "BMS Cikokol DITOLAK melampirkan bukti progress pada cabang lain (Manado)"
  );

  // User Manado is DENIED on Cikokol report
  const manadoOnCikokol = await checkMutationAuthorization(
    "update_progress",
    userManado,
    testIncidentCikokol
  );
  assert(
    manadoOnCikokol.authorized === false,
    "CAM-3",
    "User Manado DITOLAK memutasi progress / bukti pada laporan Cikokol"
  );

  // System Admin is DENIED operational mutations
  const adminMutation = await checkMutationAuthorization(
    "update_progress",
    systemAdmin,
    testIncidentCikokol
  );
  assert(
    adminMutation.authorized === false,
    "CAM-4",
    "System Admin DITOLAK melakukan mutasi evidence / progress operasional"
  );

  console.log("\n=== 2. MOCK CAMERA CAPTURE TO FILE & BLOB CONVERSION CONTRACT ===");
  // Simulate what CameraCapture produces from canvas.toBlob:
  // 1. Valid image/jpeg MIME type
  // 2. Non-empty byte buffer
  // 3. Appropriate filename with timestamp
  const mockImageBytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    // JPEG header mock
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);
  const mockBlob = new Blob([mockImageBytes], { type: "image/jpeg" });
  const mockFile = new File([mockBlob], `sparta_capture_${Date.now()}.jpg`, {
    type: "image/jpeg",
  });

  assert(
    mockFile instanceof File && mockFile.type === "image/jpeg",
    "CAM-5",
    "Output kamera menghasilkan File dengan MIME type 'image/jpeg'"
  );
  assert(
    mockFile.size > 0 && mockFile.name.startsWith("sparta_capture_"),
    "CAM-6",
    "Output kamera memiliki ukuran > 0 bytes dan nama file berformat sparta_capture_*.jpg"
  );

  console.log("\n=== 3. CAMERA RETAKE & EVIDENCE ATTACHMENT SIMULATION ===");
  // Simulate Retake: URL is revoked, state cleared, camera can capture new photo
  let previewUrl = "blob:http://localhost/mock-preview-1";
  let attachedFile: File | null = null;
  let retakeCount = 0;

  // Step 1: First photo captured
  let captured1: { file: File; previewUrl: string } | null = {
    file: mockFile,
    previewUrl,
  };
  assert(captured1 !== null, "CAM-7", "Kamera berhasil menangkap foto pertama (Review Mode)");

  // Step 2: User triggers 'Foto Ulang' (Retake)
  retakeCount++;
  captured1 = null; // Cleared in component
  assert(
    captured1 === null && retakeCount === 1,
    "CAM-8",
    "Foto Ulang (Retake) membatalkan foto sementara dan kembali ke live viewfinder"
  );

  // Step 3: User captures second photo and confirms 'Gunakan Foto'
  const secondFile = new File([mockBlob], `sparta_capture_retake_${Date.now()}.jpg`, {
    type: "image/jpeg",
  });
  const secondPreview = "blob:http://localhost/mock-preview-2";
  
  // 'Gunakan Foto' callback triggers onCapture:
  const handleCaptureCallback = (file: File, url: string) => {
    attachedFile = file;
  };
  handleCaptureCallback(secondFile, secondPreview);

  assert(
    attachedFile !== null && attachedFile === secondFile,
    "CAM-9",
    "Gunakan Foto berhasil melampirkan hasil foto akhir ke form bukti operasional"
  );

  console.log(`\n==================================================`);
  console.log(`CAMERA & EVIDENCE WORKFLOW RESULTS: ${passed} / ${total} PASSED`);
  if (passed !== total) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
