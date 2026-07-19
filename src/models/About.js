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

// "Why Choose Us" — a section with its own heading/intro and a list of reasons.
// (Formerly a separate nav item + page; now merged into the About page.)
const WhyChooseSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "Why Choose Us" },
    intro: { type: String, default: "" },
    items: { type: [HighlightSchema], default: [] }, // icon/title/description cards
  },
  { _id: false },
);

// "Team & Expertise" — heading/intro for the team section. The individual team
// members are still managed under the Team Members collection and shown here.
const TeamSectionSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "Team & Expertise" },
    intro: { type: String, default: "" },
    showMembers: { type: Boolean, default: true }, // render the Team Members grid
  },
  { _id: false },
);

// The "About Us" page is a site-wide singleton (like Home / Solutions pages),
// edited from the dedicated "About Us" tab in the admin portal. It replaces the
// old approach of editing About through the generic Custom Pages list, and also
// absorbs the former "Why Choose Us" and "Team & Expertise" nav sections.
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

    // Merged-in sections (were separate nav items / pages).
    whyChoose: { type: WhyChooseSchema, default: () => ({}) },
    team: { type: TeamSectionSchema, default: () => ({}) },

    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const About = mongoose.model("About", AboutSchema);
