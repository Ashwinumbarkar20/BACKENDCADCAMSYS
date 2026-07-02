import mongoose from "mongoose";

const SupportRequestSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    company: { type: String, default: "" },
    email: { type: String, required: true, index: true },
    product: { type: String, default: "" },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    issueDescription: { type: String, required: true },
    attachment: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
  },
  { timestamps: true }
);

export const SupportRequest = mongoose.model("SupportRequest", SupportRequestSchema);

