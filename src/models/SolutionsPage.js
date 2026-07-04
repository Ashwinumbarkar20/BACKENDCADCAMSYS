import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";

const HeroSchema = new mongoose.Schema(
  {
    eyebrow: { type: String, default: "" },
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
  },
  { _id: false },
);

const SolutionsPageSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "global", unique: true, index: true },
    hero: { type: HeroSchema, default: () => ({}) },
    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const SolutionsPage = mongoose.model("SolutionsPage", SolutionsPageSchema);
