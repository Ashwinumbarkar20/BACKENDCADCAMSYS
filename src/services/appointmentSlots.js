import { ConsultationBooking } from "../models/index.js";

/** Mon–Sat, 10:00–19:00 IST — five bookable start times per day. */
export const APPOINTMENT_SLOT_TIMES = ["10:00", "11:30", "13:00", "15:00", "17:00"];

const TZ = "Asia/Kolkata";

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
  const day = fmt.format(p.date);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[day] ?? null;
}

export function isBookableWeekday(ymd) {
  const wd = weekdayInTz(ymd);
  return wd != null && wd >= 1 && wd <= 6;
}

export function todayYmdInTz() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

export function isPastDate(ymd) {
  return ymd < todayYmdInTz();
}

function slotLabel(time) {
  const [h, min] = time.split(":").map(Number);
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

function dayRangeUtc(ymd) {
  const p = parseYmd(ymd);
  if (!p) return null;
  const start = new Date(Date.UTC(p.y, p.mo, p.d, 0, 0, 0));
  const end = new Date(Date.UTC(p.y, p.mo, p.d + 1, 0, 0, 0));
  return { start, end };
}

export async function getBookedTimesForDate(ymd) {
  const range = dayRangeUtc(ymd);
  if (!range) return new Set();

  const rows = await ConsultationBooking.find({
    preferredDate: { $gte: range.start, $lt: range.end },
    preferredTime: { $in: APPOINTMENT_SLOT_TIMES },
  })
    .select("preferredTime")
    .lean();

  return new Set(rows.map((r) => r.preferredTime).filter(Boolean));
}

export async function getSlotsForDate(ymd) {
  if (!parseYmd(ymd)) {
    return { date: ymd, valid: false, reason: "invalid_date", slots: [] };
  }
  if (!isBookableWeekday(ymd)) {
    return { date: ymd, valid: false, reason: "closed_sunday", slots: [] };
  }
  if (isPastDate(ymd)) {
    return { date: ymd, valid: false, reason: "past_date", slots: [] };
  }

  const booked = await getBookedTimesForDate(ymd);
  const slots = APPOINTMENT_SLOT_TIMES.map((time) => ({
    time,
    label: slotLabel(time),
    available: !booked.has(time),
  }));

  return { date: ymd, valid: true, slots };
}

export async function assertSlotAvailable(ymd, time) {
  if (!APPOINTMENT_SLOT_TIMES.includes(time)) {
    const err = new Error("Invalid time slot");
    err.status = 400;
    err.code = "INVALID_SLOT";
    throw err;
  }
  if (!isBookableWeekday(ymd) || isPastDate(ymd)) {
    const err = new Error("This date is not available for booking");
    err.status = 400;
    err.code = "DATE_UNAVAILABLE";
    throw err;
  }
  const booked = await getBookedTimesForDate(ymd);
  if (booked.has(time)) {
    const err = new Error("This time slot is already booked. Please choose another.");
    err.status = 409;
    err.code = "SLOT_TAKEN";
    throw err;
  }
}

export function preferredDateFromYmd(ymd) {
  const p = parseYmd(ymd);
  if (!p) return null;
  return new Date(Date.UTC(p.y, p.mo, p.d, 12, 0, 0));
}

/** Next N calendar days with slot availability (skips Sundays). */
export async function getUpcomingAvailability(days = 21) {
  const out = [];
  const start = todayYmdInTz();
  const [sy, sm, sd] = start.split("-").map(Number);
  let cursor = new Date(Date.UTC(sy, sm - 1, sd));

  let iterations = 0;
  while (out.length < days && iterations < 90) {
    const ymd = cursor.toISOString().slice(0, 10);
    if (isBookableWeekday(ymd) && !isPastDate(ymd)) {
      const day = await getSlotsForDate(ymd);
      out.push(day);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    iterations += 1;
  }
  return out.slice(0, days);
}
