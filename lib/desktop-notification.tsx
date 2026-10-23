import React from "react";
import { toast } from "sonner";
import { ShieldAlert, CloudRain, Map, AlertTriangle, X } from "lucide-react";
import {
  cleanDisplayTitle,
  cleanDisplayText,
  formatNotificationWibTimestamp,
} from "./display-formatters";

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
    if (permission === "granted") {
      try {
        const { registerPushSubscription } = await import("./pwa-push-client");
        await registerPushSubscription();
      } catch (pushErr) {
        console.warn("[Desktop Notification] Push registration sync warning:", pushErr);
      }
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
  tag?: string;
  timestamp?: string;
  isSimulation?: boolean;
  onClickDetail?: () => void;
  onClickMap?: () => void;
  forceBypassBranchFilter?: boolean;
  suppressNativeNotification?: boolean;
}

const poppedNotificationIds = new Set<string>();

/**
 * Triggers dual notification:
 * 1. Native OS Pop-up banner (via ServiceWorker or Notification API, if not already shown via push)
 * 2. In-App floating emergency toast popup on screen (with responsive touch targets)
 * 3. Audio chime
 */
export function triggerDesktopPopup(payload: EmergencyNotificationPayload): void {
  const dedupKey = payload.tag || payload.id;
  if (poppedNotificationIds.has(dedupKey)) {
    return;
  }
  poppedNotificationIds.add(dedupKey);

  // Check branch filter (Duty Officer branch assignment)
  const monitoredBranch = getUserMonitoredBranch();
  if (
    !payload.forceBypassBranchFilter &&
    monitoredBranch !== "all" &&
    payload.branch &&
    payload.branch.toUpperCase() !== monitoredBranch.toUpperCase()
  ) {
    // Alert is for another branch; suppress intrusive popup/chime for this specific device
    console.log(`[Desktop Notification] Filtered out for branch ${payload.branch} (Monitored: ${monitoredBranch})`);
    return;
  }

  // 1. Play sound chime
  playEmergencyAudioChime();

  // 2. Native OS Desktop/Mobile Notification (only when not suppressed by Web Push receiver)
  if (!payload.suppressNativeNotification && isNotificationSupported() && Notification.permission === "granted") {
    const notifTitle = payload.isSimulation ? `[SIMULASI] ${payload.title}` : payload.title;
    const notifTag = payload.tag || `earthquake-${payload.id}`;

    // Prefer ServiceWorker showNotification for cross-platform compatibility (Android PWA + Desktop)
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(notifTitle, {
          body: payload.body,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-192x192.png",
          tag: notifTag,
          requireInteraction: true,
          data: {
            url: payload.onClickMap ? "/monitoring" : "/",
          },
        }).catch(() => {
          // Fallback to window Notification constructor
          try {
            new Notification(notifTitle, {
              body: payload.body,
              icon: "/icons/icon-192x192.png",
              tag: notifTag,
            });
          } catch {
            // Handled
          }
        });
      }).catch(() => {});
    } else {
      try {
        const notification = new Notification(notifTitle, {
          body: payload.body,
          icon: "/icons/icon-192x192.png",
          tag: notifTag,
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          if (payload.onClickDetail) payload.onClickDetail();
          notification.close();
        };
      } catch {
        // Handled
      }
    }
  }

  // 3. In-App Pop-up Toast Banner (always visible inside dashboard, antislop-ui responsive layout)
  const isQuake = payload.disasterType === "earthquake" || payload.disasterType === "tsunami";
  const displayTitle = cleanDisplayTitle(payload.title);
  const displayBody = cleanDisplayText(payload.body);
  const displayTime = formatNotificationWibTimestamp(payload.timestamp || new Date(), true);

  toast.custom(
    (t) => (
      <div
        role="alert"
        aria-live="assertive"
        className="w-[calc(100vw-32px)] sm:w-[400px] max-w-[400px] max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col relative pointer-events-auto transition-all animate-in slide-in-from-right-5 duration-200"
      >
        {/* Header: Measured alert badge, clear category, accessible 44px touch-target X button */}
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                isQuake
                  ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
              }`}
            >
              {isQuake ? (
                <ShieldAlert className="w-4 h-4 shrink-0" />
              ) : (
                <CloudRain className="w-4 h-4 shrink-0" />
              )}
            </div>
            <span className="text-xs font-bold tracking-wider uppercase text-slate-800 dark:text-slate-100 truncate">
              {isQuake ? "GEMPA BUMI" : "PERINGATAN DINI"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => toast.dismiss(t)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Proportional typography, no panic styling */}
        <div className="p-4 flex flex-col gap-2 overflow-y-auto">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
            {displayTitle}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {displayBody}
          </p>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium pt-0.5">
            {displayTime}
          </div>
        </div>

        {/* Footer Actions: Touch target >= 40px, consistent typography, distinct visual hierarchy */}
        <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
          {payload.onClickMap && (
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t);
                payload.onClickMap!();
              }}
              className="h-10 min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <Map className="w-3.5 h-3.5 shrink-0" />
              <span>Lihat di Peta</span>
            </button>
          )}

          {payload.onClickDetail && (
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t);
                payload.onClickDetail!();
              }}
              className="h-10 min-h-[40px] px-4 rounded-xl bg-[#1D5AA6] hover:bg-[#164785] text-white text-xs font-semibold transition-colors shadow-xs flex items-center justify-center focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <span>Lihat Detail</span>
            </button>
          )}
        </div>
      </div>
    ),
    { duration: 10000, id: payload.id }
  );
}
