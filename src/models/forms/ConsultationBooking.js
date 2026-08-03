import mongoose from "mongoose";

/**
 * Demo bookings, plus the Zoho Meeting created for each one (FRD §8, §9).
 *
 * `bookingYmd` stores the local date as a plain "YYYY-MM-DD" string alongside
 * the Date. Everything downstream — slot conflicts, Zoho's start time, the ICS
 * file — works in Asia/Kolkata, and a plain string can't drift across a
 * timezone boundary the way a Date can.
 */
export const BOOKING_STATUSES = [
  "confirmed",
  "pending_meeting", // saved, but Zoho meeting creation failed — retried later
  "cancelled",
];

const ConsultationBookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    company: { type: String, default: "" },
    email: { type: String, required: true, index: true },
    phone: { type: String, default: "" },
    consultationType: { type: String, default: "" },
    preferredDate: { type: Date },
    bookingYmd: { type: String, default: "", index: true },
    preferredTime: { type: String, default: "" },
    sourcePage: { type: String, default: "" },
    notes: { type: String, default: "" },

    // ── Zoho Meeting ──────────────────────────────────────────
    meetingTitle: { type: String, default: "" },
    meetingId: { type: String, default: "", index: true },
    meetingKey: { type: String, default: "" },
    joinUrl: { type: String, default: "" },
    hostUrl: { type: String, default: "" },
    meetingPassword: { type: String, default: "" },
    meetingStartTime: { type: String, default: "" },
    meetingEndTime: { type: String, default: "" },
    meetingStatus: { type: String, default: "" },

    status: { type: String, enum: BOOKING_STATUSES, default: "confirmed", index: true },
    meetingError: { type: String, default: "" },
    meetingRetryCount: { type: Number, default: 0 },
    // Bumped on every reschedule/cancel so calendar clients replace the event
    // instead of adding a duplicate.
    icsSequence: { type: Number, default: 0 },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

ConsultationBookingSchema.index({ bookingYmd: 1, preferredTime: 1 });

export const ConsultationBooking = mongoose.model("ConsultationBooking", ConsultationBookingSchema);
