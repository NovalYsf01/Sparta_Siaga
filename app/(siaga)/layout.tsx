"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Store, StoreStatus } from "@/types/store";
import { Earthquake, DisasterFeedResponse } from "@/types/disaster";
import { RoleType, IncidentRecord, DamageReport } from "@/types/incident";
import {
  calculateIncidentStats,
} from "@/lib/incident-store";

import { assessStoreRisk } from "@/lib/haversine";
import { IncidentAppShell } from "@/components/layout/incident-app-shell";
import { SiagaProvider } from "@/components/layout/siaga-context";
import { StoreVerificationModal } from "@/components/incident/store-verification-modal";
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
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
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

  // Interaction & Dialog states
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isAffectedSheetOpen, setIsAffectedSheetOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
  const [monitoredBranch, setMonitoredBranch] = useState<string>("all");
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Load incidents from database API on mount
  useEffect(() => {
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

  // Spatial calculation engine
  const computedStores = useMemo(() => {
    const earthquakes = disasterData?.recentEarthquakes || [];

    return rawStores.map((store) => {
      const risk = assessStoreRisk(
        { latitude: store.latitude, longitude: store.longitude },
        earthquakes
      );

      return {
        ...store,
        status: risk.status,
        distanceFromDisasterKm: risk.distanceFromDisasterKm,
        nearestDisasterTitle: risk.nearestDisaster?.title,
        nearestDisasterMag: risk.nearestDisaster?.magnitude,
        nearestDisasterDepth: risk.nearestDisaster?.depth,
      };
    });
  }, [rawStores, disasterData]);

  // Dynamically feeding BMKG danger stores into operational incidents
  // has been REMOVED from the browser. The server daemon is the single
  // source of truth for creating auto-incidents based on BMKG events.


  // Read-only Background Polling (Browser is a consumer, not a worker)
  useEffect(() => {
    // 1. Notification State & Earthquake Feed (60 seconds)
    const fetchFastFeeds = async () => {
      try {
        const logsRes = await fetch("/api/notifications/logs?limit=50");
        if (logsRes.ok) {
          const logsJson = await logsRes.json();
          const lastRead = typeof window !== "undefined"
            ? localStorage.getItem("sparta_last_read_at")
            : null;
          const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;
          const unreadLogs = (logsJson.logs || []).filter((l: any) => {
            const sentTime = new Date(l.sent_at).getTime();
            return sentTime > lastReadTime && l.status !== "acknowledged";
          });
          
          if (unreadLogs.length > notificationCount) {
             playEmergencyChime(); // Play sound if new notification arrived
          }
          setNotificationCount(unreadLogs.length);
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

  // Risk metrics calculation
  const { dangerCount, warningCount, affectedStores } = useMemo(() => {
    let danger = 0;
    let warning = 0;
    const affected: Store[] = [];

    for (const store of computedStores) {
      if (store.status === "danger") {
        danger++;
        affected.push(store);
      } else if (store.status === "warning") {
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
      setFlyToTarget({ lat: eqOrLat, lng: maybeLng ?? 0, zoom: 9 });
    } else {
      setFlyToTarget({ lat: eqOrLat.latitude, lng: eqOrLat.longitude, zoom: 9 });
    }
  };

  const handleResetView = () => {
    setFlyToTarget({ lat: -2.548926, lng: 118.0148634, zoom: 5 });
  };

  // Workflow Handlers
  const handleOpenReportModal = () => {
    setIsManualModalOpen(true);
  };

  const handleSelectIncidentForDetail = (inc: IncidentRecord) => {
    setSelectedIncidentForAction(inc);
    if (inc.status === "in_maintenance" || inc.status === "investigating") {
      setIsMaintenanceModalOpen(true);
    } else {
      setIsVerificationModalOpen(true);
    }
  };

  // Confirmation of store condition
  const handleConfirmVerification = (
    incidentId: string,
    isDamaged: boolean,
    report?: Partial<DamageReport>
  ) => {
    const updated = incidents.map((inc) => {
      if (inc.id !== incidentId) return inc;

      const timestamp = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

      if (!isDamaged) {
        // Toko Aman -> Resolved immediately, moves to History!
        return {
          ...inc,
          status: "resolved" as const,
          progress: 100,
          verification: {
            confirmedBy: report?.confirmedBy || "Store Manager",
            confirmedAt: timestamp,
            isDamaged: false,
            notes: report?.notes || "Toko aman, operasional normal.",
          },
          timeline: [
            ...inc.timeline,
            {
              stage: "Verifikasi Selesai",
              label: "Toko Dikonfirmasi Aman",
              timestamp,
              actor: report?.confirmedBy || "Store Manager",
              notes: report?.notes,
            },
          ],
          updatedAt: new Date().toISOString(),
          closedAt: new Date().toISOString(),
        };
      } else {
        // Toko Mengalami Kerusakan -> Generate ticket & escalate to Sparta Maintenance!
        const ticketId = `SPM-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
          1000 + Math.random() * 9000
        )}`;

        return {
          ...inc,
          status: "investigating" as const,
          progress: 30,
          verification: {
            confirmedBy: report?.confirmedBy || "Store Manager",
            confirmedAt: timestamp,
            isDamaged: true,
            categories: report?.categories || ["Rak Barang"],
            severity: report?.severity || "Sedang",
            operationalStatus: report?.operationalStatus || "Buka Normal",
            notes: report?.notes,
            photos: report?.photos,
          },
          maintenanceTicket: {
            ticketId,
            assignedTechnician: "Penugasan Wilayah Sparta Maintenance",
            workDescription: `Pemeriksaan kerusakan ${report?.categories?.join(", ") || "fisik"}.`,
          },
          timeline: [
            ...inc.timeline,
            {
              stage: "Verifikasi Kerusakan",
              label: `Kerusakan Terkonfirmasi (${report?.severity || "Sedang"})`,
              timestamp,
              actor: report?.confirmedBy || "Store Manager",
              notes: report?.notes,
            },
            {
              stage: "Tiket Maintenance Dibuat",
              label: `Tiket ${ticketId} Diteruskan ke Tim Maintenance`,
              timestamp,
              actor: "Sistem Sparta Siaga",
            },
          ],
          updatedAt: new Date().toISOString(),
        };
      }
    });

    handleUpdateIncidents(updated);
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
    rawStores, computedStores, disasterData, loading, isRefreshing, loadInitialData,
    activeRole, setActiveRole, activeLayer, setActiveLayer,
    incidents, activeIncidents, archivedIncidents, incidentStats,
    handleUpdateIncidents, handleSelectIncidentForDetail, handleOpenReportModal,
    incidentOnly, setIncidentOnly, statusFilter, setStatusFilter,
    basemap, setBasemap, theme, handleToggleTheme,
    showRadar, setShowRadar, radarData, selectedStore, setSelectedStore,
    handleSelectStore, flyToTarget, setFlyToTarget, dangerCount, warningCount,
    handleResetView, handleFocusDisaster, selectedCategory, setSelectedCategory,
    setIsAffectedSheetOpen
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
      >
        {children}
      </IncidentAppShell>



      {/* DIALOGS, MODALS & SLIDING DRAWERS */}
      {/* Manual Incident Creation Modal */}
      <ManualIncidentModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        activeRole={activeRole}
        rawStores={rawStores}
        onConfirm={(data) => {
          const timestamp = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
          const newIncident: IncidentRecord = {
            id: `INC-MAN-${Date.now()}`,
            storeId: data.storeId,
            storeName: data.storeName,
            branch: data.branch,
            locationCity: data.locationCity,
            disasterType: data.disasterType,
            reportOrigin: "manual",
            tkpType: data.tkpType || "Toko",
            date: new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: "verifying",
            progress: 15,
            verification: {
              confirmedBy: activeRole,
              confirmedAt: timestamp,
              isDamaged: true,
              categories: data.categories,
              severity: data.severity,
              operationalStatus: data.operationalStatus,
              notes: data.notes
            },
            fieldPhotos: data.photos ?? [],
            timeline: [
              {
                stage: "Laporan Dibuat",
                label: "Laporan insiden / kerusakan manual",
                timestamp,
                actor: activeRole,
              }
            ]
          };
          const updated = [newIncident, ...incidents];
          handleUpdateIncidents(updated);
          setIsManualModalOpen(false);
        }}
      />

      {/* Verification Modal */}
      <StoreVerificationModal
        incident={selectedIncidentForAction}
        activeRole={activeRole}
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        onConfirmVerification={handleConfirmVerification}
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
        earthquake={disasterData?.latestBmkgEarthquake}
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
        onOpenPermissionDialog={() => setIsPermissionDialogOpen(true)}
        theme={theme}
        activeIncidents={incidents}
        onFlyToIncident={(incident) => {
          setIsNotificationCenterOpen(false);
          router.push("/monitoring");
          const allEqs = disasterData
            ? [
                ...(disasterData.latestBmkgEarthquake ? [disasterData.latestBmkgEarthquake] : []),
                ...(disasterData.recentEarthquakes || []),
              ]
            : [];
          const eq = allEqs.find((e) => e.id === incident.disaster_id);
          if (eq) {
            setFlyToTarget({ lat: eq.latitude, lng: eq.longitude, zoom: 10 });
          }
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
