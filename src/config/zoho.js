/**
 * Zoho Meeting configuration.
 *
 * Everything here comes from the environment — no credential is ever written
 * into the repo. Set these in .env (which is gitignored):
 *
 *   ZOHO_CLIENT_ID
 *   ZOHO_CLIENT_SECRET
 *   ZOHO_REFRESH_TOKEN
 *   ZOHO_REDIRECT_URI
 *   ZOHO_ACCOUNT_URL     (default https://accounts.zoho.in)
 *   ZOHO_MEETING_API_URL (default https://meeting.zoho.in)
 *
 * The data-centre matters: a token minted on accounts.zoho.in only works
 * against meeting.zoho.in. cadcamsys.com mail already runs on Zoho India, so
 * the .in defaults match.
 */

const trim = (v) => String(v ?? "").trim();

export const zohoConfig = {
  clientId: trim(process.env.ZOHO_CLIENT_ID),
  clientSecret: trim(process.env.ZOHO_CLIENT_SECRET),
  refreshToken: trim(process.env.ZOHO_REFRESH_TOKEN),
  redirectUri: trim(process.env.ZOHO_REDIRECT_URI),
  accountUrl: trim(process.env.ZOHO_ACCOUNT_URL) || "https://accounts.zoho.in",
  apiUrl: trim(process.env.ZOHO_MEETING_API_URL) || "https://meeting.zoho.in",
  // Optional: skip the lookup call by pinning the org id.
  zsoid: trim(process.env.ZOHO_MEETING_ZSOID),
  presenterEmail: trim(process.env.ZOHO_PRESENTER_EMAIL),
};

/** Meeting shape from the FRD — topic, agenda, duration and timezone. */
export const MEETING_DEFAULTS = {
  topic: trim(process.env.ZOHO_MEETING_TOPIC) || "Almacam Product Demonstration",
  agenda: ["Company Overview", "Software Demonstration", "Questions & Answers"],
  durationMinutes: 60,
  timezone: "Asia/Kolkata",
};

/** True when enough is configured to attempt a meeting create. */
export function isZohoConfigured() {
  return Boolean(zohoConfig.clientId && zohoConfig.clientSecret && zohoConfig.refreshToken);
}

/** Safe summary for /health — proves wiring without leaking secrets. */
export function getZohoDiagnostics() {
  return {
    configured: isZohoConfigured(),
    accountUrl: zohoConfig.accountUrl,
    apiUrl: zohoConfig.apiUrl,
    clientId: zohoConfig.clientId ? `${zohoConfig.clientId.slice(0, 12)}…` : null,
    hasClientSecret: Boolean(zohoConfig.clientSecret),
    hasRefreshToken: Boolean(zohoConfig.refreshToken),
    zsoidPinned: Boolean(zohoConfig.zsoid),
  };
}
