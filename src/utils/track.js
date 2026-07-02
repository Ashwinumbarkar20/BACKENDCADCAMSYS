import crypto from "crypto";
import { env } from "../config/env.js";

// SHA-256 of IP + per-server salt. We never store raw IPs (GDPR-friendlier).
// Same IP -> same hash, so we can still count uniques and rate-limit.
export function hashIp(ip) {
  if (!ip) return "";
  return crypto.createHash("sha256").update(`${env.TRACKING_SALT}|${ip}`).digest("hex");
}

// Best-effort client IP. Trusts the first proxy hop (set in app.js).
export function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "";
}

// Common search/scrape/uptime UAs. We skip writing rows for these to keep the
// lead funnel clean; switch to flagging instead of skipping if you ever need
// SEO crawl analytics.
const BOT_PATTERNS = [
  /bot\b/i, /crawl/i, /spider/i, /slurp/i, /facebookexternalhit/i, /embedly/i,
  /preview/i, /pingdom/i, /uptimerobot/i, /lighthouse/i, /headlesschrome/i,
  /python-requests/i, /curl\//i, /wget\//i, /httpclient/i, /go-http/i,
];
export function isBotUserAgent(ua) {
  if (!ua) return true;
  return BOT_PATTERNS.some((re) => re.test(ua));
}

// Extracts browser, OS, and device class from a user agent string. We do this
// inline (instead of pulling in ua-parser-js) so the stack stays minimal — swap
// in ua-parser-js later if you need exact versioning.
export function parseUserAgent(ua) {
  const s = String(ua || "");
  let browser = "Other";
  let os = "Other";
  let device = "desktop";

  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\//.test(s) || /Opera/.test(s)) browser = "Opera";
  else if (/Chrome\//.test(s) && !/Chromium/.test(s)) browser = "Chrome";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/Safari\//.test(s) && !/Chrome\//.test(s)) browser = "Safari";

  if (/Windows NT/.test(s)) os = "Windows";
  else if (/Mac OS X/.test(s) && !/Mobile/.test(s)) os = "macOS";
  else if (/Android/.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(s)) os = "iOS";
  else if (/Linux/.test(s)) os = "Linux";

  if (/Mobi|Android.+Mobile|iPhone|iPod/.test(s)) device = "mobile";
  else if (/iPad|Tablet/.test(s)) device = "tablet";

  return { browser, os, device };
}

// High-intent paths score higher. Adjust these as your site evolves.
const HIGH_INTENT = [/\/contact/i, /\/book/i, /\/pricing/i, /\/demo/i, /\/quote/i];
const MEDIUM_INTENT = [/\/products?\b/i, /\/solutions?\b/i, /\/case-stud/i];

// Heuristic 0-100 score. Used to surface engaged-but-not-yet-converted visitors.
export function computeVisitorScore({ pageViewCount = 0, paths = [], hasLead = false } = {}) {
  let score = 0;
  score += Math.min(20, pageViewCount * 2);          // up to 20 for raw activity
  for (const p of paths) {
    if (HIGH_INTENT.some((re) => re.test(p))) score += 12;
    else if (MEDIUM_INTENT.some((re) => re.test(p))) score += 4;
  }
  if (hasLead) score += 30;
  return Math.min(100, Math.round(score));
}

// Reads a cookie value off the request without requiring cookie-parser to have
// run (kept generic so the tracker works regardless of middleware order).
export function readCookie(req, name) {
  const cookies = req.cookies;
  if (cookies && Object.prototype.hasOwnProperty.call(cookies, name)) return cookies[name];
  const header = req.headers?.cookie;
  if (!header) return "";
  const parts = header.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return "";
}

// Common cookie config for the visitor id. SameSite=Lax + httpOnly so it's
// readable by the server but not by 3rd-party scripts on other domains.
export function visitorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: env.TRACKING_COOKIE_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export const VISITOR_COOKIE = "cadcam_vid";
