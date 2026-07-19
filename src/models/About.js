import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";

// A single reusable "highlight" — an icon + short title + description.
// Rendered as a card/row on the public About page (e.g. mission pillars,
// company values, "what we do" points).
const HighlightSchema = new mongoose.Schema(
  {
    icon: { type: String, default: "" }, // icon name/key resolved on the frontend
    title: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false },
);

// The "About Us" page is a site-wide singleton (like Home / Solutions pages),
// edited from the dedicated "About Us" tab in the admin portal. It replaces the
// old approach of editing About through the generic Custom Pages list.
const AboutSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "global", unique: true, index: true },

    // Structured content fields shown on the public /about page.
    heading: { type: String, default: "" }, // main page title, e.g. "About CADCAMSYS"
    tagline: { type: String, default: "" }, // short line under the heading
    heroImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    intro: { type: String, default: "" }, // rich text (HTML) intro paragraph(s)
    mission: { type: String, default: "" },
    vision: { type: String, default: "" },
    highlights: { type: [HighlightSchema], default: [] },

    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const About = mongoose.model("About", AboutSchema);
