import { toast } from "sonner";

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
  title: string;
  body: string;
  disasterType?: "earthquake" | "heavy_rain" | "flood" | "tsunami";
  ticketNumber?: string;
  branch?: string;
  onClick?: () => void;
  forceBypassBranchFilter?: boolean;
}

/**
 * Triggers dual desktop notification:
 * 1. Native OS Pop-up banner (Windows / Mac / Linux Notification Center)
 * 2. In-App floating emergency toast popup on screen
 * 3. Audio chime
 */
export function triggerDesktopPopup(payload: EmergencyNotificationPayload): void {
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
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: "/favicon.ico",
        tag: payload.ticketNumber || `disaster_${Date.now()}`,
        requireInteraction: true, // Keep banner on screen until operator clicks/dismisses
      });

      notification.onclick = () => {
        window.focus();
        if (payload.onClick) payload.onClick();
        notification.close();
      };
    } catch (err) {
      console.warn("[Desktop Notification] Native notification error:", err);
    }
  }

  // 3. In-App Pop-up Toast Banner (always visible inside dashboard)
  const isQuake = payload.disasterType === "earthquake" || payload.disasterType === "tsunami";

  if (isQuake) {
    toast.error(payload.title, {
      description: payload.body,
      duration: 12000,
      action: payload.onClick ? {
        label: "Buka & Tangani",
        onClick: payload.onClick,
      } : undefined,
    });
  } else {
    toast.warning(payload.title, {
      description: payload.body,
      duration: 12000,
      action: payload.onClick ? {
        label: "Buka & Tangani",
        onClick: payload.onClick,
      } : undefined,
    });
  }
}
