import { IncidentRecord, IncidentStats, DamageReport, MaintenanceTicket } from "@/types/incident";

const LOCAL_STORAGE_KEY = "sparta_sentinel_incidents_v2";

export const INITIAL_INCIDENTS: IncidentRecord[] = [
  {
    id: "INC-2026-0001",
    date: "1 Sep 2026",
    disasterType: "flood",
    storeId: "T001",
    storeName: "Toko Cibubur",
    branch: "Cabang Jakarta Timur",
    locationCity: "Jakarta",
    status: "in_maintenance",
    progress: 60,
    disasterMetadata: {
      place: "Sungai Cileungsi Meluap, Cibubur",
      time: "1 Sep 2026 06:30 WIB",
    },
    verification: {
      confirmedBy: "Budi Santoso (Store Manager)",
      confirmedAt: "1 Sep 2026 07:15 WIB",
      isDamaged: true,
      categories: ["Dinding/Struktur", "Kelistrikan/AC"],
      severity: "Sedang",
      operationalStatus: "Tutup Sementara",
      notes: "Genangan air masuk setinggi 40 cm ke area sales floor, panel listrik utama dimatikan darurat.",
    },
    maintenanceTicket: {
      ticketId: "SPM-20260901-0042",
      assignedTechnician: "Rahmat Hidayat (Tim Maintenance Cileungsi)",
      workDescription: "Pengeringan area toko menggunakan pompa alkon, pengecekan instalasi kabel chiller dan MCB.",
    },
    timeline: [
      { stage: "Laporan Masuk", label: "Peringatan Banjir BPBD", timestamp: "1 Sep 06:30", actor: "Sistem Sentinel" },
      { stage: "Verifikasi", label: "Toko Dikonfirmasi Rusak Sedang", timestamp: "1 Sep 07:15", actor: "SM Toko Cibubur", notes: "Air 40 cm, toko tutup sementara" },
      { stage: "Perbaikan", label: "Tiket Maintenance Aktif (60%)", timestamp: "1 Sep 09:30", actor: "Teknisi Rahmat", notes: "Penyedotan air selesai, inspeksi kabel AC" },
    ],
    createdAt: "2026-09-01T06:30:00Z",
    updatedAt: "2026-09-01T09:30:00Z",
  },

  {
    id: "INC-2026-0004",
    date: "8 Sep 2026",
    disasterType: "earthquake",
    storeId: "T004",
    storeName: "Toko Manado",
    branch: "Cabang Manado Malalayang",
    locationCity: "Manado",
    status: "in_maintenance",
    progress: 50,
    disasterMetadata: {
      magnitude: 6.1,
      depth: "14 km",
      coordinates: [1.4748, 124.8428],
      place: "Laut Maluku, 48 km Barat Daya Manado",
      time: "8 Sep 2026 11:22 WITA",
    },
    verification: {
      confirmedBy: "Claudio Paat (Store Manager)",
      confirmedAt: "8 Sep 2026 11:45 WITA",
      isDamaged: true,
      categories: ["Rak Barang", "Plafon"],
      severity: "Sedang",
      operationalStatus: "Buka Normal",
      notes: "Guncangan gempa merobohkan 3 rak gondola snack dan kosmetik, 2 lembar plafon gypsum copot.",
    },
    maintenanceTicket: {
      ticketId: "SPM-20260908-0104",
      assignedTechnician: "Vicky Kalalo",
      workDescription: "Penguatan baut anchor gondola ke lantai beton dan pemasangan rangka plafon baru.",
    },
    timeline: [
      { stage: "Laporan Masuk", label: "Gempa M 6.1 BMKG Terdeteksi", timestamp: "8 Sep 11:22", actor: "Sistem Sentinel InaTEWS" },
      { stage: "Verifikasi", label: "SM Konfirmasi Rak Roboh & Plafon Copot", timestamp: "8 Sep 11:45", actor: "SM Claudio Paat" },
      { stage: "Perbaikan", label: "Perbaikan Rangka Plafon 50%", timestamp: "8 Sep 15:00", actor: "Teknisi Vicky Kalalo" },
    ],
    createdAt: "2026-09-08T03:22:00Z",
    updatedAt: "2026-09-08T07:00:00Z",
  },

  {
    id: "INC-2026-0006",
    date: "12 Sep 2026",
    disasterType: "flood",
    storeId: "T006",
    storeName: "Toko Balikpapan",
    branch: "Cabang Balikpapan Baru",
    locationCity: "Balikpapan",
    status: "in_maintenance",
    progress: 70,
    disasterMetadata: {
      place: "Jl. MT Haryono, Balikpapan",
      time: "12 Sep 2026 05:40 WITA",
    },
    verification: {
      confirmedBy: "Hendro Saputro (Store Manager)",
      confirmedAt: "12 Sep 2026 06:15 WITA",
      isDamaged: true,
      categories: ["Dinding/Struktur"],
      severity: "Sedang",
      operationalStatus: "Buka Normal",
      notes: "Banjir bandang jalan raya masuk teras toko, lumpur tebal menutupi halaman parkir.",
    },
    maintenanceTicket: {
      ticketId: "SPM-20260912-0055",
      assignedTechnician: "Agus Pratama",
      workDescription: "Pembersihan lumpur saluran air depan dan pembuatan tanggul pasir sementara.",
    },
    timeline: [
      { stage: "Laporan Masuk", label: "Genangan MT Haryono 50 cm", timestamp: "12 Sep 05:40", actor: "Petabencana.id" },
      { stage: "Verifikasi", label: "SM Konfirmasi Masuk Teras Toko", timestamp: "12 Sep 06:15", actor: "SM Hendro Saputro" },
      { stage: "Perbaikan", label: "Pembersihan Lumpur & Tanggul 70%", timestamp: "12 Sep 09:30", actor: "Teknisi Agus" },
    ],
    createdAt: "2026-09-12T21:40:00Z",
    updatedAt: "2026-09-12T01:30:00Z",
  },
];

export function getStoredIncidents(): IncidentRecord[] {
  if (typeof window === "undefined") {
    return INITIAL_INCIDENTS;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_INCIDENTS));
      return INITIAL_INCIDENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_INCIDENTS;
  }
}

export function saveStoredIncidents(incidents: IncidentRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(incidents));
  } catch (err) {
    console.error("Failed to save incidents to localStorage", err);
  }
}

export function calculateIncidentStats(incidents: IncidentRecord[]): IncidentStats {
  const stats: IncidentStats = {
    total: incidents.length,
    theft: 0,
    fire: 0,
    earthquake: 0,
    flood: 0,
    wind: 0,
    other: 0,
    statusBreakdown: {
      resolved: 0,
      inMaintenance: 0,
      investigating: 0,
      verifying: 0,
      unhandled: 0,
    },
  };

  incidents.forEach((inc) => {
    // Count per disaster type
    if (inc.disasterType === "theft") stats.theft++;
    else if (inc.disasterType === "fire") stats.fire++;
    else if (inc.disasterType === "earthquake") stats.earthquake++;
    else if (inc.disasterType === "flood") stats.flood++;
    else if (inc.disasterType === "wind") stats.wind++;
    else stats.other++;

    // Count per status
    if (inc.status === "resolved" || inc.status === "archived") {
      stats.statusBreakdown.resolved++;
    } else if (inc.status === "in_maintenance") {
      stats.statusBreakdown.inMaintenance++;
    } else if (inc.status === "investigating") {
      stats.statusBreakdown.investigating++;
    } else if (inc.status === "verifying") {
      stats.statusBreakdown.verifying++;
    } else {
      stats.statusBreakdown.unhandled++;
    }
  });

  return stats;
}

export function mergeLiveDangerStoresIntoIncidents(
  currentIncidents: IncidentRecord[],
  dangerStores: any[]
): { updatedIncidents: IncidentRecord[]; addedCount: number } {
  let addedCount = 0;
  const existingStoreCodes = new Set(
    currentIncidents
      .filter((i) => i.status !== "resolved" && i.status !== "archived")
      .map((i) => i.storeId)
  );

  const newIncidents: IncidentRecord[] = [];

  for (const store of dangerStores) {
    if (!existingStoreCodes.has(store.kode_toko)) {
      existingStoreCodes.add(store.kode_toko);
      addedCount++;
      const todayStr = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      newIncidents.push({
        id: `INC-EQ-${store.kode_toko}-${Date.now().toString().slice(-4)}`,
        date: todayStr,
        disasterType: "earthquake",
        storeId: store.kode_toko,
        storeName: store.nama_toko,
        branch: store.cabang?.startsWith("Cabang") ? store.cabang : `Cabang ${store.cabang}`,
        locationCity: store.cabang,
        status: "verifying",
        progress: 15,
        disasterMetadata: {
          place: store.nearestDisasterTitle || "Pusat Gempa BMKG Terkini",
          magnitude: store.nearestDisasterMag,
          depth: store.nearestDisasterDepth,
          distanceKm: store.distanceFromDisasterKm,
          time: "Deteksi Baru Saja",
        },
        timeline: [
          {
            stage: "Laporan Masuk",
            label: `Toko Masuk Zona Bahaya Gempa M${store.nearestDisasterMag || "5+"}`,
            timestamp: "Baru saja",
            actor: "BMKG InaTEWS GIS Engine",
            notes: `Jarak dari episentrum: ${store.distanceFromDisasterKm} km`,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  if (addedCount === 0) {
    return { updatedIncidents: currentIncidents, addedCount: 0 };
  }

  const updatedIncidents = [...newIncidents, ...currentIncidents];
  return { updatedIncidents, addedCount };
}

