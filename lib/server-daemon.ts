import { getDbPool } from './db';
import { fetchDisasterFeed } from './disaster-service';
import { calculateHaversineDistance, calculateBmkgImpactRadius } from './haversine';
import { 
  hasEventAlreadyBeenProcessed,
  isNotificationCooldownActive,
  recordNotificationLog, 
  generateEmergencyEmailHtml 
} from './notification-service';
import { AffectedStoreSummary } from '@/types/notification';
import { Store } from '@/types/store';
import { Earthquake } from '@/types/disaster';

let isCycleRunning = false;

interface BranchCentroid {
  cabang: string;
  lat: number;
  lon: number;
  store_count: number;
}

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

    cachedBranchCentroids = res.rows.map(r => ({
      cabang: r.cabang,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      store_count: r.store_count,
    }));

    return cachedBranchCentroids;
  } catch (error) {
    console.error('[Autonomous Daemon] Error fetching branch centroids:', error);
    return [];
  }
}

/**
 * Autonomous evaluation cycle that runs on the server 24/7
 */
export async function runAutonomousDisasterCycle(): Promise<void> {
  if (isCycleRunning) {
    console.log('[Autonomous Daemon] Previous cycle still running, skipping...');
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

    // 2. Fetch stores from Aiven PostgreSQL (or memory)
    const storeRes = await pool.query(
      `SELECT id, kode_toko, nama_toko, cabang, alamat, latitude, longitude, fr_type, branch_emergency_contact 
       FROM stores LIMIT 25000`
    );
    const stores: Store[] = storeRes.rows;

    let dispatchedEarthquakeAlerts = 0;
    let dispatchedRainAlerts = 0;

    // 3. Evaluate Earthquakes against 21,550 stores
    // Guard: Do not create new operational alerts if data is stale or unavailable
    const isEligibleForAlert = disasterFeed.dataFreshness !== 'stale' && disasterFeed.dataFreshness !== 'unavailable';

    if (isEligibleForAlert && stores.length > 0 && earthquakes.length > 0) {
      for (const eq of earthquakes) {
        const { dangerRadiusKm, warningRadiusKm } = calculateBmkgImpactRadius(eq.magnitude, eq.depthKm);

        const affectedByBranch = new Map<string, AffectedStoreSummary[]>();

        for (const st of stores) {
          const dist = calculateHaversineDistance(eq.latitude, eq.longitude, st.latitude, st.longitude);
          if (dist <= warningRadiusKm) {
            const status = dist <= dangerRadiusKm ? 'danger' : 'warning';
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

        // Check if any branches have stores in danger or significant earthquake
        for (const [branch, branchStores] of affectedByBranch.entries()) {
          const dangerStores = branchStores.filter(s => s.status === 'danger');

          if (dangerStores.length > 0 || (eq.magnitude >= 5.0 && branchStores.length > 0)) {
            const isProcessed = await hasEventAlreadyBeenProcessed(eq.id, 'earthquake', branch);
            const inCooldown = await isNotificationCooldownActive('earthquake', branch);

            if (!isProcessed && !inCooldown) {
              branchStores.sort((a, b) => a.distance_km - b.distance_km);

              const ticketNumber = `ESC-${branch.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
              const disasterTitle = `⚠️ PERINGATAN DARURAT GEMPA M ${eq.magnitude} - CABANG ${branch.toUpperCase()}`;
              const disasterDetail = `Gempa bumi tektonik terdeteksi oleh BMKG/USGS dengan Magnitudo ${eq.magnitude} pada kedalaman ${eq.depthKm} km di wilayah ${eq.title}. Radius bahaya terhitung ${dangerRadiusKm} km. ${dangerStores.length} gerai toko cabang Anda berada di zona bahaya guncangan.`;

              const instructions = [
                'Duty Officer DC Cabang segera melakukan panggilan radio/telepon siaga ke Area Coordinator (AC) terkait.',
                'Instruksikan personil toko melakukan evakuasi pelanggan dan kru jika struktur bangunan menunjukkan keretakan.',
                'Matikan aliran listrik utama (MCB) dan amankan tabung gas jika tercium bau kebocoran.',
                'Laporkan status operasional (Buka / Tutup Sementara / Kerusakan) melalui Command Center SPARTA.'
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

              dispatchedEarthquakeAlerts++;
              console.log(`[Autonomous Daemon] 🚨 DISPATCHED EARTHQUAKE ALERT: Cabang ${branch} (Ticket: ${ticketNumber}, Stores: ${branchStores.length})`);
            }
          }
        }
      }
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
                  status: 'warning' as const,
                  alamat: s.alamat,
                  fr_type: s.fr_type,
                }));

                const ticketNumber = `FL-${b.cabang.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
                const rainTitle = `🌧️ SIAGA HUJAN EKSTREM & BANJIR: Cabang ${b.cabang}`;
                const rainMessage = `Model cuaca menunjukkan indikasi curah hujan lebat (${precipitation.toFixed(1)} mm/jam) di sekitar gerai cabang ${b.cabang}. Segera aktifkan SOP peninggian barang dagang ke atas pallet dan pasang tanggul air gerai.`;

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
  console.log('------------------------------------------------------------');
  console.log('🚀 [SPARTA SIAGA] 24/7 AUTONOMOUS SERVER DAEMON ACTIVATED');
  console.log('   Continuous monitoring: BMKG Quakes (60s), RainViewer & Open-Meteo');
  console.log('   Auto-dispatching: Email to DC Cabang + PWA Push Notifications');
  console.log('------------------------------------------------------------');

  // Initial trigger after 4 seconds
  setTimeout(() => {
    runAutonomousDisasterCycle().catch(err => console.error('[Autonomous Daemon] Initial run failed:', err));
  }, 4000);

  // Interval trigger every 60 seconds (1 minute) 24/7
  setInterval(() => {
    runAutonomousDisasterCycle().catch(err => console.error('[Autonomous Daemon] Interval run failed:', err));
  }, 60000);
}
