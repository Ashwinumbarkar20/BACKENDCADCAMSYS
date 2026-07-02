import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";
import { publishablePlugin } from "./plugins/publishable.js";

// One bullet-pointed unit inside a top-level section. Overview is Mixed so the
// admin can store rich text (HTML), JSON, or plain text without schema churn.
const DetailSectionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    overview: { type: mongoose.Schema.Types.Mixed, default: "" },
    points: [{ type: String }],
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
  },
  { _id: false }
);

// Top-level section ("About the Product", "Key Benefits", etc). `order` lets
// the admin reorder visually; the API also returns sections in array order.
const BlogSectionSchema = new mongoose.Schema(
  {
    sectionTitle: { type: String, required: true },
    detailSections: { type: [DetailSectionSchema], default: [] },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

// Wrapper kept literal to match the spec — allows for future additions
// (e.g. introVideo, introCta) without breaking the persisted shape.
const IntroductionSchema = new mongoose.Schema(
  {
    introduction: { type: mongoose.Schema.Types.Mixed, default: "" },
  },
  { _id: false }
);

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    excerpt: { type: String, required: true },

    // Hero images — Media refs (so the central library + MediaPicker keep
    // working). Capped at 4 to match the spec.
    images: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
      validate: {
        validator: (v) => !v || v.length <= 4,
        message: "Maximum 4 hero images allowed.",
      },
      default: [],
    },

    tags: [{ type: String, index: true }],

    introduction: { type: IntroductionSchema, default: () => ({}) },
    sections: { type: [BlogSectionSchema], default: [] },

    // Solutions are containers — link to specific Products; the public site
    // derives any "Related solutions" badges from `relatedProducts[].solution`.
    relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    relatedIndustries: [{ type: mongoose.Schema.Types.ObjectId, ref: "Industry" }],
    relatedCaseStudies: [{ type: mongoose.Schema.Types.ObjectId, ref: "CaseStudy" }],

    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

BlogSchema.plugin(publishablePlugin);
BlogSchema.index({ status: 1, publishedAt: -1 });

export const Blog = mongoose.model("Blog", BlogSchema);
