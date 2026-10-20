// Explicit global marker tracking whether this module has been evaluated in the current Node process
(globalThis as Record<string, unknown>).__sparta_server_daemon_module_loaded = true;

import { getDbPool } from './db';
import { fetchDisasterFeed } from './disaster-service';
import { calculateHaversineDistance, calculateSpartaMonitoringZone } from './haversine';
import { 
  hasEventAlreadyBeenProcessed,
  isNotificationCooldownActive,
  recordNotificationLog, 
  updateNotificationLogForEvent,
  generateEmergencyEmailHtml 
} from './notification-service';
import { 
  dbFindAutoEarthquakeReport, 
  dbFindManualEarthquakeReportByEvent, 
  dbFindUnlinkedManualEarthquakeCandidates,
  dbCreateIncident, 
  dbUpdateIncident 
} from './incident-db';
import { AffectedStoreSummary } from '@/types/notification';
import { ReportAffectedStore } from '@/types/incident';
import { Store } from '@/types/store';
import { Earthquake } from '@/types/disaster';

export const AUTO_EARTHQUAKE_MAX_AGE_MINUTES = parseInt(process.env.AUTO_EARTHQUAKE_MAX_AGE_MINUTES || '60', 10);
export const MANUAL_EARTHQUAKE_MATCH_WINDOW_MINUTES = parseInt(process.env.MANUAL_EARTHQUAKE_MATCH_WINDOW_MINUTES || '120', 10);

let isCycleRunning = false;
let initialTimer: NodeJS.Timeout | null = null;
let intervalTimer: NodeJS.Timeout | null = null;
let isDaemonStopped = false;

import { getOrLoadMasterStores, getBranchCentroidsFromStores, BranchCentroid } from './store-master-loader';

// In-memory cache for branch centroids
let cachedBranchCentroids: BranchCentroid[] | null = null;

async function getBranchCentroids(): Promise<BranchCentroid[]> {
  if (cachedBranchCentroids && cachedBranchCentroids.length > 0) {
    return cachedBranchCentroids;
  }

  try {
    const pool = getDbPool();
    const res = await pool.query(`
      SELECT cabang, 
             ROUND(AVG(latitude)::numeric, 4) as lat, 
             ROUND(AVG(longitude)::numeric, 4) as lon,
             COUNT(*)::int as store_count
      FROM stores 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      GROUP BY cabang
      ORDER BY store_count DESC;
    `);

    if (res.rows && res.rows.length > 0) {
      cachedBranchCentroids = res.rows.map(r => ({
        cabang: r.cabang,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        store_count: r.store_count,
      }));
      return cachedBranchCentroids;
    }
  } catch (error) {
    console.warn('[Autonomous Daemon] DB branch centroids query not available, calculating from master stores:', error);
  }

  // Calculate from master stores dataset (21,550 stores)
  const masterStores = await getOrLoadMasterStores();
  cachedBranchCentroids = getBranchCentroidsFromStores(masterStores);
  return cachedBranchCentroids;
}

/**
 * Autonomous evaluation cycle that runs on the server 24/7
 */
export async function runAutonomousDisasterCycle(): Promise<void> {
  if (isCycleRunning || isDaemonStopped) {
    if (isCycleRunning) {
      console.log('[Autonomous Daemon] Previous cycle still running, skipping...');
    }
    return;
  }

  isCycleRunning = true;
  const cycleStart = Date.now();

  try {
    const pool = getDbPool();

    // 1. Fetch live earthquakes from BMKG & USGS
    const disasterFeed = await fetchDisasterFeed(true);
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

    // 2. Fetch stores from DB or Master CSV (21,550 stores)
    const stores: Store[] = await getOrLoadMasterStores();

    let dispatchedEarthquakeAlerts = 0;
    let dispatchedRainAlerts = 0;

    // 3. Evaluate Earthquakes against 21,550 stores
    // Guard: Do not create new operational alerts if data is stale or unavailable
    const isEligibleForAlert = disasterFeed.dataFreshness !== 'stale' && disasterFeed.dataFreshness !== 'unavailable';

    if (isEligibleForAlert && stores.length > 0 && disasterFeed.activeEarthquakes && disasterFeed.activeEarthquakes.length > 0) {
      const result = await processEarthquakeAlertsAndReports(disasterFeed.activeEarthquakes, stores, isEligibleForAlert);
      dispatchedEarthquakeAlerts = result.dispatchedAlerts;
    }

    // 4. Autonomous Weather / Flood Potential Evaluation across DC Branches
    const branches = await getBranchCentroids();
    if (branches.length > 0) {
      try {
        // Query Open-Meteo multi-coordinates for all branch centroids
        const lats = branches.map(b => b.lat).join(',');
        const lons = branches.map(b => b.lon).join(',');
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=precipitation,weather_code`;

        const weatherRes = await fetch(weatherUrl, {
          next: { revalidate: 300 },
          headers: { 'User-Agent': 'SpartaSiaga-Daemon/1.0' },
        });

        if (weatherRes.ok) {
          const weatherData = await weatherRes.json();
          const items = Array.isArray(weatherData) ? weatherData : [weatherData];

          for (let i = 0; i < items.length && i < branches.length; i++) {
            const b = branches[i];
            const current = items[i]?.current;
            const precipitation = current?.precipitation ?? 0;
            const weatherCode = current?.weather_code ?? 0;

            // Severe rain threshold: precipitation >= 20 mm/h or severe thunderstorm (code 95, 96, 99)
            if (precipitation >= 20.0 || weatherCode >= 95) {
              const todayStr = new Date().toISOString().slice(0, 10);
              const floodEventId = `flood_${b.cabang.toLowerCase()}_${todayStr}`;
              const isProcessed = await hasEventAlreadyBeenProcessed(floodEventId, 'heavy_rain', b.cabang);
              const inCooldown = await isNotificationCooldownActive('heavy_rain', b.cabang);

              if (!isProcessed && !inCooldown) {
                // Find stores in this branch
                const branchStores = stores.filter(s => s.cabang === b.cabang).slice(0, 10).map(s => ({
                  kode_toko: s.kode_toko,
                  nama_toko: s.nama_toko,
                  cabang: s.cabang,
                  distance_km: 1.0,
                  status: 'MONITOR' as const,
                  alamat: s.alamat,
                  fr_type: s.fr_type,
                }));

                const ticketNumber = `FL-${b.cabang.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
                const rainTitle = `SIAGA HUJAN LEBAT — POTENSI BANJIR: Cabang ${b.cabang}`;
                const rainMessage = `Model cuaca menunjukkan potensi curah hujan lebat (${precipitation.toFixed(1)} mm/jam) di sekitar cabang ${b.cabang}. Bersiap aktifkan SOP pencegahan genangan.`;

                await recordNotificationLog({
                  disasterId: floodEventId,
                  disasterType: 'heavy_rain',
                  channel: 'pwa_only',
                  branch: b.cabang,
                  recipientContact: `pwa://dc-${b.cabang.toLowerCase()}`,
                  title: rainTitle,
                  message: rainMessage,
                  affectedStores: branchStores,
                  ticketNumber,
                });

                dispatchedRainAlerts++;
                console.log(`[Autonomous Daemon] 🌧️ DISPATCHED FLOOD ALERT: Cabang ${b.cabang} (Precipitation: ${precipitation} mm/h)`);
              }
            }
          }
        }
      } catch (weatherErr) {
        console.warn('[Autonomous Daemon] Warning evaluating weather across branches:', weatherErr);
      }
    }

    const elapsed = Date.now() - cycleStart;
    console.log(
      `[Autonomous Daemon] Cycle finished in ${elapsed}ms | Quakes evaluated: ${earthquakes.length} | Branches checked: ${branches.length} | Dispatches: ${dispatchedEarthquakeAlerts} EQ, ${dispatchedRainAlerts} Flood`
    );

  } catch (error) {
    console.error('[Autonomous Daemon] Fatal error during cycle:', error);
  } finally {
    isCycleRunning = false;
  }
}

/**
 * Start the autonomous daemon (Ensures single runner in Node.js server process)
 */
export function startServerDaemon(): void {
  if (typeof window !== 'undefined') return; // Server only

  const globalScope = globalThis as any;
  if (globalScope.__sparta_daemon_started) {
    console.log('[Autonomous Daemon] Daemon already active in this Node.js process.');
    return;
  }

  globalScope.__sparta_daemon_started = true;
  isDaemonStopped = false;
  console.log('------------------------------------------------------------');
  console.log('🚀 [SPARTA SIAGA] 24/7 AUTONOMOUS SERVER DAEMON ACTIVATED');
  console.log('   Continuous monitoring: BMKG Quakes (60s), RainViewer & Open-Meteo');
  console.log('   Auto-dispatching: Email to DC Cabang + PWA Push Notifications');
  console.log('------------------------------------------------------------');

  // Initial trigger after 4 seconds
  initialTimer = setTimeout(() => {
    if (isDaemonStopped) return;
    runAutonomousDisasterCycle().catch(err => console.error('[Autonomous Daemon] Initial run failed:', err));
  }, 4000);

  // Interval trigger every 60 seconds (1 minute) 24/7
  intervalTimer = setInterval(() => {
    if (isDaemonStopped) return;
    runAutonomousDisasterCycle().catch(err => console.error('[Autonomous Daemon] Interval run failed:', err));
  }, 60000);
}

export async function stopServerDaemon(gracePeriodMs: number = 5000): Promise<void> {
  isDaemonStopped = true;
  if (initialTimer) {
    clearTimeout(initialTimer);
    initialTimer = null;
  }
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
  const globalScope = globalThis as any;
  globalScope.__sparta_daemon_started = false;

  const start = Date.now();
  while (isCycleRunning && Date.now() - start < gracePeriodMs) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  console.log('[Autonomous Daemon] Daemon stopped.');
}

/**
 * Evaluates active earthquakes against stores, sends branch alerts,
 * and creates store-level incident reports for stores in the priority zone.
 */
export async function processEarthquakeAlertsAndReports(
  earthquakes: Earthquake[],
  stores: Store[],
  isEligibleForAlert: boolean = true
): Promise<{ dispatchedAlerts: number; createdReports: number }> {
  let dispatchedAlerts = 0;
  let createdReports = 0;

  if (!isEligibleForAlert || !earthquakes.length || !stores.length) {
    return { dispatchedAlerts: 0, createdReports: 0 };
  }

  for (const eq of earthquakes) {
    const eventTimestamp = eq.timestamp || (eq.time ? new Date(eq.time).getTime() : Date.now());
    const eventAgeMinutes = (Date.now() - eventTimestamp) / (1000 * 60);
    if (eventAgeMinutes > AUTO_EARTHQUAKE_MAX_AGE_MINUTES) {
      continue;
    }

    const { priorityRadiusKm, monitoringRadiusKm } = calculateSpartaMonitoringZone(eq.magnitude, eq.depthKm);

    const branchStoresMap = new Map<string, AffectedStoreSummary[]>();
    const priorityStoresByBranch = new Map<string, AffectedStoreSummary[]>();

    for (const store of stores) {
      if (store.latitude == null || store.longitude == null) continue;
      const distance = calculateHaversineDistance(eq.latitude, eq.longitude, store.latitude, store.longitude);

      if (distance <= priorityRadiusKm) {
        const affected: AffectedStoreSummary = {
          kode_toko: store.kode_toko,
          nama_toko: store.nama_toko,
          cabang: store.cabang,
          distance_km: distance,
          status: 'PRIORITY_MONITOR',
          alamat: store.alamat,
          fr_type: store.fr_type,
        };
        if (!branchStoresMap.has(store.cabang)) branchStoresMap.set(store.cabang, []);
        branchStoresMap.get(store.cabang)!.push(affected);

        if (!priorityStoresByBranch.has(store.cabang)) priorityStoresByBranch.set(store.cabang, []);
        priorityStoresByBranch.get(store.cabang)!.push(affected);
      } else if (distance <= monitoringRadiusKm) {
        const affected: AffectedStoreSummary = {
          kode_toko: store.kode_toko,
          nama_toko: store.nama_toko,
          cabang: store.cabang,
          distance_km: distance,
          status: 'MONITOR',
          alamat: store.alamat,
          fr_type: store.fr_type,
        };
        if (!branchStoresMap.has(store.cabang)) branchStoresMap.set(store.cabang, []);
        branchStoresMap.get(store.cabang)!.push(affected);
      }
    }

    for (const [branch, branchStores] of branchStoresMap.entries()) {
      const priorityStores = priorityStoresByBranch.get(branch) || [];

      // Branch DC Notification (Email & PWA alert log)
      const isProcessed = await hasEventAlreadyBeenProcessed(eq.id, 'earthquake', branch);
      const inCooldown = await isNotificationCooldownActive('earthquake', branch);

      branchStores.sort((a, b) => a.distance_km - b.distance_km);
      const disasterTitle = `⚠️ PERINGATAN DARURAT GEMPA M ${eq.magnitude} - CABANG ${branch.toUpperCase()}`;
      const disasterDetail = `Gempa bumi tektonik terdeteksi oleh BMKG/USGS dengan Magnitudo ${eq.magnitude} pada kedalaman ${eq.depthKm} km di wilayah ${eq.title}. Zona Prioritas Pantau SPARTA terhitung ${priorityRadiusKm} km. ${priorityStores.length} gerai toko cabang Anda berada di Zona Prioritas Pantau SPARTA.`;

      if (isProcessed) {
        await updateNotificationLogForEvent(eq.id, branch, {
          title: disasterTitle,
          message: disasterDetail,
          affectedStores: branchStores,
        });
      } else if (!inCooldown) {
        const ticketNumber = `ESC-${branch.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const instructions = [
          'Duty Officer DC Cabang segera melakukan panggilan radio/telepon siaga ke Area Coordinator (AC) terkait.',
          'Instruksikan personil toko melakukan evakuasi pelanggan dan kru jika struktur bangunan menunjukkan keretakan.',
          'Matikan aliran listrik utama (MCB) dan amankan tabung gas jika tercium bau kebocoran.',
          'Laporkan status operasional (Buka / Tutup Sementara / Kerusakan) melalui Command Center SPARTA.',
        ];

        generateEmergencyEmailHtml({
          ticketNumber,
          branch,
          disasterTitle,
          disasterDetail,
          affectedCount: branchStores.length,
          stores: branchStores,
          instructions,
          sentAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB',
        });

        await recordNotificationLog({
          disasterId: eq.id,
          disasterType: 'earthquake',
          channel: 'email_and_pwa',
          branch,
          recipientContact: `dc.${branch.toLowerCase().replace(/\s+/g, '')}@alfamart.co.id`,
          title: disasterTitle,
          message: disasterDetail,
          affectedStores: branchStores,
          ticketNumber,
        });

        dispatchedAlerts++;
      }

      // Operational Reports for stores in Priority Monitoring Zone
      for (const store of priorityStores) {
        const existingAuto = await dbFindAutoEarthquakeReport(eq.id, store.kode_toko, branch);
        if (existingAuto) {
          await dbUpdateIncident(existingAuto.id, {
            earthquakeSource: eq.source || 'BMKG/USGS',
            disasterMetadata: {
              magnitude: eq.magnitude,
              depth: eq.depth,
              coordinates: [eq.latitude, eq.longitude],
              place: eq.title,
              time: eq.time,
            },
          });
          continue;
        }

        const existingManual = await dbFindManualEarthquakeReportByEvent(eq.id, store.kode_toko, branch);
        if (existingManual) {
          continue;
        }

        const unlinkedCandidates = await dbFindUnlinkedManualEarthquakeCandidates(
          store.kode_toko,
          eventTimestamp,
          MANUAL_EARTHQUAKE_MATCH_WINDOW_MINUTES
        );
        if (unlinkedCandidates.length === 1) {
          const candidate = unlinkedCandidates[0];
          await dbUpdateIncident(candidate.id, {
            earthquakeEventId: eq.id,
            earthquakeSource: eq.source || 'BMKG/USGS',
            earthquakeProvenance: `Ditautkan otomatis ke event ${eq.source || 'BMKG/USGS'} ${eq.id} (jendela ${MANUAL_EARTHQUAKE_MATCH_WINDOW_MINUTES}m)`,
            disasterMetadata: {
              magnitude: eq.magnitude,
              depth: eq.depth,
              coordinates: [eq.latitude, eq.longitude],
              place: eq.title,
              time: eq.time,
            },
          });
          continue;
        } else if (unlinkedCandidates.length > 1) {
          console.warn(`[Autonomous Daemon] Ambiguous unlinked manual reports found for Store ${store.kode_toko}. Skipping auto-report.`);
          continue;
        }

        const randSuffix = Math.floor(1000 + Math.random() * 9000);
        const reportId = `LAP-EQ-${store.kode_toko.toUpperCase()}-${randSuffix}`;
        const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        const reportAffectedStores: ReportAffectedStore[] = [{
          kode_toko: store.kode_toko,
          nama_toko: store.nama_toko,
          cabang: store.cabang,
          alamat: store.alamat,
          fr_type: store.fr_type,
          distance_km: store.distance_km,
          exposure_zone: 'PRIORITY_MONITOR',
          confirmation_status: 'pending',
        }];

        try {
          await dbCreateIncident({
            id: reportId,
            date: todayStr,
            disasterType: 'earthquake',
            reportOrigin: 'automatic_earthquake',
            earthquakeEventId: eq.id,
            earthquakeSource: eq.source || 'BMKG/USGS',
            earthquakeProvenance: `Estimasi area dampak berdasarkan data gempa ${eq.source || 'BMKG/USGS'} dan perhitungan SPARTA.`,
            tkpType: 'toko',
            storeId: store.kode_toko,
            storeName: store.nama_toko,
            branch,
            locationCity: branch,
            status: 'pending_confirmation',
            progress: 0,
            disasterMetadata: {
              magnitude: eq.magnitude,
              depth: eq.depth,
              coordinates: [eq.latitude, eq.longitude],
              place: eq.title,
              time: eq.time,
            },
            affectedStores: reportAffectedStores,
            affectedStoreCount: 1,
            dangerStoreCount: 1,
            fieldPhotos: [],
            timeline: [
              {
                stage: 'Laporan Otomatis Dibuat',
                label: `Gempa M${eq.magnitude} terdeteksi oleh ${eq.source || 'BMKG/USGS'}. Gerai ${store.nama_toko} (${store.kode_toko}) berada dalam radius zona prioritas pantau (${store.distance_km.toFixed(1)} km) dan memerlukan konfirmasi kondisi lapangan.`,
                timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB',
                actor: 'SPARTA Siaga — Autonomous Engine',
                notes: `Event ID: ${eq.id}`,
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          createdReports++;
          console.log(`[Autonomous Daemon] Auto-report created: ${reportId} for store ${store.kode_toko}`);
        } catch (err: unknown) {
          const pgError = err as { code?: string };
          if (pgError?.code === '23505') {
            console.log(`[Autonomous Daemon] Unique constraint caught duplicate insert for Store ${store.kode_toko} / Event ${eq.id}`);
          } else {
            console.error(`[Autonomous Daemon] Failed to create incident report for Store ${store.kode_toko}:`, err);
          }
        }
      }
    }
  }

  return { dispatchedAlerts, createdReports };
}

