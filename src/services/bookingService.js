import { ConsultationBooking } from "../models/index.js";
import { isZohoConfigured, MEETING_DEFAULTS } from "../config/zoho.js";
import { createZohoMeeting, updateZohoMeeting, deleteZohoMeeting } from "./zohoMeetingService.js";
import {
  sendBookingConfirmation,
  sendBookingOrganizerNotice,
  sendMeetingFailureAlert,
} from "./bookingEmails.js";
import { zohoLog } from "../utils/zohoLog.js";

/**
 * Booking orchestration (FRD §5, §15, §16, §18).
 *
 * The rule throughout: the customer's booking is never lost to a Zoho outage.
 * If the meeting can't be created the booking still saves as
 * `pending_meeting`, the team is alerted, and a retry picks it up later.
 */
const log = zohoLog("booking");

const MAX_RETRIES = 5;

function applySession(booking, session) {
  booking.meetingId = session.meetingId || session.meetingKey || "";
  booking.meetingKey = session.meetingKey || "";
  booking.joinUrl = session.joinUrl || "";
  booking.hostUrl = session.hostUrl || "";
  booking.meetingPassword = session.meetingPassword || "";
  booking.meetingStartTime = session.startTime || "";
  booking.meetingEndTime = session.endTime || "";
  booking.meetingStatus = session.status || "";
  booking.meetingError = "";
  booking.status = "confirmed";
}

/** Emails are best-effort: a delivery failure must not fail the booking. */
function notify(promise, what) {
  Promise.resolve(promise).catch((err) => {
    log.error(`${what} failed`, { message: err?.message });
  });
}

/**
 * Create the Zoho meeting for a saved booking and send both emails.
 * Returns the booking either way — check `status` for the outcome.
 */
export async function provisionMeeting(booking, { silent = false } = {}) {
  if (!isZohoConfigured()) {
    booking.status = "pending_meeting";
    booking.meetingError = "Zoho is not configured";
    booking.meetingTitle = booking.meetingTitle || MEETING_DEFAULTS.topic;
    await booking.save();
    log.warn("zoho not configured — booking left pending", { booking: String(booking._id) });
    if (!silent) {
      // The customer is told their slot is held either way — the form promises
      // an email, and a Zoho problem is not their problem.
      notify(sendBookingConfirmation(booking, { linkPending: true }), "customer email (link pending)");
      notify(sendBookingOrganizerNotice(booking), "organizer email");
      notify(sendMeetingFailureAlert(booking, "Zoho is not configured"), "failure alert");
    }
    return booking;
  }

  try {
    const session = await createZohoMeeting({
      ymd: booking.bookingYmd,
      time: booking.preferredTime,
      customerEmail: booking.email,
      customerName: booking.name,
      topic: booking.meetingTitle || MEETING_DEFAULTS.topic,
      durationMinutes: booking.durationMinutes,
    });
    applySession(booking, session);
    booking.meetingTitle = booking.meetingTitle || MEETING_DEFAULTS.topic;
    await booking.save();

    if (!silent) {
      notify(sendBookingConfirmation(booking), "customer email");
      notify(sendBookingOrganizerNotice(booking), "organizer email");
    }
    return booking;
  } catch (err) {
    booking.status = "pending_meeting";
    booking.meetingError = String(err?.message || err).slice(0, 500);
    booking.meetingRetryCount = (booking.meetingRetryCount || 0) + 1;
    booking.meetingTitle = booking.meetingTitle || MEETING_DEFAULTS.topic;
    await booking.save();
    log.error("meeting creation failed", {
      booking: String(booking._id),
      attempt: booking.meetingRetryCount,
      message: err?.message,
    });
    if (!silent) {
      notify(sendBookingConfirmation(booking, { linkPending: true }), "customer email (link pending)");
      notify(sendBookingOrganizerNotice(booking), "organizer email");
      notify(sendMeetingFailureAlert(booking, booking.meetingError), "failure alert");
    }
    return booking;
  }
}

/** FRD §15 — move an existing booking and tell everyone. */
export async function rescheduleBooking(booking, { ymd, time, durationMinutes }) {
  const previous = { ymd: booking.bookingYmd, time: booking.preferredTime };
  booking.bookingYmd = ymd;
  booking.preferredTime = time;
  // The new slot was validated against the current setting, so the meeting is
  // re-cut at that length rather than the one it was originally booked at.
  if (Number(durationMinutes) > 0) booking.durationMinutes = Number(durationMinutes);
  booking.icsSequence = (booking.icsSequence || 0) + 1;

  if (booking.meetingKey && isZohoConfigured()) {
    try {
      const session = await updateZohoMeeting(booking.meetingKey, {
        ymd,
        time,
        customerEmail: booking.email,
        customerName: booking.name,
        topic: booking.meetingTitle,
        durationMinutes: booking.durationMinutes,
      });
      applySession(booking, session);
    } catch (err) {
      booking.status = "pending_meeting";
      booking.meetingError = String(err?.message || err).slice(0, 500);
      log.error("meeting update failed", { booking: String(booking._id), message: err?.message });
    }
  } else if (!booking.meetingKey) {
    // Never had a meeting — try to create one now that it's being rescheduled.
    await provisionMeeting(booking, { silent: true });
  }

  await booking.save();
  log.info("rescheduled", {
    booking: String(booking._id),
    from: `${previous.ymd} ${previous.time}`,
    to: `${ymd} ${time}`,
  });

  const opts = { method: "REQUEST", sequence: booking.icsSequence };
  notify(sendBookingConfirmation(booking, opts), "customer email");
  notify(sendBookingOrganizerNotice(booking, opts), "organizer email");
  return booking;
}

/** FRD §16 — cancel in Zoho, mark locally, send the CANCEL invite. */
export async function cancelBooking(booking) {
  if (booking.meetingKey && isZohoConfigured()) {
    try {
      await deleteZohoMeeting(booking.meetingKey);
    } catch (err) {
      // A meeting that's already gone shouldn't block the local cancellation.
      log.warn("meeting delete failed", { booking: String(booking._id), message: err?.message });
    }
  }

  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  booking.meetingStatus = "cancelled";
  booking.icsSequence = (booking.icsSequence || 0) + 1;
  await booking.save();
  log.info("cancelled", { booking: String(booking._id) });

  const opts = { method: "CANCEL", sequence: booking.icsSequence };
  notify(sendBookingConfirmation(booking, opts), "customer cancellation email");
  notify(sendBookingOrganizerNotice(booking, opts), "organizer cancellation email");
  return booking;
}

/**
 * FRD §18 — retry bookings whose meeting never got created. Called on a timer
 * from server.js and safe to run concurrently with live traffic.
 */
export async function retryPendingMeetings({ limit = 10 } = {}) {
  if (!isZohoConfigured()) return { attempted: 0, recovered: 0, skipped: "not-configured" };

  const pending = await ConsultationBooking.find({
    status: "pending_meeting",
    meetingRetryCount: { $lt: MAX_RETRIES },
    bookingYmd: { $gte: new Date().toISOString().slice(0, 10) },
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  let recovered = 0;
  for (const booking of pending) {
    // eslint-disable-next-line no-await-in-loop
    const updated = await provisionMeeting(booking, { silent: true });
    if (updated.status === "confirmed") {
      recovered += 1;
      // The customer already holds a "link to follow" invite for this slot, so
      // bump the sequence — calendar clients replace that event with the one
      // carrying the join link instead of adding a second copy.
      updated.icsSequence = (updated.icsSequence || 0) + 1;
      // eslint-disable-next-line no-await-in-loop
      await updated.save();
      const opts = { sequence: updated.icsSequence };
      notify(sendBookingConfirmation(updated, opts), "customer email (retry)");
      notify(sendBookingOrganizerNotice(updated, opts), "organizer email (retry)");
    }
  }

  if (pending.length > 0) {
    log.info("retry sweep", { attempted: pending.length, recovered });
  }
  return { attempted: pending.length, recovered };
}
