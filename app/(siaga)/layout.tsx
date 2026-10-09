"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Info, X } from "lucide-react";
import { Store, StoreStatus } from "@/types/store";
import { Earthquake, DisasterFeedResponse } from "@/types/disaster";
import { RoleType, IncidentRecord } from "@/types/incident";
import {
  calculateIncidentStats,
} from "@/lib/incident-store";

import { assessStoreRisk } from "@/lib/haversine";
import { deriveStoreStatuses } from "@/lib/store-status";
import { IncidentAppShell } from "@/components/layout/incident-app-shell";
import { SiagaProvider } from "@/components/layout/siaga-context";
import { ManualIncidentModal } from "@/components/incident/manual-incident-modal";
import { MaintenanceTrackingModal } from "@/components/incident/maintenance-tracking-modal";
import { StoreDetailSheet } from "@/components/store/store-detail-sheet";
import { AffectedStoresSheet } from "@/components/disaster/affected-stores-sheet";
import { SpotlightSearch } from "@/components/search/spotlight-search";
import { NotificationCenterSheet } from "@/components/notifications/notification-center-sheet";
import { NotificationPermissionDialog } from "@/components/notifications/notification-permission-dialog";
import { IncidentDetailModal } from "@/components/notifications/incident-detail-modal";
import { SystemSettingsModal } from "@/components/settings/system-settings-modal";
import {
  triggerDesktopPopup,
  setupAudioAutoplayUnlocker,
  getNotificationPermission,
  getUserMonitoredBranch,
  hasUserDismissedPermissionPrompt,
  requestDesktopNotificationPermission,
} from "@/lib/desktop-notification";

export default function SiagaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [rawStores, setRawStores] = useState<Store[]>([]);
  const [disasterData, setDisasterData] = useState<DisasterFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Core App Shell & Role State
  const [activeRole, setActiveRole] = useState<RoleType>("ho_admin");
  const [activeLayer, setActiveLayer] = useState<"all" | "earthquake" | "stores" | "weather" | "flood">("all");

  // Persistent Incidents State
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedIncidentForAction, setSelectedIncidentForAction] = useState<IncidentRecord | null>(null);
  const [selectedReadOnlyIncident, setSelectedReadOnlyIncident] = useState<IncidentRecord | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Map and filter states
  const [incidentOnly, setIncidentOnly] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<"all" | StoreStatus>("all");
  const [basemap, setBasemap] = useState<"esri-dark" | "esri-light" | "osm">("esri-dark");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [showRadar, setShowRadar] = useState<boolean>(true);
  const [radarData, setRadarData] = useState<{ tileUrl: string; timeFormatted: string } | null>(null);

  // Requirement 3: Map Time Filter (24 Jam vs 3 Hari)
  const [mapTimeFilter, setMapTimeFilter] = useState<"24h" | "3d">("3d");

  // Requirement 7: True Event Focus Mode
  const [selectedEarthquake, setSelectedEarthquake] = useState<Earthquake | null>(null);

  // Interaction & Dialog states
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isAffectedSheetOpen, setIsAffectedSheetOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
  const [monitoredBranch, setMonitoredBranch] = useState<string>("all");
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Load incidents from database API on mount
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          const user = data.user || data;
          setCurrentUser(user);
          if (user.role || user.businessRole) {
            setActiveRole((user.role || user.businessRole) as RoleType);
          }
        }
      })
      .catch((err) => console.error("[Layout] Failed to load user session:", err));

    fetch("/api/incidents")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setIncidents(json.data);
      })
      .catch((err) => console.error("[Sparta Siaga] Failed to load incidents from DB:", err));
  }, []);

  // Sync incidents: POST new, PATCH existing
  const handleUpdateIncidents = useCallback(async (newIncidents: IncidentRecord[]) => {
    setIncidents(newIncidents);
    // Fire-and-forget: persist each changed/new incident to DB
    const currentIds = new Set(incidents.map((i) => i.id));
    for (const inc of newIncidents) {
      try {
        if (!currentIds.has(inc.id)) {
          // New incident → POST
          await fetch("/api/incidents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(inc),
          });
        } else {
          // Existing → PATCH
          await fetch(`/api/incidents/${inc.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(inc),
          });
        }
      } catch (err) {
        console.error(`[Sparta Siaga] Failed to sync incident ${inc.id}:`, err);
      }
    }
  }, [incidents]);

  // Role-based filtering
  const filteredIncidentsByRole = useMemo(() => {
    const isStoreManager = activeRole.startsWith("store_manager");
    if (!isStoreManager) return incidents;
    return incidents.filter((i) => i.branch === monitoredBranch);
  }, [incidents, activeRole, monitoredBranch]);

  // Stats summary calculation
  const incidentStats = useMemo(() => {
    return calculateIncidentStats(filteredIncidentsByRole);
  }, [filteredIncidentsByRole]);

  // Active vs History partition
  const activeIncidents = useMemo(() => {
    return filteredIncidentsByRole.filter((i) => i.status !== "resolved" && i.status !== "archived");
  }, [filteredIncidentsByRole]);

  const archivedIncidents = useMemo(() => {
    return filteredIncidentsByRole.filter((i) => i.status === "resolved" || i.status === "archived");
  }, [filteredIncidentsByRole]);

  // Initialize theme from localStorage & apply to document.documentElement
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("sparta_theme") as "dark" | "light" | null;
      const initialTheme = storedTheme || "light";
      setTheme(initialTheme);
      document.documentElement.classList.toggle("dark", initialTheme === "dark");
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("sparta_theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
      }
      return next;
    });
  }, []);

  // Initialize sound alert preference from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSound = localStorage.getItem("sparta_sound_alert");
      if (storedSound !== null) {
        setSoundEnabled(storedSound === "true");
      }
    }
  }, []);

  // Play subtle command-center emergency chime
  const playEmergencyChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.3); // D5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } catch {
      // Audio autoplay policy or unsupported
    }
  }, [soundEnabled]);

  // Initial data loading
  const loadInitialData = useCallback(async (isRefresh: boolean = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [storesRes, disastersRes, radarRes, floodsRes] = await Promise.all([
        fetch(`/api/stores${isRefresh ? "?refresh=true" : ""}`),
        fetch(`/api/disasters/earthquakes${isRefresh ? "?refresh=true" : ""}`),
        fetch(`/api/weather/radar`),
        fetch(`/api/disasters/floods`),
      ]);

      const storesJson = await storesRes.json();
      const disastersJson = await disastersRes.json();
      if (radarRes.ok) {
        const radarJson = await radarRes.json();
        setRadarData(radarJson);
      }
      
      let floodReports = [];
      if (floodsRes.ok) {
        const floodsJson = await floodsRes.json();
        floodReports = floodsJson.data || [];
      }

      setRawStores(storesJson.data || []);
      setDisasterData({
        ...disastersJson,
        floodReports, // Attach to disasterData
      });
    } catch (err) {
      console.error("[Sparta Siaga Dashboard] Error fetching initial data:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Notification permission setup
  useEffect(() => {
    setupAudioAutoplayUnlocker();
    if (typeof window !== "undefined") {
      const perm = getNotificationPermission();
      setPermissionState(perm);
      setMonitoredBranch(getUserMonitoredBranch());

      if (perm === "default" && !hasUserDismissedPermissionPrompt()) {
        const timer = setTimeout(() => {
          setIsPermissionDialogOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Keyboard shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleFlyToIncident = useCallback((incident: any) => {
    setIsNotificationCenterOpen(false);
    router.push("/monitoring");

    if (incident.disaster_type === "earthquake") {
      setActiveLayer("earthquake");
      const allEqs = [
        ...(disasterData?.activeEarthquakes || []),
        ...(disasterData?.recentEarthquakes || []),
      ];
      const eq = allEqs.find((e) => e.id === incident.disaster_id || (incident.disaster_id && e.id.includes(incident.disaster_id)));
      if (eq) {
        setSelectedEarthquake(eq); // Requirement 23: Activates Event Focus Mode!
        setFlyToTarget({ lat: eq.latitude, lng: eq.longitude, zoom: 11 });
      }
    } else if (incident.disaster_type === "heavy_rain" || incident.disaster_type === "flood") {
      setActiveLayer("weather");
      
      // Check if spatial data exists in floodReports
      const flood = disasterData?.floodReports?.find((f: any) => f.id === incident.disaster_id);
      if (flood) {
        setFlyToTarget({ lat: flood.lat, lng: flood.lng, zoom: 12 });
      } else {
        // Honest message
        toast.custom((t) => (
          <div className="flex items-start gap-2 bg-slate-900 dark:bg-slate-800 text-white px-3 py-3 rounded-lg shadow-md max-w-sm pointer-events-auto">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Visual area banjir belum tersedia</p>
              <p className="text-[10px] text-slate-300 mt-0.5">Data sumber hanya memberikan indikasi cuaca, bukan area spasial lapangan.</p>
            </div>
            <button onClick={() => toast.dismiss(t)} className="ml-auto p-1 shrink-0 text-slate-400 hover:text-white transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        ), { duration: 5000 });
        
        // We can still try to fly to the branch's center if we have stores
        if (incident.branch) {
          const branchStores = rawStores.filter(s => s.cabang?.toLowerCase() === incident.branch?.toLowerCase());
          if (branchStores.length > 0) {
            const avgLat = branchStores.reduce((acc, s) => acc + s.latitude, 0) / branchStores.length;
            const avgLng = branchStores.reduce((acc, s) => acc + s.longitude, 0) / branchStores.length;
            setFlyToTarget({ lat: avgLat, lng: avgLng, zoom: 11 });
          }
        }
      }
    }
  }, [router, disasterData, rawStores]);

  // Requirement 2 & 3: Time filtered earthquakes according to mapTimeFilter (24h or 3d <=72h)
  const timeFilteredEarthquakes = useMemo(() => {
    const allActive = disasterData?.activeEarthquakes || [];
    const maxHours = mapTimeFilter === "24h" ? 24 : 72;
    const maxAgeMs = maxHours * 60 * 60 * 1000;
    const now = Date.now();
    return allActive.filter((eq) => now - eq.timestamp <= maxAgeMs);
  }, [disasterData, mapTimeFilter]);

  // Requirement 7: Contextual earthquakes for spatial risk calculation (Event Focus Mode vs all active)
  const effectiveEarthquakesForRisk = useMemo(() => {
    if (selectedEarthquake) {
      return [selectedEarthquake];
    }
    return timeFilteredEarthquakes;
  }, [selectedEarthquake, timeFilteredEarthquakes]);

  // Index incidents by store ID and affected stores for 2D operational status derivation (Requirement 9 & 10)
  const incidentByStoreCode = useMemo(() => {
    const map = new Map<string, IncidentRecord>();
    for (const inc of incidents) {
      if (inc.storeId) {
        if (!map.has(inc.storeId) || map.get(inc.storeId)?.status === "resolved") {
          map.set(inc.storeId, inc);
        }
      }
      if (Array.isArray(inc.affectedStores)) {
        for (const aff of inc.affectedStores) {
          if (aff.kode_toko) {
            if (!map.has(aff.kode_toko) || map.get(aff.kode_toko)?.status === "resolved") {
              map.set(aff.kode_toko, inc);
            }
          }
        }
      }
    }
    return map;
  }, [incidents]);

  // 2-Dimensional Spatial & Operational calculation engine
  const computedStores = useMemo(() => {
    return rawStores.map((store) => {
      const risk = assessStoreRisk(
        { latitude: store.latitude, longitude: store.longitude },
        effectiveEarthquakesForRisk
      );

      const matchingIncident = incidentByStoreCode.get(store.kode_toko) || incidentByStoreCode.get(store.id);
      const { operationalStatus, visualStatus } = deriveStoreStatuses(risk.spatialRisk, matchingIncident);

      return {
        ...store,
        status: risk.spatialRisk,
        spatialRisk: risk.spatialRisk,
        operationalStatus,
        visualStatus,
        activeReportId: matchingIncident?.id,
        activeReportProgress: matchingIncident?.progress,
        distanceFromDisasterKm: risk.distanceFromEventKm,
        riskSourceEvent: risk.riskSourceEvent,
        nearestDisasterTitle: risk.riskSourceEvent?.title,
        nearestDisasterMag: risk.riskSourceEvent?.magnitude,
        nearestDisasterDepth: risk.riskSourceEvent?.depth,
      };
    });
  }, [rawStores, effectiveEarthquakesForRisk, incidentByStoreCode]);

  // Dynamically feeding BMKG danger stores into operational incidents
  // has been REMOVED from the browser. The server daemon is the single
  // source of truth for creating auto-incidents based on BMKG events.


  // Read-only Background Polling (Browser is a consumer, not a worker)
  useEffect(() => {
    // 1. Notification State & Earthquake Feed (60 seconds)
    const fetchFastFeeds = async () => {
      try {
        const logsRes = await fetch("/api/notifications/logs?limit=100");
        if (logsRes.ok) {
          const logsJson = await logsRes.json();
          const nowMs = Date.now();
          const MAX_ACTIVE_WINDOW_MS = 72 * 60 * 60 * 1000;

          const lastRead = typeof window !== "undefined"
            ? localStorage.getItem("sparta_last_read_at")
            : null;
          const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;

          let readIds = new Set<string>();
          if (typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem("sparta_read_notif_ids");
              if (raw) readIds = new Set(JSON.parse(raw));
            } catch (e) {}
          }

          // Requirements: Bell count counts strictly UNREAD + ACTIVE (<=72h) notifications
          // Disaster notifications are global informational alerts available to all authenticated users
          const activeUnreadLogs = (logsJson.logs || []).filter((l: any) => {
            const sentTime = new Date(l.sent_at).getTime();
            const isActive = (nowMs - sentTime) <= MAX_ACTIVE_WINDOW_MS;
            const isRead = readIds.has(l.id) || sentTime <= lastReadTime;

            return isActive && !isRead;
          });
          
          if (activeUnreadLogs.length > notificationCount) {
             playEmergencyChime(); // Play sound if new notification arrived
          }
          
          // Trigger popups for all unread logs (triggerDesktopPopup handles deduplication internally)
          activeUnreadLogs.forEach((l: any) => {
            let sourceLabel = "SPARTA Siaga";
            if (l.disaster_id?.includes("bmkg")) sourceLabel = "BMKG";
            else if (l.disaster_id?.includes("usgs")) sourceLabel = "USGS";
            else if (l.disaster_id?.includes("open-meteo") || l.disaster_type === "heavy_rain") sourceLabel = "Open-Meteo";

            triggerDesktopPopup({
              id: l.id,
              title: l.title,
              body: l.message,
              disasterType: l.disaster_type,
              ticketNumber: l.ticket_number,
              branch: l.branch,
              source: sourceLabel,
              forceBypassBranchFilter: true, // Disaster notifications are global informational alerts
              timestamp: new Date(l.sent_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
              isSimulation: l.disaster_id?.includes("sim"),
              onClickDetail: () => {
                setSelectedNotificationId(l.id);
                setIsNotificationCenterOpen(true);
              },
              onClickMap: () => {
                handleFlyToIncident(l);
              }
            });
          });
          setNotificationCount(activeUnreadLogs.length);
        }

        const disastersRes = await fetch("/api/disasters/earthquakes?refresh=true");
        if (disastersRes.ok) {
           const disastersJson = await disastersRes.json();
           setDisasterData(prev => prev ? ({
             ...disastersJson,
             floodReports: prev.floodReports || []
           }) : disastersJson);
        }
      } catch (err) {
        console.warn("[Fast Feeds Polling] Error:", err);
      }
    };

    // 2. Flood & Field Reports (3 minutes = 180s)
    const fetchFloodFeeds = async () => {
      try {
        const floodsRes = await fetch("/api/disasters/floods");
        if (floodsRes.ok) {
           const floodsJson = await floodsRes.json();
           setDisasterData(prev => {
             if (!prev) return prev;
             return { ...prev, floodReports: floodsJson.data || [] };
           });
        }
      } catch (err) {
        console.warn("[Flood Feeds Polling] Error:", err);
      }
    };

    // 3. Radar Metadata (5 minutes = 300s)
    const fetchRadarFeeds = async () => {
      try {
        const radarRes = await fetch("/api/weather/radar");
        if (radarRes.ok) {
          const radarJson = await radarRes.json();
          setRadarData(radarJson);
        }
      } catch (err) {
        console.warn("[Radar Feeds Polling] Error:", err);
      }
    };

    const fastTimer = setTimeout(fetchFastFeeds, 3000);
    const floodTimer = setTimeout(fetchFloodFeeds, 5000);
    const radarTimer = setTimeout(fetchRadarFeeds, 7000);

    const fastInterval = setInterval(fetchFastFeeds, 60000);
    const floodInterval = setInterval(fetchFloodFeeds, 180000);
    const radarInterval = setInterval(fetchRadarFeeds, 300000);

    return () => {
      clearTimeout(fastTimer);
      clearTimeout(floodTimer);
      clearTimeout(radarTimer);
      clearInterval(fastInterval);
      clearInterval(floodInterval);
      clearInterval(radarInterval);
    };
  }, [playEmergencyChime, notificationCount]);

  // Risk metrics calculation (Requirement 7: Danger / Monitor counts in focus context)
  const { dangerCount, warningCount, affectedStores } = useMemo(() => {
    let danger = 0;
    let warning = 0;
    const affected: Store[] = [];

    for (const store of computedStores) {
      if (
        store.visualStatus === "TERDAMPAK" ||
        store.visualStatus === "DALAM_PENANGANAN" ||
        store.spatialRisk === "PRIORITY_MONITOR"
      ) {
        danger++;
        affected.push(store);
      } else if (
        store.visualStatus === "PERLU_PERHATIAN" ||
        store.spatialRisk === "MONITOR"
      ) {
        warning++;
        affected.push(store);
      }
    }

    return { dangerCount: danger, warningCount: warning, affectedStores: affected };
  }, [computedStores]);

  const branchList = useMemo(() => {
    const branches = new Set<string>();
    rawStores.forEach((s) => {
      if (s.cabang) branches.add(s.cabang);
    });
    return Array.from(branches).sort();
  }, [rawStores]);

  const handleSelectStore = (store: Store | null) => {
    setSelectedStore(store);
    if (store) {
      setFlyToTarget({ lat: store.latitude, lng: store.longitude, zoom: 15 });
    }
  };

  const handleFocusDisaster = (eqOrLat: Earthquake | number, maybeLng?: number) => {
    setIncidentOnly(true);
    if (typeof eqOrLat === "number") {
      setFlyToTarget({ lat: eqOrLat, lng: maybeLng ?? 0, zoom: 10 });
    } else {
      setSelectedEarthquake(eqOrLat); // Requirement 7: Activates Event Focus Mode!
      setFlyToTarget({ lat: eqOrLat.latitude, lng: eqOrLat.longitude, zoom: 10 });
    }
  };

  const clearEventFocus = useCallback(() => {
    setSelectedEarthquake(null);
    setSelectedCategory(null);
  }, []);

  const handleResetView = () => {
    setSelectedEarthquake(null);
    setFlyToTarget({ lat: -2.548926, lng: 118.0148634, zoom: 5 });
  };

  // Workflow Handlers
  const handleOpenReportModal = () => {
    setIsManualModalOpen(true);
  };

  const handleSelectIncidentForDetail = (inc: IncidentRecord) => {
    setSelectedIncidentForAction(inc);
    setIsMaintenanceModalOpen(true);
  };

  // Progression updater for Maintenance
  const handleUpdateMaintenanceProgress = (
    incidentId: string,
    newProgress: number,
    notes?: string,
    technician?: string
  ) => {
    const timestamp = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

    const updated = incidents.map((inc) => {
      if (inc.id !== incidentId) return inc;

      const isResolved = newProgress >= 100;
      const nextStatus = isResolved ? ("resolved" as const) : ("in_maintenance" as const);

      return {
        ...inc,
        status: nextStatus,
        progress: newProgress,
        maintenanceTicket: {
          ...inc.maintenanceTicket,
          ticketId: inc.maintenanceTicket?.ticketId || `SPM-20260901-0042`,
          assignedTechnician: technician || inc.maintenanceTicket?.assignedTechnician,
          workDescription: notes || inc.maintenanceTicket?.workDescription,
          completedAt: isResolved ? timestamp : undefined,
        },
        timeline: [
          ...inc.timeline,
          {
            stage: isResolved ? "Selesai" : `Progress ${newProgress}%`,
            label: isResolved
              ? "Perbaikan Fisik Tuntas & Diverifikasi"
              : `Pengerjaan Fisik (${newProgress}%)`,
            timestamp,
            actor: technician || "Tim Sparta Maintenance",
            notes,
          },
        ],
        updatedAt: new Date().toISOString(),
        closedAt: isResolved ? new Date().toISOString() : inc.closedAt,
      };
    });

    handleUpdateIncidents(updated);
  };

  const contextValue = {
    rawStores, computedStores, disasterData, loading, isRefreshing,
    activeRole, setActiveRole, activeLayer, setActiveLayer,
    incidents, activeIncidents, archivedIncidents, incidentStats,
    handleUpdateIncidents, handleSelectIncidentForDetail, handleOpenReportModal,
    incidentOnly, setIncidentOnly, statusFilter, setStatusFilter,
    basemap, setBasemap, theme, handleToggleTheme,
    showRadar, setShowRadar, radarData, selectedStore, setSelectedStore,
    handleSelectStore, flyToTarget, setFlyToTarget, dangerCount, warningCount,
    handleResetView, handleFocusDisaster, selectedCategory, setSelectedCategory,
    setIsAffectedSheetOpen,
    mapTimeFilter, setMapTimeFilter,
    selectedEarthquake, setSelectedEarthquake, clearEventFocus,
  };

  return (
    <SiagaProvider value={contextValue}>
      <IncidentAppShell
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        unreadCount={notificationCount}
        activeIncidentCount={activeIncidents.length}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onSearchClick={() => setIsSearchOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenReportModal={handleOpenReportModal}
      >
        {children}
      </IncidentAppShell>



      {/* DIALOGS, MODALS & SLIDING DRAWERS */}
      {/* Manual Incident Creation Modal */}
      <ManualIncidentModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        activeRole={activeRole}
        currentUser={currentUser}
        rawStores={rawStores}
        activeEarthquakes={disasterData?.activeEarthquakes || []}
        onConfirm={async (data) => {
          const response = await fetch("/api/incidents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ disasterType: data.disasterType, storeId: data.storeId, locationCity: data.locationCity, description: data.notes, earthquakeEventId: data.earthquakeEventId }),
          });
          const payload = await response.json();
          if (!response.ok) {
            toast.error(payload.error || "Laporan tidak dapat dibuat");
            throw new Error(payload.error || "Laporan tidak dapat dibuat");
          }
          const created = payload.data as IncidentRecord;
          for (const photo of data.photos || []) {
            if (!photo.file) continue;
            const form = new FormData();
            form.set("file", photo.file);
            form.set("phase", "INITIAL");
            form.set("caption", photo.caption?.trim() || "Kondisi aktual toko");
            form.set("origin", photo.source === "camera" ? "CAMERA_SELF" : photo.reporterRelation === "received" ? "GALLERY_THIRD_PARTY" : "GALLERY_SELF");
            if (photo.thirdPartySourceName) form.set("thirdPartySourceName", photo.thirdPartySourceName);
            if (photo.thirdPartySourceDescription) form.set("thirdPartySourceDescription", photo.thirdPartySourceDescription);
            const upload = await fetch(`/api/incidents/${encodeURIComponent(created.id)}/evidence`, { method: "POST", body: form });
            if (!upload.ok) throw new Error((await upload.json()).error || "Bukti foto gagal diunggah");
          }
          const inspection = await fetch(`/api/incidents/${encodeURIComponent(created.id)}/inspection`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verificationLevel: "FIELD_VERIFIED", conditionNotes: data.notes }) });
          const inspectionPayload = await inspection.json();
          if (!inspection.ok) throw new Error(inspectionPayload.error || "Pemeriksaan tidak dapat diajukan");
          setIncidents((current) => [inspectionPayload.data, ...current.filter((item) => item.id !== created.id)]);
          setIsManualModalOpen(false);
          toast.success("Laporan diajukan ke Manager Branch");
        }}
      />

      {/* Maintenance Tracking Modal */}
      <MaintenanceTrackingModal
        incident={selectedIncidentForAction}
        activeRole={activeRole}
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        onUpdateProgress={handleUpdateMaintenanceProgress}
      />

      {/* Read-Only Incident Detail Modal (History) */}
      <MaintenanceTrackingModal
        incident={selectedReadOnlyIncident}
        activeRole={activeRole}
        isOpen={!!selectedReadOnlyIncident}
        onClose={() => setSelectedReadOnlyIncident(null)}
        onUpdateProgress={() => {}}
        isReadOnly={true}
      />

      {/* Store Detail Drawer */}
      <StoreDetailSheet
        store={selectedStore}
        onClose={() => setSelectedStore(null)}
        theme={theme}
      />

      {/* Affected Stores Sheet */}
      <AffectedStoresSheet
        isOpen={isAffectedSheetOpen}
        onClose={() => setIsAffectedSheetOpen(false)}
        earthquake={selectedEarthquake || disasterData?.latestBmkgEarthquake}
        affectedStores={affectedStores}
        theme={theme}
        onSelectStore={(store) => {
          setIsAffectedSheetOpen(false);
          handleSelectStore(store);
        }}
      />

      {/* Spotlight Universal Search */}
      <SpotlightSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        stores={computedStores}
        theme={theme}
        onSelectStore={handleSelectStore}
        onSelectBranch={(branchName) => {
          const branchStores = rawStores.filter(
            (s) => s.cabang?.toLowerCase() === branchName.toLowerCase()
          );
          if (branchStores.length > 0) {
            const avgLat = branchStores.reduce((acc, s) => acc + s.latitude, 0) / branchStores.length;
            const avgLng = branchStores.reduce((acc, s) => acc + s.longitude, 0) / branchStores.length;
            setIncidentOnly(false);
            setFlyToTarget({ lat: avgLat, lng: avgLng, zoom: 11 });
          }
        }}
      />

      {/* Notification Center */}
      <NotificationCenterSheet
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        selectedNotificationId={selectedNotificationId}
        onClearSelectedNotification={() => setSelectedNotificationId(null)}
        onOpenPermissionDialog={() => setIsPermissionDialogOpen(true)}
        theme={theme}
        activeIncidents={incidents}
        onFlyToIncident={handleFlyToIncident}
        onOpenReport={handleSelectIncidentForDetail}
        userRole={activeRole}
        userBranch={monitoredBranch}
        onUnreadCountChange={setNotificationCount}
        onMarkAllAsRead={() => {
          setNotificationCount(0);
        }}
        onNotificationRead={() => {
          setNotificationCount((prev) => Math.max(0, prev - 1));
        }}
        onWorkerDispatched={() => {
          setNotificationCount(0);
        }}
      />

      {/* Notification Permission Dialog */}
      <NotificationPermissionDialog
        isOpen={isPermissionDialogOpen}
        onClose={() => setIsPermissionDialogOpen(false)}
        onPermissionGranted={() => {
          setPermissionState(getNotificationPermission());
          setMonitoredBranch(getUserMonitoredBranch());
        }}
      />

      {/* System Settings Modal */}
      <SystemSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        permissionState={permissionState}
        onRequestPermission={async () => {
          const perm = await requestDesktopNotificationPermission();
          setPermissionState(perm);
        }}
        monitoredBranch={monitoredBranch}
        onSelectMonitoredBranch={(b) => {
          setMonitoredBranch(b);
          if (typeof window !== "undefined") {
            localStorage.setItem("sparta_monitored_branch", b);
          }
        }}
        branchList={branchList}
        soundEnabled={soundEnabled}
        onToggleSound={(en) => {
          setSoundEnabled(en);
          if (typeof window !== "undefined") {
            localStorage.setItem("sparta_sound_alert", String(en));
          }
        }}
        onTestSound={playEmergencyChime}
        theme={theme}
        onSelectTheme={(t) => {
          setTheme(t);
          setBasemap(t === "dark" ? "esri-dark" : "esri-light");
        }}
        basemap={basemap}
        onSelectBasemap={(bm) => setBasemap(bm)}
        showRadar={showRadar}
        onToggleRadar={(sr) => setShowRadar(sr)}
      />
    </SiagaProvider>
  );
}
