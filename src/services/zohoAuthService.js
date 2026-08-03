import { zohoConfig, isZohoConfigured } from "../config/zoho.js";
import { zohoLog } from "../utils/zohoLog.js";

/**
 * OAuth for Zoho Meeting (FRD §6).
 *
 * Access tokens are minted from the long-lived refresh token and held in memory
 * only — never written to the database or disk, and never logged. Zoho tokens
 * last an hour; we refresh a minute early to avoid racing the expiry.
 */
const log = zohoLog("auth");

const EARLY_REFRESH_MS = 60 * 1000;

let cached = { token: null, expiresAt: 0 };
// Concurrent bookings must not each kick off their own refresh.
let inFlight = null;

export function clearZohoTokenCache() {
  cached = { token: null, expiresAt: 0 };
  inFlight = null;
}

async function requestAccessToken() {
  const url = `${zohoConfig.accountUrl.replace(/\/$/, "")}/oauth/v2/token`;
  const body = new URLSearchParams({
    refresh_token: zohoConfig.refreshToken,
    client_id: zohoConfig.clientId,
    client_secret: zohoConfig.clientSecret,
    grant_type: "refresh_token",
  });
  if (zohoConfig.redirectUri) body.set("redirect_uri", zohoConfig.redirectUri);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* handled below */
  }

  if (!res.ok || !json?.access_token) {
    // Zoho answers 200 with {error:"invalid_code"} on a dead refresh token, so
    // the body matters as much as the status.
    const reason = json?.error || `http_${res.status}`;
    log.error("refresh failed", { reason });
    const err = new Error(`Zoho OAuth refresh failed (${reason})`);
    err.code = "ZOHO_AUTH_FAILED";
    err.reason = reason;
    throw err;
  }

  const expiresInMs = Number(json.expires_in ?? 3600) * 1000;
  cached = {
    token: json.access_token,
    expiresAt: Date.now() + expiresInMs - EARLY_REFRESH_MS,
  };
  log.info("access token refreshed", { expiresInSec: Math.round(expiresInMs / 1000) });
  return cached.token;
}

/** A valid access token, refreshing only when the cached one is near expiry. */
export async function getZohoAccessToken() {
  if (!isZohoConfigured()) {
    const err = new Error("Zoho is not configured (missing client id / secret / refresh token)");
    err.code = "ZOHO_NOT_CONFIGURED";
    throw err;
  }

  if (cached.token && Date.now() < cached.expiresAt) return cached.token;

  if (!inFlight) {
    inFlight = requestAccessToken().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
