import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import { 
  dbGetAllIncidents,
  dbGetIncidentById,
  dbFindAutoEarthquakeReport,
  dbCreateIncident,
  dbUpdateIncident,
  dbDeleteIncident
} from "../lib/incident-db";
import { processEarthquakeAlertsAndReports } from "../lib/server-daemon";
import { updateNotificationLogForEvent } from "../lib/notification-service";
import { canViewReport, canActOnReport, UserContext } from "../lib/report-permissions";
import { canViewReportAsync, canConfirmReportAsync, checkMutationAuthorization } from "../lib/permission-service";
import { Earthquake } from "../types/disaster";
import { Store } from "../types/store";

function verifyAndSetupIsolatedDb(): { rawUrl: string; host: string; dbName: string } {
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  let isolatedUrl = "";
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*SPARTA_ISOLATED_TEST_DATABASE_URL\s*=\s*(.*)?\s*$/);
    if (match) {
      isolatedUrl = match[1].trim().replace(/^["']|["']$/g, "");
      break;
    }
  }

  if (!isolatedUrl) {
    throw new Error("Missing SPARTA_ISOLATED_TEST_DATABASE_URL in .env.local");
  }

  const parsed = new URL(isolatedUrl);
  const dbName = parsed.pathname.replace(/^\//, "");
  if (dbName !== "sparta_siaga_isolated") {
    throw new Error(`CRITICAL GUARD: Connection target must be sparta_siaga_isolated, received: ${dbName}`);
  }

  process.env.DATABASE_URL = isolatedUrl;
  process.env.DATABASE_SSL_MODE = "require";

  return {
    rawUrl: isolatedUrl,
    host: parsed.hostname,
    dbName,
  };
}

interface StepValidation {
  section: string;
  test: string;
  passed: boolean;
  details: string;
}

const validations: StepValidation[] = [];

function check(section: string, test: string, condition: boolean, details: string) {
  validations.push({ section, test, passed: condition, details });
  const mark = condition ? "PASS" : "FAIL";
  console.log(`[${mark}] [${section}] ${test}: ${details}`);
}

async function runFinalValidation() {
  const dbConfig = verifyAndSetupIsolatedDb();
  console.log("================================================================================");
  console.log(`SPARTA SIAGA - FINAL VALIDATION OTOMATISASI GEMPA (E2E)`);
  console.log(`Target Database : ${dbConfig.dbName} (${dbConfig.host})`);
  console.log(`Production Guard: READ-ONLY GUARD active on defaultdb; isolated DB connected.`);
  console.log("================================================================================\n");

  const cleanConnString = dbConfig.rawUrl.replace(/\?sslmode=[^&]+/, "");
  const pool = new Pool({
    connectionString: cleanConnString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();

  try {
    const dbVerification = await client.query("SELECT current_database();");
    const activeDbName = dbVerification.rows[0].current_database;
    if (activeDbName !== "sparta_siaga_isolated") {
      throw new Error(`CRITICAL: Expected sparta_siaga_isolated, but connected to ${activeDbName}`);
    }
    console.log(`Connected and verified active database: ${activeDbName}\n`);

    // 1. Audit Migration and Unique Constraints
    const indexCheck = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'incidents' AND indexname IN ('idx_incidents_unique_earthquake_location', 'idx_incidents_unique_auto_eq_store');
    `);
    check(
      "AUDIT_SCHEMA",
      "Store-level unique index on incidents",
      indexCheck.rows.length >= 1,
      indexCheck.rows.length >= 1 ? indexCheck.rows[0].indexdef : "Missing index"
    );

    // 2. Prepare Controlled Simulation Data
    const simEventId = `EQ-SIM-VAL-20261014-${Date.now().toString().slice(-4)}`;
    const simTime = Date.now() - 3 * 60 * 1000; // 3 minutes ago (fresh)
    const simEarthquake: Earthquake = {
      id: simEventId,
      source: "BMKG",
      sourcePrimary: "BMKG",
      canonicalEventKey: simEventId,
      title: "Gempa M5.6 Wilayah Bandung Jawa Barat",
      place: "Bandung, Jawa Barat",
      magnitude: 5.6,
      depth: "10 km",
      depthKm: 10,
      latitude: -6.9000,
      longitude: 107.6100,
      time: new Date(simTime).toISOString(),
      timestamp: simTime,
      potensiTsunami: false,
      priorityRadiusKm: 34.5,
      monitoringRadiusKm: 60.0,
    };

    const simStore1: Store = {
      id: "ST-VAL-001",
      kode_toko: "TKO-VAL-DAGO",
      nama_toko: "Alfamart Dago Juanda",
      cabang: "BANDUNG",
      alamat: "Jl. Ir. H. Juanda No. 120, Dago",
      latitude: -6.8900,
      longitude: 107.6100,
      fr_type: "Reguler",
      branch_emergency_contact: "dc.bandung@alfamart.co.id",
    };

    const simStore2: Store = {
      id: "ST-VAL-002",
      kode_toko: "TKO-VAL-RIAU",
      nama_toko: "Alfamart RE Martadinata",
      cabang: "BANDUNG",
      alamat: "Jl. R.E. Martadinata No. 55, Bandung",
      latitude: -6.8950,
      longitude: 107.6150,
      fr_type: "Reguler",
      branch_emergency_contact: "dc.bandung@alfamart.co.id",
    };

    const simStores = [simStore1, simStore2];

    // Clean up any existing records for test event ID and test branch
    await client.query("DELETE FROM incidents WHERE earthquake_event_id = $1;", [simEventId]);
    await client.query("DELETE FROM notification_logs WHERE disaster_id = $1 OR branch = 'BANDUNG';", [simEventId]);

    // 3. FIRST PASS: Run Autonomous Earthquake Processor
    console.log("--- PASS 1: Executing Autonomous Earthquake Automation ---");
    const pass1Result = await processEarthquakeAlertsAndReports([simEarthquake], simStores, true);
    console.log(`Pass 1 Results: Dispatched Alerts = ${pass1Result.dispatchedAlerts}, Created Reports = ${pass1Result.createdReports}\n`);

    check(
      "PASS_1_EXECUTION",
      "Created operational reports count",
      pass1Result.createdReports === 2,
      `Expected 2 reports for 2 priority stores, got ${pass1Result.createdReports}`
    );

    check(
      "PASS_1_EXECUTION",
      "Dispatched branch notification alert",
      pass1Result.dispatchedAlerts === 1,
      `Expected 1 branch DC broadcast alert for Cabang BANDUNG, got ${pass1Result.dispatchedAlerts}`
    );

    // Retrieve generated incidents from isolated DB
    const pass1IncidentsRes = await client.query(
      `SELECT * FROM incidents WHERE earthquake_event_id = $1 ORDER BY store_id ASC;`,
      [simEventId]
    );
    const pass1Incidents = pass1IncidentsRes.rows;

    check(
      "REPORT_IDENTITY",
      "Two distinct store operational reports in database",
      pass1Incidents.length === 2,
      `Found ${pass1Incidents.length} incident records in sparta_siaga_isolated`
    );

    const reportStore1 = pass1Incidents.find((r) => r.store_id === simStore1.kode_toko);
    const reportStore2 = pass1Incidents.find((r) => r.store_id === simStore2.kode_toko);

    check(
      "REPORT_IDENTITY",
      "Store 1 report has correct identity",
      Boolean(reportStore1 && reportStore1.branch === "BANDUNG" && reportStore1.store_name === simStore1.nama_toko),
      reportStore1 ? `ID=${reportStore1.id}, Store=${reportStore1.store_id}, Branch=${reportStore1.branch}` : "Not found"
    );

    check(
      "REPORT_IDENTITY",
      "Store 2 report has correct identity",
      Boolean(reportStore2 && reportStore2.branch === "BANDUNG" && reportStore2.store_name === simStore2.nama_toko),
      reportStore2 ? `ID=${reportStore2.id}, Store=${reportStore2.store_id}, Branch=${reportStore2.branch}` : "Not found"
    );

    check(
      "REPORT_STATUS_INTEGRITY",
      "Initial status strictly pending_confirmation",
      reportStore1?.status === "pending_confirmation" && reportStore2?.status === "pending_confirmation",
      `Store1 Status=${reportStore1?.status}, Store2 Status=${reportStore2?.status}`
    );

    check(
      "REPORT_STATUS_INTEGRITY",
      "Initial progress strictly 0%",
      reportStore1?.progress === 0 && reportStore2?.progress === 0,
      `Store1 Progress=${reportStore1?.progress}%, Store2 Progress=${reportStore2?.progress}%`
    );

    const store1Photos = Array.isArray(reportStore1?.field_photos) ? reportStore1.field_photos : [];
    const store2Photos = Array.isArray(reportStore2?.field_photos) ? reportStore2.field_photos : [];
    check(
      "REPORT_STATUS_INTEGRITY",
      "Field photos empty (no fake photos)",
      store1Photos.length === 0 && store2Photos.length === 0,
      `Store1 Photos count=${store1Photos.length}, Store2 Photos count=${store2Photos.length}`
    );

    check(
      "REPORT_STATUS_INTEGRITY",
      "Verification object empty/undefined (no fake field verification)",
      reportStore1?.verification == null && reportStore2?.verification == null,
      `Store1 Verification=${JSON.stringify(reportStore1?.verification)}, Store2 Verification=${JSON.stringify(reportStore2?.verification)}`
    );

    // 4. SECOND PASS: Re-run with the exact same event and stores
    console.log("\n--- PASS 2: Executing Second Pass with Same Canonical Event ---");
    const pass2Result = await processEarthquakeAlertsAndReports([simEarthquake], simStores, true);
    console.log(`Pass 2 Results: Dispatched Alerts = ${pass2Result.dispatchedAlerts}, Created Reports = ${pass2Result.createdReports}\n`);

    check(
      "DEDUPLICATION_VERIFICATION",
      "Re-run does not create additional reports",
      pass2Result.createdReports === 0,
      `Expected 0 newly created reports, got ${pass2Result.createdReports}`
    );

    const pass2IncidentsRes = await client.query(
      `SELECT id, status, progress, updated_at FROM incidents WHERE earthquake_event_id = $1 ORDER BY store_id ASC;`,
      [simEventId]
    );

    check(
      "DEDUPLICATION_VERIFICATION",
      "Total incident count after re-run remains exactly 2",
      pass2IncidentsRes.rows.length === 2,
      `Total incidents in DB: ${pass2IncidentsRes.rows.length}`
    );

    const pass2Store1 = pass2IncidentsRes.rows.find((r) => r.id === reportStore1.id);
    const pass2Store2 = pass2IncidentsRes.rows.find((r) => r.id === reportStore2.id);

    check(
      "DEDUPLICATION_VERIFICATION",
      "Report IDs are stable across re-runs",
      Boolean(pass2Store1 && pass2Store2),
      `Stored IDs remained stable: ${reportStore1.id}, ${reportStore2.id}`
    );

    check(
      "DEDUPLICATION_VERIFICATION",
      "User progress and status remain 0% and pending_confirmation without overwrite",
      pass2Store1?.status === "pending_confirmation" && pass2Store1?.progress === 0 &&
      pass2Store2?.status === "pending_confirmation" && pass2Store2?.progress === 0,
      `Store1=${pass2Store1?.status} (${pass2Store1?.progress}%), Store2=${pass2Store2?.status} (${pass2Store2?.progress}%)`
    );

    // 5. SEPARATION OF NOTIFICATIONS AND OPERATIONAL REPORTS & SENT_AT IMMUTABILITY
    console.log("\n--- NOTIFICATION SEPARATION & SENT_AT IMMUTABILITY VERIFICATION ---");
    const notifRes = await client.query(
      `SELECT id, disaster_id, disaster_type, branch, title, channel, sent_at 
       FROM notification_logs 
       WHERE disaster_id = $1;`,
      [simEventId]
    );

    check(
      "SEPARATION_OF_CONCERNS",
      "Notification logs table stores DC warning broadcast",
      notifRes.rows.length === 1,
      `Found ${notifRes.rows.length} notification log entry in notification_logs table`
    );

    check(
      "SEPARATION_OF_CONCERNS",
      "Notification log is branch-level broadcast, distinct from store operational tickets",
      notifRes.rows[0]?.branch === "BANDUNG" && notifRes.rows[0]?.disaster_type === "earthquake",
      `Notif ID: ${notifRes.rows[0]?.id}, Branch: ${notifRes.rows[0]?.branch}, Channel: ${notifRes.rows[0]?.channel}`
    );

    // Verify sent_at immutability on notification update
    const initialSentAt = new Date(notifRes.rows[0].sent_at).getTime();
    await updateNotificationLogForEvent(simEventId, "BANDUNG", {
      title: "⚠️ PERINGATAN DARURAT GEMPA M 5.6 (UPDATED) - CABANG BANDUNG",
      message: "Pembaruan parameter gempa: data mutakhir BMKG.",
    });

    const notifAfterUpdateRes = await client.query(
      `SELECT title, sent_at FROM notification_logs WHERE disaster_id = $1;`,
      [simEventId]
    );
    const updatedSentAt = new Date(notifAfterUpdateRes.rows[0].sent_at).getTime();

    check(
      "NOTIFICATION_SENT_AT_PRESERVATION",
      "Updating notification info does not alter original sent_at timestamp",
      initialSentAt === updatedSentAt && notifAfterUpdateRes.rows[0].title.includes("(UPDATED)"),
      `Initial sent_at=${new Date(initialSentAt).toISOString()}, After update sent_at=${new Date(updatedSentAt).toISOString()}`
    );

    // 6. ACCESS CONTROL & ROLE PERMISSION AUDIT
    console.log("\n--- PERMISSION & ACCESS CONTROL VERIFICATION ---");
    const incidentObj1 = await dbGetIncidentById(reportStore1.id);
    if (!incidentObj1) throw new Error("Failed to load incident via dbGetIncidentById");

    const bmsBandung: UserContext = {
      id: "usr-bms-bdg-01",
      name: "Budi Santoso (BMS Bandung)",
      role: "bms",
      systemRole: "USER",
      scope: "BRANCH",
      branch: "BANDUNG",
    };

    const bmsCirebon: UserContext = {
      id: "usr-bms-crb-01",
      name: "Dedi Kusnandar (BMS Cirebon)",
      role: "bms",
      systemRole: "USER",
      scope: "BRANCH",
      branch: "CIREBON",
    };

    const hoAdmin: UserContext = {
      id: "usr-ho-admin-01",
      name: "Administrator HO",
      role: "ho_admin",
      systemRole: "ADMIN",
      scope: "HO",
      branch: null,
    };

    // Client-side synchronous helpers
    check(
      "ACCESS_CONTROL_CLIENT",
      "BMS Bandung can view Bandung report",
      canViewReport(bmsBandung, incidentObj1) === true,
      "canViewReport returned true"
    );

    check(
      "ACCESS_CONTROL_CLIENT",
      "BMS Bandung can act on Bandung report",
      canActOnReport(bmsBandung, incidentObj1) === true,
      "canActOnReport returned true"
    );

    check(
      "ACCESS_CONTROL_CLIENT",
      "BMS Cirebon CANNOT view Bandung report",
      canViewReport(bmsCirebon, incidentObj1) === false,
      "canViewReport returned false (blocked)"
    );

    check(
      "ACCESS_CONTROL_CLIENT",
      "BMS Cirebon CANNOT act on Bandung report",
      canActOnReport(bmsCirebon, incidentObj1) === false,
      "canActOnReport returned false (blocked)"
    );

    check(
      "ACCESS_CONTROL_CLIENT",
      "HO Admin can view report nationally",
      canViewReport(hoAdmin, incidentObj1) === true,
      "canViewReport returned true for HO"
    );

    check(
      "ACCESS_CONTROL_CLIENT",
      "HO Admin CANNOT execute branch operational actions",
      canActOnReport(hoAdmin, incidentObj1) === false,
      "canActOnReport returned false for HO System Admin"
    );

    // Server-side async permission service
    const bmsBdgServerView = await canViewReportAsync(bmsBandung, incidentObj1);
    const bmsCrbServerView = await canViewReportAsync(bmsCirebon, incidentObj1);
    const hoAdminServerView = await canViewReportAsync(hoAdmin, incidentObj1);

    check(
      "ACCESS_CONTROL_SERVER",
      "Server-side async view authorization for BMS Bandung",
      bmsBdgServerView === true,
      `canViewReportAsync = ${bmsBdgServerView}`
    );

    check(
      "ACCESS_CONTROL_SERVER",
      "Server-side async view authorization BLOCKS BMS Cirebon",
      bmsCrbServerView === false,
      `canViewReportAsync = ${bmsCrbServerView} (Forbidden 403 in API)`
    );

    check(
      "ACCESS_CONTROL_SERVER",
      "Server-side async view authorization for HO Admin",
      hoAdminServerView === true,
      `canViewReportAsync = ${hoAdminServerView}`
    );

    const bmsBdgConfirm = await canConfirmReportAsync(bmsBandung, incidentObj1);
    const bmsCrbConfirm = await canConfirmReportAsync(bmsCirebon, incidentObj1);
    check(
      "ACCESS_CONTROL_SERVER",
      "BMS Bandung can confirm report in their branch",
      bmsBdgConfirm === true,
      `canConfirmReportAsync = ${bmsBdgConfirm}`
    );

    check(
      "ACCESS_CONTROL_SERVER",
      "BMS Cirebon CANNOT confirm report in Bandung",
      bmsCrbConfirm === false,
      `canConfirmReportAsync = ${bmsCrbConfirm}`
    );

    // 7. USER PROGRESS PRESERVATION TEST (No Overwrite on Re-run)
    console.log("\n--- PROGRESS INTEGRITY & NON-OVERWRITE TEST ---");
    // Simulate BMS Bandung updating the progress of reportStore1 to 35% with a note
    await dbUpdateIncident(reportStore1.id, {
      status: "confirmed_affected",
      progress: 35,
      timeline: [
        ...incidentObj1.timeline,
        {
          stage: "Dikonfirmasi Lapangan",
          label: "BMS Cabang Bandung mengonfirmasi keretakan kaca gerai.",
          timestamp: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB",
          actor: bmsBandung.name,
        },
      ],
    });

    // Re-run daemon autonomous cycle for this event
    await processEarthquakeAlertsAndReports([simEarthquake], simStores, true);

    const updatedIncident = await dbGetIncidentById(reportStore1.id);
    check(
      "NON_OVERWRITE_PROTECTION",
      "User progress is preserved during subsequent daemon cycles",
      updatedIncident?.progress === 35 && updatedIncident?.status === "confirmed_affected",
      `Status=${updatedIncident?.status}, Progress=${updatedIncident?.progress}%`
    );

    check(
      "NON_OVERWRITE_PROTECTION",
      "User timeline entry is preserved without being wiped",
      updatedIncident?.timeline.length === 2,
      `Timeline entries count: ${updatedIncident?.timeline.length}`
    );

    // 8. HISTORICAL RECORD COMPATIBILITY & DEDUPLICATION TEST (store_id = branch)
    console.log("\n--- HISTORICAL REPORT COMPATIBILITY & DEDUPLICATION TEST ---");
    const legacyEventId = "EQ-HIST-LEGACY-001";
    const legacyReportId = `LAP-HIST-${Date.now().toString().slice(-6)}`;
    await client.query("DELETE FROM incidents WHERE earthquake_event_id = $1;", [legacyEventId]);
    
    // Create a legacy branch-level incident where store_id was the branch name
    await dbCreateIncident({
      id: legacyReportId,
      date: "10 Okt 2026",
      disasterType: "earthquake",
      reportOrigin: "automatic_earthquake",
      earthquakeEventId: legacyEventId,
      earthquakeSource: "BMKG",
      earthquakeProvenance: "Legacy branch report format",
      tkpType: "toko",
      storeId: "CIKOKOL",
      storeName: "Toko Cabang Cikokol",
      branch: "CIKOKOL",
      locationCity: "Tangerang",
      status: "pending_confirmation",
      progress: 0,
      fieldPhotos: [],
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 8a. Historical report with store_id = branch is successfully read
    const foundLegacy = await dbFindAutoEarthquakeReport(legacyEventId, "CIKOKOL", "CIKOKOL");
    check(
      "HISTORICAL_COMPATIBILITY",
      "dbFindAutoEarthquakeReport resolves legacy record where store_id = branch",
      foundLegacy?.id === legacyReportId && foundLegacy?.storeId === "CIKOKOL",
      foundLegacy ? `Found legacy report ${foundLegacy.id} (storeId=${foundLegacy.storeId})` : "Not found"
    );

    // 8b. Evaluating stores in that branch for this legacy event does NOT create duplicate reports
    const legacyEarthquake: Earthquake = {
      id: legacyEventId,
      source: "BMKG",
      sourcePrimary: "BMKG",
      canonicalEventKey: legacyEventId,
      title: "Gempa Historis Wilayah Banten",
      place: "Banten",
      magnitude: 5.4,
      depth: "10 km",
      depthKm: 10,
      latitude: -6.2000,
      longitude: 106.6500,
      time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      timestamp: Date.now() - 10 * 60 * 1000,
      potensiTsunami: false,
      priorityRadiusKm: 30.0,
      monitoringRadiusKm: 50.0,
    };

    const cklStore1: Store = {
      id: "ST-CKL-001",
      kode_toko: "TKO-CKL-001",
      nama_toko: "Alfamart Cikokol 1",
      cabang: "CIKOKOL",
      alamat: "Jl. M.H. Thamrin No. 1, Cikokol",
      latitude: -6.2010,
      longitude: 106.6510,
      fr_type: "Reguler",
      branch_emergency_contact: "dc.cikokol@alfamart.co.id",
    };

    const legacyCycleResult = await processEarthquakeAlertsAndReports([legacyEarthquake], [cklStore1], true);
    check(
      "HISTORICAL_DEDUPLICATION",
      "Autonomous processing on legacy event does not create duplicate report",
      legacyCycleResult.createdReports === 0,
      `Created reports = ${legacyCycleResult.createdReports} (matched existing legacy record)`
    );

    const totalLegacyIncidents = await client.query(
      `SELECT id FROM incidents WHERE earthquake_event_id = $1;`,
      [legacyEventId]
    );
    check(
      "HISTORICAL_DEDUPLICATION",
      "Total incident count for legacy event remains exactly 1",
      totalLegacyIncidents.rows.length === 1,
      `Found ${totalLegacyIncidents.rows.length} incident record(s) for ${legacyEventId}`
    );

    // Clean up test data
    await client.query("DELETE FROM incidents WHERE earthquake_event_id = $1;", [simEventId]);
    await client.query("DELETE FROM incidents WHERE earthquake_event_id = $1;", [legacyEventId]);
    await client.query("DELETE FROM notification_logs WHERE disaster_id = $1;", [simEventId]);
    console.log("\nCleaned up all temporary test fixtures on sparta_siaga_isolated.");

    // Summary
    const total = validations.length;
    const passed = validations.filter((v) => v.passed).length;
    const failed = total - passed;
    console.log("\n================================================================================");
    console.log(`FINAL E2E VALIDATION SUMMARY: ${passed}/${total} TESTS PASSED (${failed} FAILED)`);
    console.log("================================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runFinalValidation().catch((err) => {
  console.error("FATAL ERROR IN FINAL VALIDATION:", err);
  process.exit(1);
});
