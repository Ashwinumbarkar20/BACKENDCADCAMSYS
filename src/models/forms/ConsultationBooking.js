import mongoose from "mongoose";

const ConsultationBookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    company: { type: String, default: "" },
    email: { type: String, required: true, index: true },
    phone: { type: String, default: "" },
    consultationType: { type: String, default: "" },
    preferredDate: { type: Date },
    preferredTime: { type: String, default: "" },
    sourcePage: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const ConsultationBooking = mongoose.model("ConsultationBooking", ConsultationBookingSchema);

