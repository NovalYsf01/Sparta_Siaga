"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
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
} from "lucide-react";
import { RoleType } from "@/types/incident";

export interface IncidentAppShellProps {
  activeTab: "dashboard" | "map" | "incidents" | "history" | "settings";
  onTabChange: (tab: "dashboard" | "map" | "incidents" | "history" | "settings") => void;
  activeRole: RoleType;
  onRoleChange: (role: RoleType) => void;
  unreadCount?: number;
  activeIncidentCount?: number;
  onOpenNotifications?: () => void;
  onSearchClick?: () => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  children: React.ReactNode;
}

export function IncidentAppShell({
  activeTab,
  onTabChange,
  activeRole,
  onRoleChange,
  unreadCount = 3,
  activeIncidentCount = 0,
  onOpenNotifications,
  onSearchClick,
  theme = "light",
  onToggleTheme,
  children,
}: IncidentAppShellProps) {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    id: "dashboard" | "map" | "incidents" | "history" | "settings";
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "map", label: "Monitoring Peta", icon: MapPin },
    { id: "incidents", label: "Laporan Kejadian", icon: ClipboardList, badge: activeIncidentCount > 0 ? activeIncidentCount.toString() : undefined },
    { id: "history", label: "History / Riwayat", icon: History },
    { id: "settings", label: "Pengaturan", icon: Settings },
  ];

  return (
    <div
      className={`flex h-screen w-full antialiased overflow-hidden font-sans transition-colors duration-200 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-800"
      }`}
    >
      {/* DESKTOP SIDEBAR */}
      <aside 
        className={`hidden lg:flex flex-col shrink-0 border-r z-30 transition-all duration-300 ${
          isSidebarCollapsed ? "w-20" : "w-64"
        } ${
          isDark 
            ? "bg-slate-950 text-slate-300 border-slate-800" 
            : "bg-white text-slate-700 border-slate-200"
        }`}
      >
        {/* Brand Header (h-16 to match main header) */}
        <div className={`flex items-center h-16 border-b shrink-0 ${isSidebarCollapsed ? "justify-center" : "justify-between px-4"} ${
          isDark ? "border-slate-800" : "border-slate-200"
        }`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3 whitespace-nowrap overflow-hidden">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-sm text-white shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className={`font-bold text-base leading-tight tracking-wide flex items-center gap-1.5 ${isDark ? "text-white" : "text-slate-900"}`}>
                  SPARTA <span className={`font-extrabold text-[10px] px-1 py-0.5 rounded ${isDark ? "text-red-400 bg-red-500/20" : "text-red-600 bg-red-100"}`}>SIAGA</span>
                </div>
                <div className={`text-[10px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Incident Management</div>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`p-2 rounded-lg transition-colors border border-transparent ${
              isDark 
                ? "text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-700" 
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-200"
            }`}
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className={`flex-1 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden ${isSidebarCollapsed ? "px-2" : "px-3"}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={`w-full relative flex items-center ${isSidebarCollapsed ? "justify-center px-0 py-3" : "justify-between px-3.5 py-2.5"} rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? isDark 
                      ? "bg-blue-600/20 text-blue-400 font-bold" 
                      : "bg-blue-50 text-blue-700 font-bold"
                    : isDark 
                      ? "text-slate-400 hover:bg-slate-800/80 hover:text-white" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"}`}>
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? (isDark ? "text-blue-400" : "text-blue-600") : "text-slate-400"}`} />
                  {!isSidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </div>
                {!isSidebarCollapsed && item.badge && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive 
                        ? isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700" 
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isSidebarCollapsed && item.badge && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 border border-slate-900" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {!isSidebarCollapsed && (
          <div className={`p-4 border-t text-center whitespace-nowrap overflow-hidden ${
            isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50/50"
          }`}>
            <p className={`text-xs font-medium leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Toko Aman, Operasional Lancar
              <br />
              <span className={`font-normal ${isDark ? "text-slate-500" : "text-slate-400"}`}>Satu Visi SPARTA RetailCare</span>
            </p>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP BAR / HEADER */}
        <header
          className={`h-16 flex items-center justify-between px-4 lg:px-8 shrink-0 z-40 border-b transition-colors duration-200 ${
            isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
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

          {/* Right: Date Range, Theme Switcher, Notification Bell, & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3.5">




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
                className={`flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg border transition-all text-left ${
                  isDark
                    ? "border-slate-700 hover:bg-slate-800 bg-slate-850"
                    : "border-slate-200 hover:bg-slate-50 bg-white"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border border-slate-700">
                  {roleLabels[activeRole].icon}
                </div>
                <div className="hidden sm:block">
                  <div className={`text-xs font-bold leading-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                    {roleLabels[activeRole].title}
                  </div>
                  <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {roleLabels[activeRole].subtitle}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isRoleDropdownOpen && (
                <div
                  className={`absolute right-0 mt-2 w-64 border rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 ${
                    isDark ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                  }`}
                >
                  <div
                    className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border-b ${
                      isDark ? "text-slate-400 border-slate-800" : "text-slate-400 border-slate-100"
                    }`}
                  >
                    Ganti Peran Pengguna (Simulasi)
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
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left text-xs transition-colors ${
                          isSelected
                            ? isDark
                              ? "bg-blue-600/30 text-blue-400 font-semibold"
                              : "bg-blue-50 text-blue-700 font-semibold"
                            : isDark
                            ? "hover:bg-slate-800 text-slate-300"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className={`p-1 rounded-md shrink-0 ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                          {roleLabels[roleKey].icon}
                        </div>
                        <div>
                          <div className="font-medium">{roleLabels[roleKey].title}</div>
                          <div className="text-[10px] text-slate-400">{roleLabels[roleKey].subtitle}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN BODY VIEW */}
        <main
          className={`flex-1 overflow-y-auto pb-16 lg:pb-0 transition-colors duration-200 ${
            isDark ? "bg-slate-950" : "bg-slate-50"
          }`}
        >
          {children}
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <nav
          className={`lg:hidden fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around z-40 px-2 shadow-lg transition-colors duration-200 ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <button
            onClick={() => onTabChange("dashboard")}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === "dashboard"
                ? "text-blue-500 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Beranda</span>
          </button>

          <button
            onClick={() => onTabChange("map")}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === "map"
                ? "text-blue-500 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span>Peta</span>
          </button>

          <button
            onClick={() => onTabChange("incidents")}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors relative ${
              activeTab === "incidents"
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
          </button>

          <button
            onClick={() => onTabChange("history")}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === "history"
                ? "text-blue-500 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <History className="w-5 h-5" />
            <span>Riwayat</span>
          </button>

          <button
            onClick={() => onTabChange("settings")}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              activeTab === "settings"
                ? "text-blue-500 font-bold"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Pengaturan</span>
          </button>
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

            <nav className="flex-1 py-4 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
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
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
