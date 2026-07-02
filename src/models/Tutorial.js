import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";
import { publishablePlugin } from "./plugins/publishable.js";

const TutorialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    videoUrl: { type: String, default: "" },
    featuredImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    content: { type: String, default: "" },

    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    industries: [{ type: mongoose.Schema.Types.ObjectId, ref: "Industry" }],

    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

TutorialSchema.plugin(publishablePlugin);
TutorialSchema.index({ status: 1, publishedAt: -1 });

export const Tutorial = mongoose.model("Tutorial", TutorialSchema);

