import { ConsultationBooking } from "../models/index.js";
import { getBookingSettings } from "./bookingSettings.js";

/**
 * Booking rules (FRD §17), all in Asia/Kolkata.
 *
 * Bookings are not limited to a fixed list of start times — any time inside
 * working hours is allowed, and conflicts are worked out from the meeting
 * duration plus the gap that has to sit between two meetings. Both of those
 * come from Settings → Booking, so the owner can change them without a deploy.
 *
 * A booked slot therefore blocks `duration + gap` on either side: once someone
 * takes 15:00 for a 30-minute demo with a 10-minute gap, nobody else can start
 * between 14:20 and 15:40.
 *
 * Working hours follow the 10–6 change requested for the site, not the 10–7 in
 * the original FRD text.
 */
const TZ = "Asia/Kolkata";

export const WORK_START_MINUTES = 10 * 60; // 10:00
export const WORK_END_MINUTES = 18 * 60; // 18:00

export function toMinutes(hhmm) {
  const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function fromMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseYmd(ymd) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo, d, 12, 0, 0));
  if (Number.isNaN(date.getTime())) return null;
  return { y, mo, d, date };
}

/** Weekday in Asia/Kolkata: 0 Sun … 6 Sat */
function weekdayInTz(ymd) {
  const p = parseYmd(ymd);
  if (!p) return null;
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[fmt.format(p.date)] ?? null;
}

export function isBookableWeekday(ymd) {
  const wd = weekdayInTz(ymd);
  return wd != null && wd >= 1 && wd <= 6; // Mon–Sat
}

export function todayYmdInTz() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Minutes past midnight, right now, in IST — used to reject today's past times. */
function nowMinutesInTz() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

export function isPastDate(ymd) {
  return ymd < todayYmdInTz();
}

function slotLabel(time) {
  const [h, min] = time.split(":").map(Number);
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/**
 * Booked meetings for a day as {start,end} minute ranges — the real meeting
 * times, without the gap folded in. Callers add the gap themselves so the same
 * list can answer "does this clash?" and "when does the next demo start?".
 *
 * Each booking is measured with the duration it was made at
 * (`booking.durationMinutes`), not today's setting — shortening demos from 60 to
 * 30 minutes must not suddenly free up the second half of a meeting that was
 * actually booked for an hour.
 */
async function getBookedRanges(ymd, { excludeId, fallbackDuration, maxId } = {}) {
  const filter = { bookingYmd: ymd, status: { $ne: "cancelled" } };
  if (excludeId) filter._id = { $ne: excludeId };
  // Used by the post-insert race check: only bookings created before ours.
  if (maxId) filter._id = { ...(filter._id || {}), $lt: maxId };

  const rows = await ConsultationBooking.find(filter).select("preferredTime durationMinutes").lean();
  return rows
    .map((r) => {
      const start = toMinutes(r.preferredTime);
      if (start == null) return null;
      const dur = Number(r.durationMinutes) > 0 ? Number(r.durationMinutes) : fallbackDuration;
      return { start, end: start + dur };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
}

/** The booking this candidate would run into, gap included — or undefined. */
function clashingBooking(startMin, durationMinutes, booked, bufferMinutes) {
  const end = startMin + durationMinutes;
  return booked.find((b) => startMin < b.end + bufferMinutes && end > b.start - bufferMinutes);
}

function conflicts(startMin, durationMinutes, booked, bufferMinutes) {
  return Boolean(clashingBooking(startMin, durationMinutes, booked, bufferMinutes));
}

/**
 * Suggested start times for a day, packed back-to-back with the gap between
 * them and re-anchored around whatever is already booked.
 *
 * Walk the day from the first bookable minute: each suggestion is one demo
 * long, and the next one starts a gap later. When a candidate runs into an
 * existing booking the walk jumps to that meeting's end plus the gap and
 * carries on from there — so a 3:00 PM demo (30 min, 10 min gap) is followed by
 * 3:40, not by whatever the next round half-hour happened to be. Nothing
 * returned here clashes with anything.
 *
 * These are suggestions, not a restriction: `assertSlotAvailable` accepts any
 * time that clears the same gap, so a visitor typing 2:20 PM is still fine.
 */
function suggestedStarts({ durationMinutes, bufferMinutes, booked, fromMinute }) {
  const starts = [];
  let cursor = fromMinute;
  // Each pass either records a slot or skips past a booking, and both move the
  // cursor forward — the bound is belt-and-braces against a pathological day.
  for (let pass = 0; pass < 500; pass += 1) {
    if (cursor + durationMinutes > WORK_END_MINUTES) break;
    const clash = clashingBooking(cursor, durationMinutes, booked, bufferMinutes);
    if (clash) {
      cursor = clash.end + bufferMinutes;
      continue;
    }
    starts.push(cursor);
    cursor += durationMinutes + bufferMinutes;
  }
  return starts;
}

/** Round up to the next quarter hour, so today's list doesn't offer 2:07 PM. */
function ceilToQuarter(minute) {
  return Math.ceil(minute / 15) * 15;
}

export async function getSlotsForDate(ymd) {
  if (!parseYmd(ymd)) return { date: ymd, valid: false, reason: "invalid_date", slots: [] };
  if (!isBookableWeekday(ymd)) return { date: ymd, valid: false, reason: "closed_sunday", slots: [] };
  if (isPastDate(ymd)) return { date: ymd, valid: false, reason: "past_date", slots: [] };

  const { durationMinutes, bufferMinutes } = await getBookingSettings();
  const booked = await getBookedRanges(ymd, { fallbackDuration: durationMinutes });
  const isToday = ymd === todayYmdInTz();

  // Today's list starts from now, not from opening time, so the suggestions
  // stay packed against the next minute someone could actually be seen.
  const fromMinute = isToday
    ? Math.max(WORK_START_MINUTES, ceilToQuarter(nowMinutesInTz() + 1))
    : WORK_START_MINUTES;

  const open = suggestedStarts({ durationMinutes, bufferMinutes, booked, fromMinute }).map(
    (start) => ({
      time: fromMinutes(start),
      label: slotLabel(fromMinutes(start)),
      available: true,
    }),
  );

  // Taken times are listed too, marked unavailable — seeing "3:00 PM booked"
  // is what explains why the next suggestion is 3:40 and not 3:30.
  const taken = booked
    .filter((b) => b.start >= fromMinute)
    .map((b) => ({
      time: fromMinutes(b.start),
      label: slotLabel(fromMinutes(b.start)),
      available: false,
      booked: true,
    }));

  const slots = [...open, ...taken].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

  return {
    date: ymd,
    valid: true,
    workingHours: { start: fromMinutes(WORK_START_MINUTES), end: fromMinutes(WORK_END_MINUTES) },
    durationMinutes,
    bufferMinutes,
    slots,
  };
}

export async function getUpcomingAvailability(days = 21) {
  const out = [];
  const today = todayYmdInTz();
  const [y, m, d] = today.split("-").map(Number);
  for (let i = 0; i < days; i += 1) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    const ymd = dt.toISOString().slice(0, 10);
    if (!isBookableWeekday(ymd)) continue;
    // eslint-disable-next-line no-await-in-loop
    const day = await getSlotsForDate(ymd);
    if (day.valid) out.push(day);
  }
  return out;
}

/**
 * Throws a 4xx error unless the requested start time is bookable, and returns
 * the duration the booking should be saved with.
 * `excludeId` lets a reschedule ignore the booking being moved.
 */
export async function assertSlotAvailable(ymd, time, { excludeId } = {}) {
  const { durationMinutes, bufferMinutes } = await getBookingSettings();
  const start = toMinutes(time);
  if (start == null) {
    const err = new Error("Enter a valid time");
    err.status = 400;
    err.code = "INVALID_TIME";
    throw err;
  }
  if (!parseYmd(ymd)) {
    const err = new Error("Enter a valid date");
    err.status = 400;
    err.code = "INVALID_DATE";
    throw err;
  }
  if (isPastDate(ymd)) {
    const err = new Error("That date has already passed");
    err.status = 400;
    err.code = "PAST_DATE";
    throw err;
  }
  if (!isBookableWeekday(ymd)) {
    const err = new Error("We're closed on Sundays — please pick Monday to Saturday");
    err.status = 400;
    err.code = "CLOSED_DAY";
    throw err;
  }
  if (ymd === todayYmdInTz() && start <= nowMinutesInTz()) {
    const err = new Error("That time has already passed today");
    err.status = 400;
    err.code = "PAST_TIME";
    throw err;
  }
  if (start < WORK_START_MINUTES || start + durationMinutes > WORK_END_MINUTES) {
    const err = new Error(
      `Demos run Monday to Saturday, ${fromMinutes(WORK_START_MINUTES)}–${fromMinutes(
        WORK_END_MINUTES,
      )} IST. Each demo lasts ${durationMinutes} minutes.`,
    );
    err.status = 400;
    err.code = "OUTSIDE_HOURS";
    throw err;
  }

  const booked = await getBookedRanges(ymd, {
    excludeId,
    fallbackDuration: durationMinutes,
  });
  if (conflicts(start, durationMinutes, booked, bufferMinutes)) {
    const err = new Error(
      bufferMinutes > 0
        ? `That time is already booked. Demos need ${bufferMinutes} minutes clear between them — please choose another time.`
        : "That time is already booked. Please choose another.",
    );
    err.status = 409;
    err.code = "SLOT_TAKEN";
    throw err;
  }

  return { durationMinutes, bufferMinutes };
}

/**
 * Second line of defence against two people booking the same slot.
 *
 * `assertSlotAvailable` reads and the insert writes, so two requests that
 * arrive together can both pass the read and both save. This runs *after* the
 * insert: if an earlier-created booking now conflicts, the later one loses,
 * gets removed, and its owner sees the same "already booked" message they would
 * have seen a moment earlier. Ordering by `_id` gives both requests the same
 * answer about who was first, so exactly one of them is rolled back.
 */
export async function assertNoConflictAfterInsert(booking) {
  const { durationMinutes, bufferMinutes } = await getBookingSettings();
  const start = toMinutes(booking.preferredTime);
  if (start == null) return;
  const dur = Number(booking.durationMinutes) > 0 ? Number(booking.durationMinutes) : durationMinutes;

  const booked = await getBookedRanges(booking.bookingYmd, {
    fallbackDuration: durationMinutes,
    maxId: booking._id,
  });
  if (!conflicts(start, dur, booked, bufferMinutes)) return;

  await ConsultationBooking.deleteOne({ _id: booking._id });
  const err = new Error("That time was just booked by someone else. Please choose another.");
  err.status = 409;
  err.code = "SLOT_TAKEN";
  throw err;
}

/** Reject a second booking from the same person for the same slot (FRD §17). */
export async function assertNotDuplicate({ email, ymd, time, excludeId }) {
  const filter = {
    email: String(email || "").toLowerCase(),
    bookingYmd: ymd,
    preferredTime: time,
    status: { $ne: "cancelled" },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await ConsultationBooking.findOne(filter).select("_id").lean();
  if (existing) {
    const err = new Error("You already have a demo booked for this slot.");
    err.status = 409;
    err.code = "DUPLICATE_BOOKING";
    throw err;
  }
}

export function preferredDateFromYmd(ymd) {
  const p = parseYmd(ymd);
  if (!p) return null;
  return new Date(Date.UTC(p.y, p.mo, p.d, 12, 0, 0));
}
