import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";
import { FAQSchema } from "../schemas/faq.schema.js";
import { CTASectionSchema } from "../schemas/ctaSection.schema.js";
import { publishablePlugin } from "./plugins/publishable.js";

const SolutionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    coverImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    shortDescription: { type: String, default: "" },
    overview: { type: String, default: "" },
    painPoints: [{ type: String }],
    capabilities: [{ type: String }],

    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product", index: true }],
    industries: [{ type: mongoose.Schema.Types.ObjectId, ref: "Industry", index: true }],
    blogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Blog" }],
    caseStudies: [{ type: mongoose.Schema.Types.ObjectId, ref: "CaseStudy" }],
    testimonials: [{ type: mongoose.Schema.Types.ObjectId, ref: "Testimonial" }],

    faqs: { type: [FAQSchema], default: [] },
    cta: { type: CTASectionSchema },
    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

SolutionSchema.plugin(publishablePlugin);
SolutionSchema.index({ status: 1, publishedAt: -1 });

export const Solution = mongoose.model("Solution", SolutionSchema);

