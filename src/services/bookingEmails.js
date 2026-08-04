import { sendMail, escapeHtml, getAdminRecipients } from "./email.service.js";
import { buildMeetingIcs, icsAttachment } from "./calendarService.js";
import { MEETING_DEFAULTS } from "../config/zoho.js";
import { zohoLog } from "../utils/zohoLog.js";

/**
 * Branded booking emails (FRD §10, §11) plus their calendar invitations.
 *
 * Kept apart from email.service.js, which stays a generic transport: this file
 * owns what a demo booking looks like in an inbox.
 */
const log = zohoLog("email");

const BRAND = "CADCAM Automation Systems";
const BRAND_SHORT = "CADCAMSYS";
const SITE = (process.env.PUBLIC_SITE_URL || "https://cadcamsys.com").replace(/\/$/, "");

function prettyDate(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  if (!y) return ymd;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function prettyTime(hhmm) {
  const [h, min] = String(hhmm).split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const h12 = h % 12 || 12;
  return `${h12}:${String(min ?? 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"} IST`;
}

function shell(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  <tr><td style="background:#0f172a;padding:20px 28px;">
    <p style="margin:0;color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:0.5px;">${BRAND_SHORT}</p>
    <p style="margin:2px 0 0;color:#94a3b8;font-size:12px;">${BRAND}</p>
  </td></tr>
  <tr><td style="padding:28px;">
    <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">${escapeHtml(title)}</h1>
    ${bodyHtml}
  </td></tr>
  <tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#64748b;">${BRAND} &middot; <a href="${SITE}" style="color:#2563eb;text-decoration:none;">cadcamsys.com</a></p>
  </td></tr>
</table></body></html>`;
}

function detailRows(rows) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;margin:8px 0 20px;">${rows
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 0;color:#64748b;width:42%;">${escapeHtml(k)}</td><td style="padding:7px 0;color:#0f172a;font-weight:600;">${escapeHtml(
          v,
        )}</td></tr>`,
    )
    .join("")}</table>`;
}

function button(href, label) {
  if (!href) return "";
  return `<p style="margin:0 0 20px;"><a href="${escapeHtml(
    href,
  )}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:8px;">${escapeHtml(
    label,
  )}</a></p>`;
}

function agendaList() {
  return `<p style="margin:0 0 6px;font-size:14px;color:#0f172a;font-weight:bold;">Agenda</p><ul style="margin:0 0 20px;padding-left:20px;font-size:14px;color:#334155;">${MEETING_DEFAULTS.agenda
    .map((a) => `<li style="padding:2px 0;">${escapeHtml(a)}</li>`)
    .join("")}</ul>`;
}

/** The length this booking was made at, falling back to the shipped default. */
function bookingDuration(booking) {
  const n = Number(booking?.durationMinutes);
  return n > 0 ? n : MEETING_DEFAULTS.durationMinutes;
}

function icsFor(booking, method, sequence) {
  return buildMeetingIcs({
    uid: `booking-${booking._id}@cadcamsys.com`,
    sequence,
    method,
    ymd: booking.bookingYmd,
    time: booking.preferredTime,
    durationMinutes: bookingDuration(booking),
    title: booking.meetingTitle || MEETING_DEFAULTS.topic,
    description: `${MEETING_DEFAULTS.agenda.join(" • ")}${
      booking.joinUrl ? `\n\nJoin: ${booking.joinUrl}` : ""
    }`,
    location: booking.joinUrl || "Online",
    organizerEmail: getAdminRecipients()[0],
    attendeeName: booking.name,
    attendeeEmail: booking.email,
  });
}

/** FRD §10 — customer confirmation, with the calendar invite attached. */
export async function sendBookingConfirmation(booking, { method = "REQUEST", sequence = 0 } = {}) {
  const rescheduleUrl = `${SITE}/contact?ref=${encodeURIComponent(String(booking._id))}`;
  const isCancel = method === "CANCEL";

  const body = isCancel
    ? `<p style="margin:0 0 16px;font-size:15px;">Hi ${escapeHtml(booking.name)}, your demo below has been cancelled. Nothing further is needed from you.</p>
       ${detailRows([
         ["Date", prettyDate(booking.bookingYmd)],
         ["Time", prettyTime(booking.preferredTime)],
         ["Meeting ID", booking.meetingId],
       ])}
       <p style="margin:0 0 8px;font-size:14px;color:#334155;">Want another slot? <a href="${rescheduleUrl}" style="color:#2563eb;">Book a new demo</a>.</p>`
    : `<p style="margin:0 0 16px;font-size:15px;">Hi ${escapeHtml(booking.name)}, your ${escapeHtml(
        booking.meetingTitle || MEETING_DEFAULTS.topic,
      )} is confirmed. The calendar invitation is attached.</p>
       ${detailRows([
         ["Product", booking.consultationType || "Almacam suite"],
         ["Date", prettyDate(booking.bookingYmd)],
         ["Time", prettyTime(booking.preferredTime)],
         ["Duration", `${bookingDuration(booking)} minutes`],
         ["Meeting ID", booking.meetingId],
         ["Password", booking.meetingPassword],
       ])}
       ${button(booking.joinUrl, "Join Meeting")}
       ${agendaList()}
       <p style="margin:0;font-size:13px;color:#64748b;">Need a different slot? <a href="${rescheduleUrl}" style="color:#2563eb;">Request a reschedule</a>.</p>`;

  const subject = isCancel
    ? `Your ${BRAND_SHORT} demo on ${prettyDate(booking.bookingYmd)} was cancelled`
    : `Your ${BRAND_SHORT} Product Demo is Confirmed`;

  const ics = icsAttachment(icsFor(booking, method, sequence));
  const result = await sendMail({
    to: booking.email,
    subject,
    html: shell(isCancel ? "Demo cancelled" : "Meeting Scheduled Successfully", body),
    text: `${subject}\n${prettyDate(booking.bookingYmd)} at ${prettyTime(booking.preferredTime)}\n${
      booking.joinUrl || ""
    }`,
    attachments: ics ? [ics] : undefined,
  });
  log.info("customer email", { booking: String(booking._id), method, sent: result.sent });
  return result;
}

/** FRD §11 — organiser notification, same invite attached. */
export async function sendBookingOrganizerNotice(booking, { method = "REQUEST", sequence = 0 } = {}) {
  const to = getAdminRecipients();
  if (to.length === 0) return { sent: false, skipped: "no-admin-recipient" };

  const isCancel = method === "CANCEL";
  const body = `${detailRows([
    ["Customer", booking.name],
    ["Company", booking.company],
    ["Phone", booking.phone],
    ["Email", booking.email],
    ["Consultation type", booking.consultationType],
    ["Date", prettyDate(booking.bookingYmd)],
    ["Time", prettyTime(booking.preferredTime)],
    ["Duration", `${bookingDuration(booking)} minutes`],
    ["Meeting ID", booking.meetingId],
    ["Status", booking.status],
    ["Remarks", booking.notes],
  ])}${button(booking.hostUrl, "Start Meeting (host)")}`;

  const subject = isCancel
    ? `[Cancelled] Demo — ${booking.name}${booking.company ? ` (${booking.company})` : ""}`
    : `[Demo booked] ${booking.name}${booking.company ? ` (${booking.company})` : ""} — ${prettyDate(
        booking.bookingYmd,
      )}`;

  const ics = icsAttachment(icsFor(booking, method, sequence));
  const result = await sendMail({
    to,
    subject,
    html: shell(isCancel ? "Demo cancelled" : "New demo booking", body),
    replyTo: booking.email,
    attachments: ics ? [ics] : undefined,
  });
  log.info("organizer email", { booking: String(booking._id), method, sent: result.sent });
  return result;
}

/** FRD §18 — tell the team a booking saved but its meeting did not. */
export async function sendMeetingFailureAlert(booking, reason) {
  const to = getAdminRecipients();
  if (to.length === 0) return { sent: false, skipped: "no-admin-recipient" };
  return sendMail({
    to,
    subject: `[Action needed] Zoho meeting not created — ${booking.name}`,
    html: shell(
      "Booking saved, meeting not created",
      `<p style="margin:0 0 16px;font-size:15px;">The booking below is stored with status <strong>pending_meeting</strong> and will be retried automatically. Create the meeting manually if the customer needs the link sooner.</p>
       ${detailRows([
         ["Customer", booking.name],
         ["Email", booking.email],
         ["Phone", booking.phone],
         ["Date", prettyDate(booking.bookingYmd)],
         ["Time", prettyTime(booking.preferredTime)],
         ["Reason", reason],
       ])}`,
    ),
    replyTo: booking.email,
  });
}
