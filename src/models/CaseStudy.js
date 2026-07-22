import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";
import { CaseStudySectionSchema } from "../schemas/caseStudySection.schema.js";
import { publishablePlugin } from "./plugins/publishable.js";

const ResultSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    oldValue: { type: String, default: "" },
    newValue: { type: String, default: "" },
  },
  { _id: false }
);

const CaseStudySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },

    customerName: { type: String, default: "" },
    customerLogo: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },

    industry: { type: mongoose.Schema.Types.ObjectId, ref: "Industry", index: true },
    // Always link to specific products. The Solution can be derived from each
    // product's `solution` parent when the website needs to group by solution.
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    challenge: { type: String, default: "" },
    // Optional bullet points shown under the challenge paragraph.
    challengePoints: { type: [String], default: [] },
    sections: { type: [CaseStudySectionSchema], default: [] },
    results: { type: [ResultSchema], default: [] },

    testimonial: { type: mongoose.Schema.Types.ObjectId, ref: "Testimonial" },

    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

CaseStudySchema.plugin(publishablePlugin);
CaseStudySchema.index({ status: 1, publishedAt: -1 });

export const CaseStudy = mongoose.model("CaseStudy", CaseStudySchema);
