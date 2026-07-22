import mongoose from "mongoose";

// "Enroll" submissions from the Almacam training certification programme.
const EnrollmentRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    company: { type: String, default: "", trim: true },
    mobile: { type: String, default: "", trim: true },
    programme: { type: String, default: "", trim: true },
    message: { type: String, default: "" },
    sourcePage: { type: String, default: "" },
    visitor: { type: mongoose.Schema.Types.ObjectId, ref: "Visitor", index: true },
  },
  { timestamps: true },
);

EnrollmentRequestSchema.index({ createdAt: -1 });

export const EnrollmentRequest = mongoose.model("EnrollmentRequest", EnrollmentRequestSchema);
