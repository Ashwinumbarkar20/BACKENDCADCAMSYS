import { ConsultationBooking } from "../../models/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, fail } from "../../utils/apiResponse.js";
import { assertSlotAvailable } from "../../services/appointmentSlots.js";
import { rescheduleBooking, cancelBooking, retryPendingMeetings } from "../../services/bookingService.js";

/**
 * Admin actions on demo bookings (FRD §14).
 *
 * View/delete come from the generic lead CRUD; reschedule and cancel need the
 * Zoho side kept in step, so they live here.
 */

/** PUT /api/admin/leads/consultation-bookings/:id/reschedule */
export const rescheduleBookingAdmin = asyncHandler(async (req, res) => {
  const booking = await ConsultationBooking.findById(req.params.id);
  if (!booking) return fail(res, 404, "NOT_FOUND", "Booking not found");
  if (booking.status === "cancelled") {
    return fail(res, 400, "CANCELLED", "This booking is cancelled — it can't be rescheduled.");
  }

  const ymd = String(req.body?.bookingYmd || "").trim();
  const time = String(req.body?.preferredTime || "").trim();
  if (!ymd || !time) {
    return fail(res, 400, "MISSING_FIELDS", "A new date and time are required.");
  }

  // Same rules as a public booking, ignoring this booking's own slot.
  await assertSlotAvailable(ymd, time, { excludeId: booking._id });

  const updated = await rescheduleBooking(booking, { ymd, time });
  return ok(res, updated);
});

/** PUT /api/admin/leads/consultation-bookings/:id/cancel */
export const cancelBookingAdmin = asyncHandler(async (req, res) => {
  const booking = await ConsultationBooking.findById(req.params.id);
  if (!booking) return fail(res, 404, "NOT_FOUND", "Booking not found");
  if (booking.status === "cancelled") return ok(res, booking);

  const updated = await cancelBooking(booking);
  return ok(res, updated);
});

/** POST /api/admin/leads/consultation-bookings/retry-meetings */
export const retryMeetingsAdmin = asyncHandler(async (_req, res) => {
  const result = await retryPendingMeetings({ limit: 25 });
  return ok(res, result);
});
