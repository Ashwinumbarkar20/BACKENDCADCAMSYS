import mongoose from "mongoose";

// Admin-defined block on a News article. Each field is optional so the admin
// can mix and match — e.g. a section with just a paragraph + image URL, or a
// section that's only a video embed. URLs are plain strings (not Media refs)
// because news typically references external assets and source articles.
export const NewsSectionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    paragraph: { type: String, default: "" },
    bullets: [{ type: String }],
    imageUrl: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    newsUrl: { type: String, default: "" },
  },
  { _id: false }
);
