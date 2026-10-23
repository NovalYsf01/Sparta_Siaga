import webpush from 'web-push';

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

// Deterministic VAPID keypair for isolated test, CI, and local dev environments.
// In production, these should be supplied via NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.
const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BAh5v_2YEu78XM7VZoMKmUe0QNs2GiKb5B4fYtn14-ChYW1EpzbvbgORAat1Qux5cr2H_5lxya_UOEUdg7JcW7E";

const DEFAULT_VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "dw-5D-q_3PY9j_PB9FK4KeCXT8lKBl2ZqBbaSUmt4SI";

const DEFAULT_VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ||
  "mailto:sparta-siaga@alfamart.co.id";

let isConfigured = false;

/**
 * Returns the active VAPID configuration.
 */
export function getVapidConfig(): VapidConfig {
  return {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT,
  };
}

/**
 * Ensures web-push is configured with VAPID credentials before sending.
 */
export function ensureWebPushConfigured(): void {
  if (isConfigured) return;
  const config = getVapidConfig();
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY === DEFAULT_VAPID_PRIVATE_KEY) {
      console.warn(
        "[Web Push Security Alert] Production environment running without explicit VAPID_PRIVATE_KEY. " +
        "Default development fallback keys must be rotated and supplied via environment variables."
      );
    }
  }

  try {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    isConfigured = true;
  } catch (err) {
    console.error("[Web Push] Failed to configure VAPID details:", err);
    throw err;
  }
}

/**
 * Returns the VAPID Public Key for client-side PushManager.subscribe.
 */
export function getVapidPublicKey(): string {
  return getVapidConfig().publicKey;
}
