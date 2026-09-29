import { NextResponse } from 'next/server';
import { fetchDisasterFeed } from '@/lib/disaster-service';
import { calculateHaversineDistance, calculateBmkgImpactRadius } from '@/lib/haversine';
import { getDbPool } from '@/lib/db';
import { Store } from '@/types/store';
import { Earthquake } from '@/types/disaster';
import { 
  hasRecentNotification, 
  recordNotificationLog, 
  generateEmergencyEmailHtml 
} from '@/lib/notification-service';
import { AffectedStoreSummary, NotificationLog } from '@/types/notification';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let forceSimulation = false;
    try {
      const body = await request.json();
      forceSimulation = !!body.forceSimulation;
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

    // 3. Evaluate each earthquake
    for (const eq of earthquakes) {
      // Calculate scientific radius
      const { dangerRadiusKm, warningRadiusKm } = calculateBmkgImpactRadius(eq.magnitude, eq.depthKm);

      // Collect affected stores
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

      // If simulated or actually has affected stores in danger
      for (const [branch, branchStores] of affectedByBranch.entries()) {
        const dangerStores = branchStores.filter(s => s.status === 'danger');
        
        // Dispatch alert if there are stores in danger, or high magnitude, or forced simulation
        if (dangerStores.length > 0 || (eq.magnitude >= 5.0 && branchStores.length > 0) || forceSimulation) {
          const isSent = !forceSimulation && await hasRecentNotification(eq.id, 'earthquake', branch);

          if (!isSent) {
            // Sort stores by distance
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

            log.email_html_preview = emailHtml;
            dispatchedLogs.push(log);
          }
        }
      }
    }

    // 4. Evaluate Heavy Rain / Flood Potential Simulation if requested or if rain exists
    if (forceSimulation && dispatchedLogs.length === 0) {
      // Create a demonstration flood alert for the branch
      const sampleBranch = stores[0]?.cabang || 'SIDOARJO';
      const sampleStores = stores.filter(s => s.cabang === sampleBranch).slice(0, 5).map(s => ({
        kode_toko: s.kode_toko,
        nama_toko: s.nama_toko,
        cabang: s.cabang,
        distance_km: 1.2,
        status: 'warning' as const,
        alamat: s.alamat,
        fr_type: s.fr_type,
      }));

      const floodLog = await recordNotificationLog({
        disasterId: `flood_sim_${Date.now()}`,
        disasterType: 'heavy_rain',
        channel: 'pwa_only',
        branch: sampleBranch,
        recipientContact: `pwa://dc-${sampleBranch.toLowerCase()}`,
        title: `🌧️ SIAGA HUJAN EKSTREM & BANJIR: Cabang ${sampleBranch}`,
        message: `Radar satelit cuaca mendeteksi presipitasi hujan ekstrem (intensitas > 25 mm/jam) di atas gerai cabang ${sampleBranch}. Segera aktifkan SOP peninggian barang dagang dan pasang tanggul banjir gerai.`,
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
      error: error.message || 'Worker execution failed'
    }, { status: 500 });
  }
}
