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
} from "lucide-react";
import { RoleType } from "@/types/incident";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    bm: "Branch Manager",
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
        { id: "tracking", href: "/reports/tracking", label: "Tracking Laporan", icon: Activity },
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
        <div className={`flex flex-col justify-center py-4 shrink-0 border-b border-white/10 ${isSidebarCollapsed ? "items-center px-2" : "px-6"}`}>
          {!isSidebarCollapsed ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Image src="/brand/building_logo.png" alt="SPARTA Logo" width={38} height={38} className="shrink-0" />
                <div className="flex flex-col">
                  <span className="font-black text-lg tracking-wider text-white leading-none">SPARTA SIAGA</span>
                  <span className="text-[10px] font-medium text-blue-200 mt-1 tracking-wide leading-tight">
                    Sistem Integrasi Analisis &<br/>Peringatan Bencana
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <Image src="/brand/alfamart_logo.png" alt="Alfamart Logo" width={80} height={25} className="opacity-90" />
                <span className="text-[9px] font-semibold text-blue-300 uppercase tracking-widest">Internal System</span>
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
          {/* Left: Mobile hamburger or Universal Search */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`lg:hidden p-2 rounded-lg transition-colors border border-transparent ${
                isDark 
                  ? "text-slate-300 hover:bg-slate-800 hover:border-slate-700" 
                  : "text-slate-600 hover:bg-slate-100 hover:border-slate-300"
              }`}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Universal Search Bar */}
            <div
              onClick={onSearchClick}
              className={`flex-1 hidden sm:flex items-center gap-2.5 px-3.5 py-2 border rounded-lg cursor-pointer transition-colors text-sm max-w-md ${
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300"
                  : "bg-slate-100/80 hover:bg-slate-100 border-slate-200 text-slate-500"
              }`}
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate text-xs">Cari toko, lokasi, atau nomor laporan...</span>
              <kbd
                className={`hidden md:inline-block ml-auto text-[10px] border px-1.5 py-0.5 rounded font-mono ${
                  isDark ? "bg-slate-900 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-400"
                }`}
              >
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right: Date Range, Notifications, Role */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            {identity?.systemRole !== "ADMIN" && (
              <button
                onClick={() => {
                  if (onOpenReportModal) {
                    onOpenReportModal();
                  } else {
                    const event = new CustomEvent('open-manual-report');
                    window.dispatchEvent(event);
                  }
                }}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#1D5AA6] hover:bg-[#123B6D] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                Buat Laporan
              </button>
            )}
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden md:block mx-1"></div>




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
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
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
          className={`relative flex-1 overflow-y-auto pb-16 lg:pb-6 lg:px-6 transition-colors duration-200 flex flex-col ${
            isDark ? "bg-slate-900" : "bg-[#f5f7f9]"
          }`}
        >
          <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
            {children}
          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <nav
          className={`lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around z-40 px-2 shadow-lg transition-colors duration-200 ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              pathname === "/"
                ? "text-blue-500 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Beranda</span>
          </Link>

          <Link
            href="/monitoring"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              pathname.startsWith("/monitoring")
                ? "text-blue-500 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span>Peta</span>
          </Link>

          <Link
            href="/alerts"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors relative ${
              pathname.startsWith("/alerts")
                ? "text-blue-500 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span>Laporan</span>
            {(activeIncidentCount ?? 0) > 0 && (
              <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-red-500" />
            )}
          </Link>

          <Link
            href="/reports"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              pathname.startsWith("/reports")
                ? "text-blue-500 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <History className="w-5 h-5" />
            <span>Riwayat</span>
          </Link>

          <Link
            href="/settings"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              pathname.startsWith("/settings")
                ? "text-blue-500 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Pengaturan</span>
          </Link>
        </nav>
      </div>

      {/* MOBILE FULL SCREEN SLIDE-OVER MENU */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[3000] flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className={`relative w-72 flex flex-col h-full shadow-2xl p-5 border-r ${
            isDark ? "bg-slate-950 text-white border-slate-800" : "bg-white text-slate-900 border-slate-200"
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <div className="flex items-center gap-2">
                <Store className="w-6 h-6 text-red-500" />
                <span className="font-bold text-base">SPARTA Siaga</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 space-y-4">
              {navGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-2 mb-2">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isNavActive(item.href, pathname);
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          isActive 
                            ? isDark ? "bg-blue-600/20 text-blue-400 font-bold" : "bg-blue-50 text-blue-700 font-bold"
                            : isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${isActive ? (isDark ? "text-blue-400" : "text-blue-600") : ""}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-500 text-white">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
