import mongoose from "mongoose";

const ROIRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    company: { type: String, default: "" },
    email: { type: String, required: true, index: true },
    currentProcess: { type: String, default: "" },
    painPoints: { type: String, default: "" },
  },
  { timestamps: true }
);

export const ROIRequest = mongoose.model("ROIRequest", ROIRequestSchema);

