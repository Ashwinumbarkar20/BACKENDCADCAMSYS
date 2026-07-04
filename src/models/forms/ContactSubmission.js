import mongoose from "mongoose";

const ContactSubmissionSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    name: { type: String, required: true },
    company: { type: String, default: "" },
    designation: { type: String, default: "" },
    email: { type: String, required: true, index: true },
    phone: { type: String, default: "" },
    country: { type: String, default: "" },
    levelOfInterest: { type: String, default: "" },
    industry: { type: String, default: "" },
    message: { type: String, default: "" },
    sourcePage: { type: String, default: "" },
  },
  { timestamps: true }
);

export const ContactSubmission = mongoose.model("ContactSubmission", ContactSubmissionSchema);

