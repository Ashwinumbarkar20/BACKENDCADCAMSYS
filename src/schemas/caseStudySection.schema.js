import mongoose from "mongoose";

// Admin-defined narrative block on a case study page. Every field is optional
// so the admin can mix and match (e.g. title + paragraph only, or title + bullets + video).
export const CaseStudySectionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    paragraph: { type: String, default: "" },
    bullets: [{ type: String }],
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    videoUrl: { type: String, default: "" },
  },
  { _id: false }
);
