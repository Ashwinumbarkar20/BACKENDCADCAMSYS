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
    // Company/customer photo shown beside the challenge on the public page.
    companyPhoto: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },

    // `industry` (single) is kept for list cards + the industry filter; it is
    // derived from industries[0] on save. `industries` is the multi-select the
    // admin edits and the public page renders.
    industry: { type: mongoose.Schema.Types.ObjectId, ref: "Industry", index: true },
    industries: [{ type: mongoose.Schema.Types.ObjectId, ref: "Industry" }],
    // Always link to specific products. The Solution can be derived from each
    // product's `solution` parent when the website needs to group by solution.
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    challenge: { type: String, default: "" },
    // Optional bullet points shown under the challenge paragraph.
    challengePoints: { type: [String], default: [] },
    sections: { type: [CaseStudySectionSchema], default: [] },
    results: { type: [ResultSchema], default: [] },

    // `testimonial` (single) kept for back-compat; `testimonials` is the
    // multi-select the admin edits and the public page renders.
    testimonial: { type: mongoose.Schema.Types.ObjectId, ref: "Testimonial" },
    testimonials: [{ type: mongoose.Schema.Types.ObjectId, ref: "Testimonial" }],

    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

CaseStudySchema.plugin(publishablePlugin);
CaseStudySchema.index({ status: 1, publishedAt: -1 });

export const CaseStudy = mongoose.model("CaseStudy", CaseStudySchema);
