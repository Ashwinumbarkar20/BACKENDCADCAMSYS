/**
 * Exchange a Zoho authorization code for a long-lived refresh token.
 *
 * Why this exists: the authorization code from the API console is single-use
 * and expires in minutes. Pasting it straight into ZOHO_REFRESH_TOKEN looks
 * right — same `1000.xxx.yyy` shape — but every booking then dies with
 * "Zoho OAuth refresh failed (invalid_code)". This does the exchange and prints
 * the value that actually belongs in .env.
 *
 * Steps:
 *   1. api-console.zoho.in  (the .in console — the app lives in the India DC)
 *      → your Self Client → Generate Code
 *      Scope: ZohoMeeting.meeting.CREATE,ZohoMeeting.meeting.UPDATE,
 *             ZohoMeeting.meeting.DELETE,ZohoMeeting.meeting.READ
 *   2. Run this within 10 minutes, before the code expires:
 *        node src/scripts/zohoRefreshToken.js <authorization-code>
 *      ...or: npm run zoho:refresh-token -- <authorization-code>
 *   3. Copy the printed refresh token into ZOHO_REFRESH_TOKEN and restart.
 *
 * ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_ACCOUNT_URL are read from .env, so
 * the token is guaranteed to be minted for the same client that will use it —
 * a mismatch there is the other way to end up with invalid_code.
 */
import "dotenv/config";
import { zohoConfig } from "../config/zoho.js";

const code = process.argv[2]?.trim();

if (!code) {
  console.error("Usage: node src/scripts/zohoRefreshToken.js <authorization-code>");
  process.exit(1);
}
if (!zohoConfig.clientId || !zohoConfig.clientSecret) {
  console.error("ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET must be set in .env first.");
  process.exit(1);
}

const url = `${zohoConfig.accountUrl.replace(/\/$/, "")}/oauth/v2/token`;
const body = new URLSearchParams({
  grant_type: "authorization_code",
  code,
  client_id: zohoConfig.clientId,
  client_secret: zohoConfig.clientSecret,
});
if (zohoConfig.redirectUri) body.set("redirect_uri", zohoConfig.redirectUri);

console.log(`→ Exchanging code at ${url}`);

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body,
});
const json = await res.json().catch(() => null);

if (!json?.refresh_token) {
  console.error(`\n✗ No refresh token returned (HTTP ${res.status}):`);
  console.error(JSON.stringify(json, null, 2));
  if (json?.error === "invalid_code") {
    console.error(
      "\n  The code is expired or already used — generate a fresh one and run this straight away.",
    );
  }
  if (json?.error === "invalid_client") {
    console.error(
      `\n  Client id/secret rejected by ${zohoConfig.accountUrl}. Check the code came from the` +
        " same data centre (api-console.zoho.in for .in).",
    );
  }
  if (json?.access_token && !json?.refresh_token) {
    console.error("\n  Got an access token but no refresh token — regenerate the code with offline access.");
  }
  process.exit(1);
}

console.log("\n✓ Success. Put this in .env as ZOHO_REFRESH_TOKEN, then restart the API:\n");
console.log(`ZOHO_REFRESH_TOKEN=${json.refresh_token}\n`);
console.log(`  (access token valid ${json.expires_in ?? "?"}s; scope: ${json.scope ?? "?"})`);
console.log("  Verify with: curl http://localhost:5000/health   → zoho.configured true");
