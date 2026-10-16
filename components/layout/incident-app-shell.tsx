"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  Activity,
  History,
  Settings,
  Bell,
  Search,
  Calendar,
  ShieldAlert,
  Store,
  Wrench,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  UserCog,
  MoreHorizontal,
} from "lucide-react";
import { RoleType } from "@/types/incident";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";

export interface IncidentAppShellProps {
  activeRole: RoleType;
  onRoleChange: (role: RoleType) => void;
  unreadCount?: number;
  activeIncidentCount?: number;
  onOpenNotifications?: () => void;
  onSearchClick?: () => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  onOpenReportModal?: () => void;
  children: React.ReactNode;
}

export function IncidentAppShell({
  activeRole,
  onRoleChange,
  unreadCount = 3,
  activeIncidentCount = 0,
  onOpenNotifications,
  onSearchClick,
  theme = "light",
  onToggleTheme,
  onOpenReportModal,
  children,
}: IncidentAppShellProps) {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [identity, setIdentity] = useState<{
    id: string;
    nik?: string | null;
    name: string;
    avatarUrl?: string | null;
    role?: string | null;
    businessRole?: string | null;
    branch?: string | null;
    systemRole: string;
    scope?: string | null;
  } | null>(null);
  const pathname = usePathname();

  const businessRoleDisplayMap: Record<string, string> = {
    ho_admin: "HO Admin",
    gm_ho: "GM HO",
    sm_ho: "SM HO",
    bm: "BnM Manajer",
    bnm: "BnM",
    bbc: "BBC",
    bmc: "BMC",
    bec: "BEC",
    bes: "BES",
    bms: "BMS",
    tim_toko: "Tim Toko",
    tim_maintenance: "Sparta Maintenance",
    tim_office: "Tim Office",
    tim_warehouse: "Tim Warehouse",
    sparta_maintenance: "Sparta Maintenance",
    store_manager_affected: "Store Manager",
    store_manager_normal: "Store Manager",
  };

  const getRoleSubtitle = (user: typeof identity) => {
    if (!user) return "";
    if (user.systemRole === "ADMIN") {
      return "System Administrator";
    }
    const business = user.businessRole 
      ? (businessRoleDisplayMap[user.businessRole] || user.businessRole) 
      : "User";
    const loc = user.scope === "HO" ? "Head Office" : (user.branch || "Cabang");
    return `${business} • ${loc}`;
  };

  const getPageTitle = (currentPath: string) => {
    if (currentPath === "/") return "Ringkasan Operasional";
    if (currentPath.startsWith("/monitoring")) return "Peta Monitoring Spasial";
    if (currentPath.startsWith("/alerts")) return "Event & Deteksi Bencana";
    if (currentPath.startsWith("/reports/tracking")) return "Tracking Alur Penanganan";
    if (currentPath.startsWith("/reports/history")) return "Riwayat Laporan Historis";
    if (currentPath.startsWith("/reports/shared-queue")) return "Penugasan";
    if (currentPath.startsWith("/reports")) return "Pusat Laporan Kejadian";
    if (currentPath.startsWith("/settings")) return "Pengaturan Sistem";
    if (currentPath.startsWith("/admin/facilities")) return "Master Fasilitas";
    if (currentPath.startsWith("/admin/reconciliation")) return "Rekonsiliasi Gempa";
    if (currentPath.startsWith("/admin")) return "Manajemen User & Hak Akses";
    return "Sistem Mitigasi";
  };

  // Lock body scroll when mobile Lainnya bottom sheet is open
  React.useEffect(() => {
    if (isMoreSheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMoreSheetOpen]);

  // Close sheet on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMoreSheetOpen) {
        setIsMoreSheetOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMoreSheetOpen]);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setIdentity(data.user || data);
        }
      })
      .catch(() => {});
  }, []);

  const isDark = theme === "dark";
  const isHoViewer = identity?.scope === "HO" && identity?.systemRole !== "ADMIN";
  const pageTitle = getPageTitle(pathname);


  const roleLabels: Record<RoleType, { title: string; subtitle: string; icon: React.ReactNode }> = {
    ho_admin: {
      title: "Admin HO",
      subtitle: "Head Office Command Center",
      icon: <ShieldAlert className="w-4 h-4 text-red-500" />,
    },
    store_manager_affected: {
      title: "SM Toko Cibubur",
      subtitle: "Store Manager (Terdampak)",
      icon: <Store className="w-4 h-4 text-amber-500" />,
    },
    store_manager_normal: {
      title: "SM Toko Bandung",
      subtitle: "Store Manager (Aman)",
      icon: <Store className="w-4 h-4 text-emerald-500" />,
    },
    sparta_maintenance: {
      title: "Sparta Maintenance",
      subtitle: "Tim Fasilitas & Perbaikan",
      icon: <Wrench className="w-4 h-4 text-blue-500" />,
    },
  };

  interface NavItem {
    id: string;
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  interface NavGroup {
    title: string;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      title: "Utama",
      items: [
        { id: "dashboard", href: "/", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Monitoring",
      items: [
        { id: "map", href: "/monitoring", label: "Peta Monitoring", icon: MapPin },
        { id: "incidents", href: "/alerts", label: "Event Bencana", icon: Bell },
      ],
    },
    {
      title: "Pelaporan",
      items: [
        { id: "history", href: "/reports", label: "Laporan Kejadian", icon: ClipboardList, badge: activeIncidentCount > 0 ? activeIncidentCount.toString() : undefined },
        ...(!isHoViewer ? [{ id: "tracking", href: "/reports/tracking", label: "Tracking Laporan", icon: Activity }] : []),
        { id: "history-browse", href: "/reports/history", label: "Riwayat Laporan", icon: History },
      ],
    },
    {
      title: "Sistem",
      items: [
        { id: "settings", href: "/settings", label: "Pengaturan", icon: Settings },
      ],
    },
  ];

  if (identity?.systemRole === "ADMIN") {
    navGroups.push({
      title: "Administrasi",
      items: [
        { id: "user-management", href: "/admin/users", label: "Manajemen User & Role", icon: ShieldAlert },
        { id: "location-management", href: "/admin/facilities", label: "Data Fasilitas", icon: Store },
      ],
    });
  }

  const isNavActive = (href: string, currentPath: string) => {
    if (href === "/reports") return currentPath === "/reports";
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  return (
    <div
      className={`flex h-screen w-full antialiased overflow-hidden font-sans transition-colors duration-200 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-800"
      }`}
    >
      {/* DESKTOP SIDEBAR */}
      <aside 
        className={`hidden lg:flex flex-col shrink-0 border-r-0 z-30 transition-all duration-300 ${
          isSidebarCollapsed ? "w-20" : "w-[260px]"
        } bg-[#123B6D] text-white shadow-lg`}
      >
        {/* Brand Header */}
        <div className={`flex flex-col justify-center py-5 shrink-0 border-b border-white/10 ${isSidebarCollapsed ? "items-center px-2" : "px-5"}`}>
          {!isSidebarCollapsed ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Image src="/brand/building_logo.png" alt="Logo SPARTA SIAGA" width={44} height={44} className="h-11 w-11 shrink-0 object-contain" />
                <div className="min-w-0">
                  <span className="block text-[16px] font-bold tracking-tight text-white leading-tight">SPARTA SIAGA</span>
                  <span className="mt-1 block text-[10px] leading-[1.4] text-blue-100/80">
                    Sistem Integrasi Analisis &amp; Peringatan Bencana
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <Image src="/brand/alfamart_logo.png" alt="Alfamart" width={88} height={30} className="h-7 w-auto object-contain" />
                <span className="text-[9px] font-medium uppercase tracking-wider text-blue-100/60">Internal</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Image src="/brand/building_logo.png" alt="SPARTA" width={32} height={32} />
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className={`flex-1 py-6 space-y-6 overflow-y-auto overflow-x-hidden ${isSidebarCollapsed ? "px-2" : "px-4"}`}>
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              {!isSidebarCollapsed && (
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#EAF2FB]/50 mb-2 px-2">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = isNavActive(item.href, pathname);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`w-full relative flex items-center ${isSidebarCollapsed ? "justify-center px-0 py-3 rounded-xl" : "justify-between px-4 py-2.5 rounded-lg"} text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#1D5AA6] text-white shadow-sm border border-white/10"
                        : "text-blue-100 hover:bg-white/10 hover:text-white border border-transparent"
                    }`}
                  >
                    <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#F6C800]" : "text-blue-200"}`} />
                      {!isSidebarCollapsed && <span className="whitespace-nowrap font-medium">{item.label}</span>}
                    </div>
                    {!isSidebarCollapsed && item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isActive 
                            ? "bg-[#D9272E] text-white" 
                            : "bg-[#D9272E] text-white"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isSidebarCollapsed && item.badge && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#D9272E]" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Toggle Button (Moved from Header for better layout) */}
        <div className="p-4 mt-auto border-t border-white/10">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-start px-4"} py-2 rounded-lg transition-colors text-blue-200 hover:bg-white/10 hover:text-white`}
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
            {!isSidebarCollapsed && <span className="ml-3 text-sm font-medium">Tutup Sidebar</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP BAR / HEADER */}
        <header
          className={`h-16 flex items-center justify-between px-6 lg:px-8 shrink-0 z-40 border-b transition-colors duration-200 ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          {/* Left: Mobile Title (no duplicate hamburger) & Desktop Breadcrumbs */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Mobile Header Title */}
            <div className="lg:hidden flex items-center gap-2.5 min-w-0">
              <Image src="/brand/building_logo.png" alt="SPARTA" width={28} height={28} className="shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {getPageTitle(pathname)}
                </h1>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block leading-tight">
                  SPARTA SIAGA
                </span>
              </div>
            </div>

            {/* Desktop Breadcrumbs (SPARTA Enterprise Style) */}
            <div className="hidden xl:flex items-center gap-2 text-xs shrink-0">
              <span className="font-bold text-[#123B6D] dark:text-blue-400">SPARTA SIAGA</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{pageTitle}</span>
            </div>

            {/* Universal Search Bar */}
            <div
              onClick={onSearchClick}
              className={`hidden md:flex items-center gap-2.5 px-3.5 py-2 border rounded-lg cursor-pointer transition-colors text-sm max-w-sm w-full ${
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300"
                  : "bg-slate-100/80 hover:bg-slate-100 border-slate-200 text-slate-500"
              }`}
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate text-xs">{pathname.startsWith("/monitoring") ? "Pencarian toko, DC, atau kejadian..." : pathname.startsWith("/reports") ? "Cari laporan dan lokasi..." : "Cari laporan, toko, atau lokasi..."}</span>
              <kbd
                className={`hidden md:inline-block ml-auto text-[10px] border px-1.5 py-0.5 rounded font-mono ${
                  isDark ? "bg-slate-900 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-400"
                }`}
              >
                Ctrl K
              </kbd>
            </div>
          </div>

          {/* Right: PWA Install, Buat Laporan, Notifications, Role */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden 2xl:block"><PwaInstallPrompt variant="compact" /></div>

            {identity?.systemRole !== "ADMIN" && !isHoViewer && (
              <button
                onClick={() => {
                  if (onOpenReportModal) {
                    onOpenReportModal();
                  } else {
                    const event = new CustomEvent('open-manual-report');
                    window.dispatchEvent(event);
                  }
                }}
                className="hidden lg:flex items-center gap-2 px-3.5 py-2 bg-[#1D5AA6] hover:bg-[#123B6D] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors min-h-[38px]"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Buat Laporan</span>
              </button>
            )}
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden md:block mx-0.5"></div>





            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className={`relative p-2 rounded-lg transition-colors ${
                isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
              }`}
              aria-label="Notifikasi"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Active Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className={`flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full border transition-all text-left ${
                  isDark
                    ? "border-slate-700 hover:bg-slate-800 bg-slate-900"
                    : "border-slate-200 hover:bg-slate-50 bg-white"
                }`}
              >
                {identity?.avatarUrl ? (
                  <img src={identity.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1D5AA6] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border border-blue-500">
                    {identity?.name ? identity.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <div className="hidden sm:block max-w-[140px]">
                  <div className={`text-xs font-bold truncate leading-tight ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                    {identity ? identity.name : "Memuat..."}
                  </div>
                  <div className={`text-[10px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {getRoleSubtitle(identity)}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isRoleDropdownOpen && (
                <div
                  className={`absolute right-0 mt-2 w-72 border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                  }`}
                >
                  <div className={`p-4 flex items-center gap-3 border-b ${isDark ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50"}`}>
                    {identity?.avatarUrl ? (
                      <img src={identity.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#1D5AA6] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm border-2 border-white dark:border-slate-700">
                        {identity?.name ? identity.name.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <div className="font-bold text-sm text-[#1D5AA6] dark:text-blue-400 truncate">{identity ? identity.name : "Memuat..."}</div>
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">{identity?.nik || "-"}</div>
                      <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">
                        {getRoleSubtitle(identity)}
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <Link
                      href="/settings"
                      onClick={() => setIsRoleDropdownOpen(false)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${
                        isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <UserCog className="w-4 h-4 text-slate-400" />
                      Profil Saya
                    </Link>

                    {process.env.NEXT_PUBLIC_ENABLE_ROLE_SIMULATION === "true" && (
                      <div className="mt-2 mb-1">
                        <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-t ${isDark ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-100"}`}>
                          Simulasi Dev Role
                        </div>
                        {(Object.keys(roleLabels) as RoleType[]).map((roleKey) => {
                          const isSelected = activeRole === roleKey;
                          return (
                            <button
                              key={roleKey}
                              onClick={() => {
                                onRoleChange(roleKey);
                                setIsRoleDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                                isSelected
                                  ? isDark
                                    ? "bg-blue-900/30 text-blue-400 font-semibold"
                                    : "bg-blue-50 text-blue-700 font-semibold"
                                  : isDark
                                  ? "hover:bg-slate-800 text-slate-400"
                                  : "hover:bg-slate-50 text-slate-600"
                              }`}
                            >
                              <div className={`p-1.5 rounded-md shrink-0 ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                                {roleLabels[roleKey].icon}
                              </div>
                              <div>
                                <div className="font-medium">{roleLabels[roleKey].title}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className={`p-2 border-t ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"}`}>
                    <button
                      onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST' });
                        window.location.href = '/login';
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-colors text-red-600 dark:text-red-400 ${
                        isDark ? "hover:bg-red-950/50" : "hover:bg-red-50"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN BODY VIEW */}
        <main
          className={`relative flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-6 lg:px-5 transition-colors duration-200 flex flex-col ${
            isDark ? "bg-slate-900" : "bg-[#f5f7fa]"
          }`}
        >
          <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
            {children}
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR (antislop-layoutmobile) */}
        <nav
          className={`lg:hidden fixed bottom-0 left-0 right-0 h-16 safe-area-bottom border-t flex items-center justify-around z-40 px-1 shadow-lg transition-colors duration-200 ${
            isDark ? "bg-slate-900/95 border-slate-800 backdrop-blur-md" : "bg-white/95 border-slate-200 backdrop-blur-md"
          }`}
        >
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-colors min-h-[44px] min-w-[52px] ${
              pathname === "/"
                ? "text-[#1D5AA6] dark:text-blue-400 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Beranda</span>
          </Link>

          <Link
            href="/reports"
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-colors min-h-[44px] min-w-[52px] ${
              pathname === "/reports"
                ? "text-[#1D5AA6] dark:text-blue-400 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span>Laporan</span>
          </Link>

          <Link
            href="/monitoring"
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-colors relative min-h-[44px] min-w-[52px] ${
              pathname.startsWith("/monitoring")
                ? "text-[#1D5AA6] dark:text-blue-400 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span>Peta</span>
            {(activeIncidentCount ?? 0) > 0 && (
              <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </Link>

          <Link
            href="/alerts"
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-colors min-h-[44px] min-w-[52px] ${
              pathname.startsWith("/alerts")
                ? "text-[#1D5AA6] dark:text-blue-400 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Bell className="w-5 h-5" />
            <span>Event</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsMoreSheetOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-colors min-h-[44px] min-w-[52px] ${
              isMoreSheetOpen || pathname.startsWith("/alerts") || pathname.startsWith("/reports/tracking") || pathname.startsWith("/reports/history") || pathname.startsWith("/settings") || pathname.startsWith("/admin")
                ? "text-[#1D5AA6] dark:text-blue-400 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
            aria-expanded={isMoreSheetOpen}
            aria-label="Buka Menu Lainnya"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>Lainnya</span>
          </button>
        </nav>
      </div>

      {/* MOBILE "LAINNYA" ACCESSIBLE BOTTOM SHEET (antislop-layoutmobile & antislop-human) */}
      {isMoreSheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[3000] flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Menu Navigasi Lainnya"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMoreSheetOpen(false)}
          />

          {/* Bottom Sheet Card */}
          <div className="relative w-full rounded-t-2xl shadow-2xl p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Image src="/brand/building_logo.png" alt="SPARTA Logo" width={28} height={28} className="shrink-0" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    Menu & Akses Sistem
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block">
                    SPARTA SIAGA • Ekosistem Terpadu
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreSheetOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current User Info Card */}
            {identity && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1D5AA6] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {identity.name ? identity.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {identity.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {getRoleSubtitle(identity)}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Grid / List */}
            <div className="mt-4 space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2 block">
                  Alur Laporan & Penanganan
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/alerts"
                    onClick={() => setIsMoreSheetOpen(false)}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-xs font-semibold col-span-2"
                  >
                    <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <div>Event Bencana & Deteksi</div>
                      <div className="text-[10px] text-slate-400 font-normal">Notifikasi gempa BMKG & cuaca ekstrem</div>
                    </div>
                  </Link>

                  <Link
                    href="/reports/tracking"
                    onClick={() => setIsMoreSheetOpen(false)}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-xs font-semibold"
                  >
                    <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Tracking Alur</span>
                  </Link>

                  <Link
                    href="/reports/history"
                    onClick={() => setIsMoreSheetOpen(false)}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-xs font-semibold"
                  >
                    <History className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Riwayat Laporan</span>
                  </Link>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2 block">
                  Pengaturan & Akun
                </span>
                <div className="space-y-1.5">
                  <Link
                    href="/settings"
                    onClick={() => setIsMoreSheetOpen(false)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-semibold min-h-[44px]"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Pengaturan Sistem</span>
                    </div>
                  </Link>

                  {identity?.systemRole === "ADMIN" && (
                    <div className="space-y-1.5">
                      <Link
                        href="/admin/users"
                        onClick={() => setIsMoreSheetOpen(false)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-semibold min-h-[44px]"
                      >
                        <div className="flex items-center gap-2.5">
                          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Manajemen User & Hak Akses</span>
                        </div>
                      </Link>
                      <Link
                        href="/admin/facilities"
                        onClick={() => setIsMoreSheetOpen(false)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-semibold min-h-[44px]"
                      >
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>Data Fasilitas (Toko & DC)</span>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Install PWA Prompt */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <PwaInstallPrompt variant="compact" className="w-full justify-center" />
              </div>

              {/* Logout Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    window.location.href = '/login';
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition-colors min-h-[44px]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  Keluar dari Sesi (Logout)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

