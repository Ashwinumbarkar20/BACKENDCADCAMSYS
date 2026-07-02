import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";
import { publishablePlugin } from "./plugins/publishable.js";

const ProductCategorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: "" },
    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

ProductCategorySchema.plugin(publishablePlugin);
ProductCategorySchema.index({ status: 1, publishedAt: -1 });

export const ProductCategory = mongoose.model("ProductCategory", ProductCategorySchema);

