import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";
import { SectionSchema } from "../schemas/section.schema.js";
import { publishablePlugin } from "./plugins/publishable.js";

const PageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    pageType: { type: String, default: "default", index: true },
    sections: { type: [SectionSchema], default: [] },
    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

PageSchema.plugin(publishablePlugin);
PageSchema.index({ status: 1, publishedAt: -1 });

export const Page = mongoose.model("Page", PageSchema);

