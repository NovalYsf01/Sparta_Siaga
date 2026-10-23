import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { fetchDisasterFeed } from '@/lib/disaster-service';
import { calculateHaversineDistance, calculateSpartaMonitoringZone } from '@/lib/haversine';
import { getDbPool } from '@/lib/db';
import { Store } from '@/types/store';
import { Earthquake } from '@/types/disaster';
import { NotificationLog, AffectedStoreSummary } from '@/types/notification';
import { dbUpsertEarthquakeEvent } from '@/lib/earthquake-db';
import { ensureEarthquakeReport } from '@/lib/earthquake-report-service';
import { 
  hasEventAlreadyBeenProcessed,
  isNotificationCooldownActive,
  recordNotificationLog, 
  generateEmergencyEmailHtml 
} from '@/lib/notification-service';
import {
  AUTO_EARTHQUAKE_MAX_AGE_MINUTES,
  AUTO_EARTHQUAKE_ALERT_MAX_AGE_MINUTES,
  AUTO_EARTHQUAKE_BACKFILL_MAX_AGE_MINUTES,
} from '@/lib/server-daemon';
import { dispatchEarthquakePushNotifications } from '@/lib/web-push-service';

export const dynamic = 'force-dynamic';

let isWorkerRunning = false;
let lastWorkerRunTime = 0;
const WORKER_COOLDOWN_MS = 30000;

function validateInternalWorkerSecret(request: Request, secret: string): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  
  const token = authHeader.substring(7);
  if (token.length !== secret.length) return false;
  
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const secret = process.env.SPARTA_INTERNAL_WORKER_SECRET;
  if (!secret) {
    return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 503 });
  }

  if (!validateInternalWorkerSecret(request, secret)) {
    console.warn('[SPARTA SIAGA][Worker] unauthorized request blocked');
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  if (now - lastWorkerRunTime < WORKER_COOLDOWN_MS) {
    console.warn('[SPARTA SIAGA][Worker] request rate-limited');
    return NextResponse.json({ success: false, error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '30' } });
  }

  if (isWorkerRunning) {
    console.warn('[SPARTA SIAGA][Worker] already running');
    return NextResponse.json({ success: false, error: 'Worker already running' }, { status: 409 });
  }

  isWorkerRunning = true;
  console.log('[SPARTA SIAGA][Worker] manual worker started');

  try {
    let forceSimulation = false;
    let allowBackfill = false;
    try {
      const body = await request.json();
      forceSimulation = !!body.forceSimulation;
      allowBackfill = !!body.allowBackfill;
    } catch {
      // no body or non-json
    }

    const pool = getDbPool();
    
    // 1. Fetch stores from database
    const storeRes = await pool.query(
      `SELECT id, kode_toko, nama_toko, cabang, alamat, latitude, longitude, fr_type, branch_emergency_contact 
       FROM stores LIMIT 25000`
    );
    const stores: Store[] = storeRes.rows;
    const facilityRes = await pool.query(
      `SELECT id::text, code, name, facility_type, branch_id, latitude, longitude
         FROM facilities
        WHERE operational_status = 'ACTIVE'
          AND auto_report_enabled = TRUE
          AND branch_id IS NOT NULL
          AND mapping_verified_at IS NOT NULL`
    );

    if (stores.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No stores available in database'
      }, { status: 500 });
    }

    // 2. Fetch active earthquake data
    const disasterFeed = await fetchDisasterFeed();
    const earthquakes: Earthquake[] = [];
    if (disasterFeed.latestBmkgEarthquake) {
      earthquakes.push(disasterFeed.latestBmkgEarthquake);
    }
    if (disasterFeed.recentEarthquakes && disasterFeed.recentEarthquakes.length > 0) {
      for (const eq of disasterFeed.recentEarthquakes) {
        if (!earthquakes.some(e => e.id === eq.id)) {
          earthquakes.push(eq);
        }
      }
    }
    const dispatchedLogs: NotificationLog[] = [];

    const isEligibleForAlert = forceSimulation || (disasterFeed.dataFreshness !== 'stale' && disasterFeed.dataFreshness !== 'unavailable');

    if (isEligibleForAlert && disasterFeed.activeEarthquakes && disasterFeed.activeEarthquakes.length > 0) {
      for (const eq of disasterFeed.activeEarthquakes) {
        const eventTimestamp = eq.timestamp || (eq.time ? new Date(eq.time).getTime() : Date.now());
        const eventAgeMinutes = (Date.now() - eventTimestamp) / (1000 * 60);
        if (!forceSimulation && !allowBackfill && eventAgeMinutes > AUTO_EARTHQUAKE_ALERT_MAX_AGE_MINUTES) {
          continue;
        }
        if (!forceSimulation && eventAgeMinutes > AUTO_EARTHQUAKE_BACKFILL_MAX_AGE_MINUTES) {
          continue;
        }

        const isAlertFresh = forceSimulation || (eventAgeMinutes <= AUTO_EARTHQUAKE_ALERT_MAX_AGE_MINUTES);

        await dbUpsertEarthquakeEvent(eq);
        // Calculate SPARTA zones
        const { priorityRadiusKm, monitoringRadiusKm } = calculateSpartaMonitoringZone(eq.magnitude, eq.depthKm);

      // Collect affected stores
      const affectedByBranch = new Map<string, AffectedStoreSummary[]>();
      const affectedFacilitiesByBranch = new Map<string, AffectedStoreSummary[]>();

      for (const st of stores) {
        if (!st.cabang || !st.cabang.trim()) continue;
        const dist = calculateHaversineDistance(eq.latitude, eq.longitude, st.latitude, st.longitude);
        if (dist <= monitoringRadiusKm) {
          const status = dist <= priorityRadiusKm ? 'PRIORITY_MONITOR' : 'MONITOR';
          const summary: AffectedStoreSummary = {
            kode_toko: st.kode_toko,
            nama_toko: st.nama_toko,
            cabang: st.cabang,
            distance_km: Math.round(dist * 10) / 10,
            status,
            alamat: st.alamat,
            fr_type: st.fr_type,
          };

          if (!affectedByBranch.has(st.cabang)) {
            affectedByBranch.set(st.cabang, []);
          }
          affectedByBranch.get(st.cabang)!.push(summary);
        }
      }

      for (const facility of facilityRes.rows) {
        if (
          facility.latitude == null ||
          facility.longitude == null ||
          !Number.isFinite(Number(facility.latitude)) ||
          !Number.isFinite(Number(facility.longitude))
        ) {
          continue;
        }
        const distanceKm = calculateHaversineDistance(
          eq.latitude,
          eq.longitude,
          Number(facility.latitude),
          Number(facility.longitude)
        );
        if (isNaN(distanceKm) || distanceKm > monitoringRadiusKm) continue;

        const branchKey = facility.branch_id?.trim();
        // EQ-03 Requirement 5: Never use "Nasional" as substitute operational branch.
        // Unmapped facilities are logged, flagged, and excluded from branch-specific dispatch until mapped.
        if (!branchKey) {
          console.warn(`[SPARTA SIAGA][Worker] Unmapped facility detected: ${facility.code} (${facility.name}) has no operational branch mapping. Flagging and excluding from branch-specific notification dispatch.`);
          continue;
        }

        const facilitySummary: AffectedStoreSummary = {
          kode_toko: facility.code,
          nama_toko: facility.name,
          cabang: branchKey,
          distance_km: Math.round(distanceKm * 10) / 10,
          status: distanceKm <= priorityRadiusKm ? 'PRIORITY_MONITOR' : 'MONITOR',
          fr_type: facility.facility_type,
        };
        const branchFacilities = affectedFacilitiesByBranch.get(branchKey) ?? [];
        branchFacilities.push(facilitySummary);
        affectedFacilitiesByBranch.set(branchKey, branchFacilities);
        const reportHash = crypto
          .createHash('sha256')
          .update(`${eq.id}:FACILITY:${facility.id}`)
          .digest('hex')
          .slice(0, 16)
          .toUpperCase();
        await ensureEarthquakeReport({
          reportId: `LAP-EQ-FAC-${reportHash}`,
          canonicalEventId: eq.id,
          eventOccurredAt: new Date(eq.timestamp),
          source: eq.source,
          location: {
            kind: 'FACILITY',
            id: facility.id,
            code: facility.code,
            name: facility.name,
            type: facility.facility_type,
            branch: branchKey,
            latitude: Number(facility.latitude),
            longitude: Number(facility.longitude),
          },
        });
      }

      if (isAlertFresh) {
        for (const [branch, facilities] of affectedFacilitiesByBranch) {
          facilities.sort((a, b) => a.distance_km - b.distance_km);
          const priorityCount = facilities.filter((item) => item.status === 'PRIORITY_MONITOR').length;
          const log = await recordNotificationLog({
            disasterId: eq.id,
            canonicalEventId: eq.id,
            disasterType: 'earthquake',
            channel: 'pwa_only',
            branch,
            recipientGroup: 'BES',
            category: 'ASSIGNMENT',
            recipientContact: `in-app://bes/${branch.toLowerCase().replace(/\s+/g, '-')}`,
            title: `Pemeriksaan fasilitas · Gempa M ${eq.magnitude}`,
            message: `${facilities.length} fasilitas perlu diperiksa; ${priorityCount} berada di Zona Prioritas Pantau. Buka Shared Queue untuk mengambil PIC.`,
            affectedStores: facilities,
          });
          dispatchedLogs.push(log);
        }

        // If simulated or actually has affected stores in priority monitor
        for (const [branch, branchStores] of affectedByBranch.entries()) {
          const priorityStores = branchStores.filter(s => s.status === 'PRIORITY_MONITOR');
          
          // Dispatch alert if there are stores in priority monitor, or high magnitude, or forced simulation
          if (priorityStores.length > 0 || (eq.magnitude >= 5.0 && branchStores.length > 0) || forceSimulation) {
            const isProcessed = !forceSimulation && await hasEventAlreadyBeenProcessed(eq.id, 'earthquake', branch);
            const inCooldown = !forceSimulation && await isNotificationCooldownActive('earthquake', branch);

            if (!isProcessed && !inCooldown) {
              // Sort stores by distance
              branchStores.sort((a, b) => a.distance_km - b.distance_km);

              const ticketNumber = `ESC-${branch.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
              const disasterTitle = forceSimulation
                ? `[SIMULATION] ⚠️ PERINGATAN DARURAT GEMPA M ${eq.magnitude} - CABANG ${branch.toUpperCase()}`
                : `⚠️ PERINGATAN DARURAT GEMPA M ${eq.magnitude} - CABANG ${branch.toUpperCase()}`;
              const disasterDetail = `Gempa bumi tektonik terdeteksi oleh BMKG/USGS dengan Magnitudo ${eq.magnitude} pada kedalaman ${eq.depthKm} km di wilayah ${eq.title}. Zona Prioritas Pantau SPARTA terhitung ${priorityRadiusKm} km. ${priorityStores.length} gerai toko cabang Anda berada di Zona Prioritas Pantau SPARTA.`;

              const instructions = [
                'Duty Officer DC Cabang segera melakukan panggilan radio/telepon siaga ke Area Coordinator (AC) terkait.',
                'Instruksikan personil toko melakukan evakuasi pelanggan dan kru jika struktur bangunan menunjukkan keretakan.',
                'Matikan aliran listrik utama (MCB) dan amankan tabung gas jika tercium bau kebocoran.',
                'Laporkan status operasional (Buka / Tutup Sementara / Kerusakan) melalui Command Center SPARTA.'
              ];

              const emailHtml = generateEmergencyEmailHtml({
                ticketNumber,
                branch,
                disasterTitle,
                disasterDetail,
                affectedCount: branchStores.length,
                stores: branchStores,
                instructions,
                sentAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB',
              });

              const log = await recordNotificationLog({
                disasterId: forceSimulation ? `sim_eq_${eq.id}_${Date.now()}` : eq.id,
                disasterType: 'earthquake',
                channel: 'email_and_pwa',
                branch,
                recipientContact: `dc.${branch.toLowerCase().replace(/\s+/g, '')}@alfamart.co.id`,
                title: disasterTitle,
                message: disasterDetail,
                affectedStores: branchStores,
                ticketNumber,
              });

              // Deliver real background Web Push to registered devices (Android, iOS PWA, Desktop)
              await dispatchEarthquakePushNotifications({
                title: disasterTitle,
                body: disasterDetail,
                branch,
                eventId: eq.id,
                magnitude: eq.magnitude,
                priorityStoresCount: priorityStores.length,
                url: `/monitoring?disasterId=${encodeURIComponent(eq.id)}`,
              }).catch((pushErr) => {
                console.error('[SPARTA SIAGA][Worker] Error during background Web Push dispatch:', pushErr);
              });

              log.email_html_preview = emailHtml;
              dispatchedLogs.push(log);
            }
          }
        }
      } else {
        console.log(`[SPARTA SIAGA][Worker] Suppressed outdated emergency alert for event ${eq.id} (event age: ${eventAgeMinutes.toFixed(1)}m > ${AUTO_EARTHQUAKE_ALERT_MAX_AGE_MINUTES}m)`);
      }
    }
    } // Close if (isEligibleForAlert)

    // 4. Evaluate Heavy Rain / Flood Potential Simulation if requested or if rain exists
    if (forceSimulation && dispatchedLogs.length === 0) {
      // Create a demonstration flood alert for the branch
      const sampleBranch = stores[0]?.cabang || 'SIDOARJO';
      const sampleStores = stores.filter(s => s.cabang === sampleBranch).slice(0, 5).map(s => ({
        kode_toko: s.kode_toko,
        nama_toko: s.nama_toko,
        cabang: s.cabang,
        distance_km: 1.2,
        status: 'MONITOR' as const,
        alamat: s.alamat,
        fr_type: s.fr_type,
      }));

      const floodLog = await recordNotificationLog({
        disasterId: `flood_sim_${Date.now()}`,
        disasterType: 'heavy_rain',
        channel: 'pwa_only',
        branch: sampleBranch,
        recipientContact: `pwa://dc-${sampleBranch.toLowerCase()}`,
        title: `[SIMULATION] 🌧️ SIAGA HUJAN EKSTREM & BANJIR: Cabang ${sampleBranch}`,
        message: `Model cuaca menunjukkan indikasi presipitasi hujan ekstrem (intensitas > 25 mm/jam) di atas gerai cabang ${sampleBranch}. Segera aktifkan SOP peninggian barang dagang dan pasang tanggul banjir gerai.`,
        affectedStores: sampleStores,
      });
      dispatchedLogs.push(floodLog);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dispatched_count: dispatchedLogs.length,
      notifications: dispatchedLogs,
      evaluated_disasters: earthquakes.length,
      message: dispatchedLogs.length > 0 
        ? `Berhasil memproses dan mendispatch ${dispatchedLogs.length} notifikasi otomatis ke DC Cabang terkait.`
        : 'Worker selesai dijalankan. Seluruh cabang dalam status terpantau normal atau notifikasi sudah dikirim sebelumnya (deduplikasi aktif).'
    });

  } catch (error: any) {
    console.error('[Notification Worker Error]:', error);
    return NextResponse.json({
      success: false,
      error: 'Worker execution failed' // Mask error details for security
    }, { status: 500 });
  } finally {
    lastWorkerRunTime = Date.now();
    isWorkerRunning = false;
  }
}
