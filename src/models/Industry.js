import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";
import { FAQSchema } from "../schemas/faq.schema.js";
import { KpiBenefitSchema } from "../schemas/kpiBenefit.schema.js";
import { publishablePlugin } from "./plugins/publishable.js";

const PdfItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    file: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
  },
  { _id: false }
);

const IndustrySchema = new mongoose.Schema(
  {
    sortOrder: { type: Number, default: 0, index: true },
    // Admin-editable titles for the public sections (blank = built-in default).
    sectionTitles: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    coverImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    headline: { type: String, default: "" },
    overview: { type: String, default: "" },

    // Downloadable brochures/datasheets shown on the public industry page.
    // Each download is gated behind a name/mobile/email lead form.
    pdfs: { type: [PdfItemSchema], default: [] },

    workflow: [{ type: String }],
    painPoints: [{ type: String }],
    benefits: [{ type: String }],

    kpiBenefits: { type: [KpiBenefitSchema], default: [] },

    // Industries link to specific Products. Solutions are derived from each
    // product's `solution` parent at display time (no separate solutions array).
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product", index: true }],
    caseStudies: [{ type: mongoose.Schema.Types.ObjectId, ref: "CaseStudy" }],
    testimonials: [{ type: mongoose.Schema.Types.ObjectId, ref: "Testimonial" }],
    blogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Blog" }],
    tutorials: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tutorial" }],

    customerLogos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
    faqs: { type: [FAQSchema], default: [] },

    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

IndustrySchema.plugin(publishablePlugin);
IndustrySchema.index({ status: 1, publishedAt: -1 });

export const Industry = mongoose.model("Industry", IndustrySchema);

