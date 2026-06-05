import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "ji360_ref";
const TS_KEY = "ji360_ref_ts";
// default attribution window (mirrors plan cookie_window_days; conservative client-side cap)
const MAX_AGE_DAYS = 90;

interface StoredRef {
  code: string;
  ts: number;
}

/**
 * Read ?ref= / ?affiliate= from the URL, persist it, and record a click.
 * Safe to call on every app load.
 */
export async function captureReferralFromUrl(): Promise<void> {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref") || params.get("affiliate") || params.get("aff");
    if (!code) return;

    const clean = code.trim().toUpperCase();
    if (!clean) return;

    const payload: StoredRef = { code: clean, ts: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(TS_KEY, String(payload.ts));

    await supabase.rpc("record_referral_click", {
      p_code: clean,
      p_landing_url: window.location.href,
      p_referrer: document.referrer || undefined,
      p_user_agent: navigator.userAgent,
    });
  } catch (err) {
    // attribution must never break the app
    console.warn("captureReferralFromUrl failed", err);
  }
}

/** Returns the stored referral code if still within the attribution window. */
export function getStoredReferralCode(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredRef = JSON.parse(raw);
    const ageDays = (Date.now() - parsed.ts) / (1000 * 60 * 60 * 24);
    if (ageDays > MAX_AGE_DAYS) {
      clearStoredReferral();
      return null;
    }
    return parsed.code || null;
  } catch {
    return null;
  }
}

export function clearStoredReferral(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TS_KEY);
}

/**
 * Register a signup against the stored referral code. Call right after a
 * customer creates an account so the referral is attributed to the affiliate.
 */
export async function registerReferralSignup(email: string, name?: string): Promise<void> {
  const code = getStoredReferralCode();
  if (!code || !email) return;
  try {
    await supabase.rpc("register_referral", {
      p_code: code,
      p_email: email,
      p_name: name,
      p_landing_url: window.location.href,
    });
  } catch (err) {
    console.warn("registerReferralSignup failed", err);
  }
}
