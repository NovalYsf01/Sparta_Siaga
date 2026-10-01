import React from "react";
import { toast } from "sonner";
import { ShieldAlert, CloudRain, Map, AlertTriangle, X } from "lucide-react";

/**
 * Global audio context reference with autoplay unlock mechanism
 */
let sharedAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;

/**
 * Initializes and unlocks AudioContext upon the first user interaction
 */
export function setupAudioAutoplayUnlocker(): void {
  if (typeof window === "undefined" || isAudioUnlocked) return;

  const unlock = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!sharedAudioContext) {
        sharedAudioContext = new AudioCtx();
      }
      if (sharedAudioContext.state === "suspended") {
        sharedAudioContext.resume();
      }
      isAudioUnlocked = true;
      ['click', 'keydown', 'touchstart'].forEach(e => {
        window.removeEventListener(e, unlock);
      });
    } catch {
      // ignore
    }
  };

  ['click', 'keydown', 'touchstart'].forEach(e => {
    window.addEventListener(e, unlock, { once: true });
  });
}

/**
 * Check if the browser supports Desktop / HTML5 Web Notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  try {
    const permission = await Notification.requestPermission();
    if (typeof window !== "undefined") {
      localStorage.setItem("sparta_notif_permission_prompted", "true");
    }
    return permission;
  } catch (err) {
    console.warn("[Desktop Notification] Error requesting permission:", err);
    return "denied";
  }
}

/**
 * Check if the user has already answered or dismissed the on-load permission prompt
 */
export function hasUserDismissedPermissionPrompt(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("sparta_notif_permission_prompted") === "true";
}

export function setUserDismissedPermissionPrompt(dismissed: boolean): void {
  if (typeof window === "undefined") return;
  if (dismissed) {
    localStorage.setItem("sparta_notif_permission_prompted", "true");
  } else {
    localStorage.removeItem("sparta_notif_permission_prompted");
  }
}

/**
 * Monitored Branch Preferences
 * "all" = HO Pusat (receives alerts for all 28 branches)
 * "SIDOARJO" = only receives popup alerts for Sidoarjo stores
 */
export function getUserMonitoredBranch(): string {
  if (typeof window === "undefined") return "all";
  return localStorage.getItem("sparta_monitored_branch") || "all";
}

export function setUserMonitoredBranch(branch: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("sparta_monitored_branch", branch);
}

/**
 * Sound Alert Preferences
 */
export function isSoundAlertEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("sparta_sound_alert_enabled") !== "false";
}

export function setSoundAlertEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("sparta_sound_alert_enabled", enabled ? "true" : "false");
}

/**
 * Play pleasant yet urgent emergency chime via Web Audio API
 */
export function playEmergencyAudioChime(): void {
  if (!isSoundAlertEnabled()) return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedAudioContext) {
      sharedAudioContext = new AudioCtx();
    }
    if (sharedAudioContext.state === "suspended") {
      sharedAudioContext.resume();
    }

    const ctx = sharedAudioContext;

    // Two-tone alert (A5 = 880Hz down to D5 = 587Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Audio autoplay restrictions or unsupported
  }
}

export interface EmergencyNotificationPayload {
  id: string;
  title: string;
  body: string;
  disasterType?: "earthquake" | "heavy_rain" | "flood" | "tsunami";
  ticketNumber?: string;
  branch?: string;
  source?: string;
  timestamp?: string;
  isSimulation?: boolean;
  onClickDetail?: () => void;
  onClickMap?: () => void;
  forceBypassBranchFilter?: boolean;
}

const poppedNotificationIds = new Set<string>();

/**
 * Triggers dual desktop notification:
 * 1. Native OS Pop-up banner (Windows / Mac / Linux Notification Center)
 * 2. In-App floating emergency toast popup on screen
 * 3. Audio chime
 */
export function triggerDesktopPopup(payload: EmergencyNotificationPayload): void {
  if (poppedNotificationIds.has(payload.id)) {
    return;
  }
  poppedNotificationIds.add(payload.id);

  // Check branch filter (Duty Officer branch assignment)
  const monitoredBranch = getUserMonitoredBranch();
  if (
    !payload.forceBypassBranchFilter &&
    monitoredBranch !== "all" &&
    payload.branch &&
    payload.branch.toUpperCase() !== monitoredBranch.toUpperCase()
  ) {
    // Alert is for another branch; suppress intrusive popup/chime for this specific laptop
    console.log(`[Desktop Notification] Filtered out for branch ${payload.branch} (Monitored: ${monitoredBranch})`);
    return;
  }

  // 1. Play sound chime
  playEmergencyAudioChime();

  // 2. Native OS Desktop Notification (bottom-right Windows Action Center)
  if (isNotificationSupported() && Notification.permission === "granted") {
    try {
      const notification = new Notification(payload.isSimulation ? `[SIMULASI] ${payload.title}` : payload.title, {
        body: payload.body,
        icon: "/favicon.ico",
        tag: payload.id,
        requireInteraction: true, // Keep banner on screen until operator clicks/dismisses
      });

      notification.onclick = () => {
        window.focus();
        if (payload.onClickDetail) payload.onClickDetail();
        notification.close();
      };
    } catch (err) {
      console.warn("[Desktop Notification] Native notification error:", err);
    }
  }

  // 3. In-App Pop-up Toast Banner (always visible inside dashboard)
  const isQuake = payload.disasterType === "earthquake" || payload.disasterType === "tsunami";
  const isSimulation = payload.isSimulation;

  toast.custom(
    (t) => (
      <div className="w-[360px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col relative pointer-events-auto animate-in slide-in-from-right-full">
        {/* Header */}
        <div className={`px-4 py-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 ${isSimulation ? 'bg-amber-50 dark:bg-amber-950/30' : (isQuake ? 'bg-red-50 dark:bg-red-950/30' : 'bg-blue-50 dark:bg-blue-950/30')}`}>
          {isSimulation ? (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          ) : isQuake ? (
            <ShieldAlert className="w-4 h-4 text-red-600" />
          ) : (
            <CloudRain className="w-4 h-4 text-blue-600" />
          )}
          <span className={`text-[11px] font-bold tracking-wider ${isSimulation ? 'text-amber-700' : (isQuake ? 'text-red-700' : 'text-blue-700')}`}>
            {isSimulation ? "SIMULASI • " : ""}
            {isQuake ? "GEMPA BUMI" : "HUJAN/BANJIR"}
          </span>
          <button 
            onClick={() => toast.dismiss(t)}
            className="ml-auto p-1 rounded hover:bg-black/5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug">
            {payload.title.replace("[SIMULATION] ", "").replace("🚨 ", "").replace("🌧️ ", "")}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
            {payload.body}
          </p>

          <div className="text-[10px] text-slate-400 mt-1 font-medium">
            {payload.timestamp || new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"} 
            {payload.source ? ` • ${payload.source}` : ""}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          {payload.onClickMap && (
            <button 
              onClick={() => {
                toast.dismiss(t);
                payload.onClickMap!();
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Map className="w-3.5 h-3.5" />
              Lihat di Peta
            </button>
          )}
          {payload.onClickDetail && (
            <button 
              onClick={() => {
                toast.dismiss(t);
                payload.onClickDetail!();
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              Lihat Detail
            </button>
          )}
        </div>
      </div>
    ),
    { duration: 10000, id: payload.id }
  );
}
