import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";
import { NewsSectionSchema } from "../schemas/newsSection.schema.js";
import { publishablePlugin } from "./plugins/publishable.js";

const NewsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },

    // Cover image used on news cards in the list view. Media ref (not a URL)
    // so it goes through the central library — same pattern as Blog/Industry.
    coverImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },

    overview: { type: String, default: "" },
    sections: { type: [NewsSectionSchema], default: [] },

    // Cross-links to other News articles for "Related news" carousels.
    relatedNews: [{ type: mongoose.Schema.Types.ObjectId, ref: "News" }],

    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

NewsSchema.plugin(publishablePlugin);
NewsSchema.index({ status: 1, publishedAt: -1 });

export const News = mongoose.model("News", NewsSchema);
