import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";
import { publishablePlugin } from "./plugins/publishable.js";

const CareerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },

    department: { type: String, default: "" },
    location: { type: String, default: "" },
    employmentType: { type: String, default: "" },
    experienceLevel: { type: String, default: "" },

    overview: { type: String, default: "" },
    responsibilities: [{ type: String }],
    requirements: [{ type: String }],
    niceToHave: [{ type: String }],
    benefits: [{ type: String }],

    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

CareerSchema.plugin(publishablePlugin);
CareerSchema.index({ status: 1, publishedAt: -1 });

export const Career = mongoose.model("Career", CareerSchema);
