import { Settings } from "../models/Settings.js";
import {
  DEFAULT_BUFFER_MINUTES,
  DEFAULT_DURATION_MINUTES,
  MAX_BUFFER_MINUTES,
  MAX_DURATION_MINUTES,
  MIN_BUFFER_MINUTES,
  MIN_DURATION_MINUTES,
} from "../config/booking.js";

/**
 * Owner-editable scheduling rules (Settings → Booking): how long a demo runs and
 * how much clear time has to sit between two demos.
 *
 * Read on the hot path — every slot grid and every booking attempt needs it — so
 * the document is cached briefly rather than fetched per request. Saving the
 * Settings singleton drops the cache (see `singleton.controller.js`), so an edit
 * in the admin panel takes effect on the next request rather than after the TTL.
 */
const CACHE_TTL_MS = 30_000;

let cached = null;
let cachedAt = 0;

function clampInt(value, { min, max, fallback }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Coerce whatever is stored (or missing) into usable numbers. */
export function normalizeBookingSettings(raw) {
  return {
    durationMinutes: clampInt(raw?.durationMinutes, {
      min: MIN_DURATION_MINUTES,
      max: MAX_DURATION_MINUTES,
      fallback: DEFAULT_DURATION_MINUTES,
    }),
    bufferMinutes: clampInt(raw?.bufferMinutes, {
      min: MIN_BUFFER_MINUTES,
      max: MAX_BUFFER_MINUTES,
      fallback: DEFAULT_BUFFER_MINUTES,
    }),
  };
}

export function invalidateBookingSettings() {
  cached = null;
  cachedAt = 0;
}

export async function getBookingSettings() {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;
  try {
    const doc = await Settings.findOne({ singletonKey: "global" }).select("booking").lean();
    cached = normalizeBookingSettings(doc?.booking);
  } catch (err) {
    // A settings read must never take the booking form down — fall back to the
    // defaults and try again on the next call.
    // eslint-disable-next-line no-console
    console.error("[booking] settings read failed:", err?.message);
    cached = normalizeBookingSettings(null);
  }
  cachedAt = Date.now();
  return cached;
}
