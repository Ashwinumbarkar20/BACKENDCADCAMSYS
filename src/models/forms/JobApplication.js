import mongoose from "mongoose";

const JobApplicationSchema = new mongoose.Schema(
  {
    careerId: { type: mongoose.Schema.Types.ObjectId, ref: "Career", required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String, default: "" },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    coverLetter: { type: String, default: "" },
  },
  { timestamps: true }
);

export const JobApplication = mongoose.model("JobApplication", JobApplicationSchema);

