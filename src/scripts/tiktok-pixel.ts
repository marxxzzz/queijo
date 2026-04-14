/**
 * TikTok Pixel Helper
 * Utilities for TikTok Pixel (ttq) tracking.
 */

declare global {
  interface Window {
    ttq: any;
  }
}

export const TIKTOK_PIXEL_ID = import.meta.env.PUBLIC_TIKTOK_PIXEL_ID || "YOUR_TIKTOK_PIXEL_ID";


/**
 * Tracks a standard event
 */
export function ttqTrack(eventName: string, properties: Record<string, any> = {}) {
  if (typeof window !== "undefined" && window.ttq) {
    window.ttq.track(eventName, properties);
    console.log(`[TikTok Pixel] Tracked: ${eventName}`, properties);
  }
}

/**
 * Identifies the user for Advanced Matching
 * @param email User email
 * @param phone User phone (format: 5511999999999)
 */
export function ttqIdentify(email?: string, phone?: string) {
  if (typeof window !== "undefined" && window.ttq && (email || phone)) {
    const identifyData: Record<string, string> = {};
    if (email) identifyData.email = email.trim().toLowerCase();
    if (phone) identifyData.phone_number = phone.replace(/\D/g, "");

    window.ttq.identify(identifyData);
    console.log(`[TikTok Pixel] Identified user`, identifyData);
  }
}
