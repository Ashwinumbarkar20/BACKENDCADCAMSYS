import { ConsultationBooking } from "../models/index.js";

/**
 * Booking rules (FRD §17), all in Asia/Kolkata.
 *
 * Bookings are no longer limited to a fixed list of start times — any time
 * inside working hours is allowed, and conflicts are worked out from the
 * meeting duration plus a buffer. The suggested slot list below is still used
 * to render "next available" chips on the site.
 *
 * Working hours follow the 10–6 change requested for the site, not the 10–7 in
 * the original FRD text.
 */
const TZ = "Asia/Kolkata";

export const WORK_START_MINUTES = 10 * 60; // 10:00
export const WORK_END_MINUTES = 18 * 60; // 18:00
export const MEETING_DURATION_MINUTES = 60;
export const BUFFER_MINUTES = 15;

/** Suggested start times shown as chips; not a restriction on what's bookable. */
export const APPOINTMENT_SLOT_TIMES = ["10:00", "11:30", "13:00", "14:30", "16:30"];

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

/** Live bookings for a day, as {start,end} minute ranges including the buffer. */
async function getBusyRanges(ymd, { excludeId } = {}) {
  const filter = { bookingYmd: ymd, status: { $ne: "cancelled" } };
  if (excludeId) filter._id = { $ne: excludeId };

  const rows = await ConsultationBooking.find(filter).select("preferredTime").lean();
  return rows
    .map((r) => toMinutes(r.preferredTime))
    .filter((m) => m != null)
    .map((start) => ({
      start: start - BUFFER_MINUTES,
      end: start + MEETING_DURATION_MINUTES + BUFFER_MINUTES,
    }));
}

function overlaps(startMin, busy) {
  const end = startMin + MEETING_DURATION_MINUTES;
  return busy.some((b) => startMin < b.end && end > b.start);
}

export async function getSlotsForDate(ymd) {
  if (!parseYmd(ymd)) return { date: ymd, valid: false, reason: "invalid_date", slots: [] };
  if (!isBookableWeekday(ymd)) return { date: ymd, valid: false, reason: "closed_sunday", slots: [] };
  if (isPastDate(ymd)) return { date: ymd, valid: false, reason: "past_date", slots: [] };

  const busy = await getBusyRanges(ymd);
  const isToday = ymd === todayYmdInTz();
  const nowMin = nowMinutesInTz();

  const slots = APPOINTMENT_SLOT_TIMES.map((time) => {
    const start = toMinutes(time);
    const tooLate = isToday && start <= nowMin;
    return {
      time,
      label: slotLabel(time),
      available: !tooLate && !overlaps(start, busy),
    };
  });

  return {
    date: ymd,
    valid: true,
    workingHours: { start: fromMinutes(WORK_START_MINUTES), end: fromMinutes(WORK_END_MINUTES) },
    durationMinutes: MEETING_DURATION_MINUTES,
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
 * Throws a 4xx error unless the requested start time is bookable.
 * `excludeId` lets a reschedule ignore the booking being moved.
 */
export async function assertSlotAvailable(ymd, time, { excludeId } = {}) {
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
  if (start < WORK_START_MINUTES || start + MEETING_DURATION_MINUTES > WORK_END_MINUTES) {
    const err = new Error(
      `Demos run Monday to Saturday, ${fromMinutes(WORK_START_MINUTES)}–${fromMinutes(
        WORK_END_MINUTES,
      )} IST. Each demo lasts ${MEETING_DURATION_MINUTES} minutes.`,
    );
    err.status = 400;
    err.code = "OUTSIDE_HOURS";
    throw err;
  }

  const busy = await getBusyRanges(ymd, { excludeId });
  if (overlaps(start, busy)) {
    const err = new Error("That time is already booked. Please choose another.");
    err.status = 409;
    err.code = "SLOT_TAKEN";
    throw err;
  }
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
