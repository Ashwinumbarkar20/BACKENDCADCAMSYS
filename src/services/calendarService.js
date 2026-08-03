import { MEETING_DEFAULTS } from "../config/zoho.js";

/**
 * ICS invitations (FRD §12) for Outlook, Google Calendar and Apple Calendar.
 *
 * Times are emitted as UTC (…Z) rather than with a VTIMEZONE block: every
 * client resolves UTC identically, whereas a hand-rolled VTIMEZONE is a
 * classic source of "meeting shows an hour out" bugs.
 *
 * METHOD:REQUEST creates/updates, METHOD:CANCEL withdraws. Keeping the same UID
 * and bumping SEQUENCE is what makes a reschedule replace the original entry
 * instead of adding a second one.
 */

const IST_OFFSET_MIN = 5 * 60 + 30;

/** "2026-08-12" + "15:30" (IST) → Date at the correct UTC instant. */
export function istToUtc(ymd, hhmm) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const [h, min] = String(hhmm).split(":").map(Number);
  if (!y || !m || !d || Number.isNaN(h) || Number.isNaN(min)) return null;
  return new Date(Date.UTC(y, m - 1, d, h, min, 0) - IST_OFFSET_MIN * 60 * 1000);
}

function icsStamp(date) {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/** Escape per RFC 5545 and fold to 75 octets so long lines survive transit. */
function esc(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function fold(line) {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

/**
 * @param {"REQUEST"|"CANCEL"} method
 * @returns {{ filename: string, content: string, contentType: string }}
 */
export function buildMeetingIcs({
  uid,
  sequence = 0,
  method = "REQUEST",
  ymd,
  time,
  durationMinutes = MEETING_DEFAULTS.durationMinutes,
  title,
  description,
  location,
  organizerName = "CADCAM Automation Systems",
  organizerEmail,
  attendeeName,
  attendeeEmail,
}) {
  const start = istToUtc(ymd, time);
  if (!start) return null;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CADCAM Automation Systems//Booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${esc(uid)}`,
    `SEQUENCE:${sequence}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${esc(title || MEETING_DEFAULTS.topic)}`,
    description ? `DESCRIPTION:${esc(description)}` : null,
    location ? `LOCATION:${esc(location)}` : null,
    organizerEmail ? `ORGANIZER;CN=${esc(organizerName)}:mailto:${organizerEmail}` : null,
    attendeeEmail
      ? `ATTENDEE;CN=${esc(attendeeName || attendeeEmail)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendeeEmail}`
      : null,
    `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return {
    filename: "cadcamsys-demo.ics",
    content: `${lines.map(fold).join("\r\n")}\r\n`,
    // The method parameter is what makes Outlook and Gmail show Accept/Decline
    // rather than treating the file as a plain attachment.
    contentType: `text/calendar; charset=utf-8; method=${method}`,
  };
}

/** Nodemailer attachment for an ICS payload. */
export function icsAttachment(ics) {
  if (!ics) return null;
  return {
    filename: ics.filename,
    content: ics.content,
    contentType: ics.contentType,
  };
}
