import mongoose from "mongoose";

const RobotsSchema = new mongoose.Schema(
  {
    index: { type: Boolean, default: true },
    follow: { type: Boolean, default: true },
    noarchive: { type: Boolean, default: false },
    nosnippet: { type: Boolean, default: false },
  },
  { _id: false }
);

export const SeoSchema = new mongoose.Schema(
  {
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    keywords: [{ type: String }],
    canonicalUrl: { type: String, default: "" },
    robots: { type: RobotsSchema, default: () => ({}) },

    ogTitle: { type: String, default: "" },
    ogDescription: { type: String, default: "" },
    ogImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    ogType: { type: String, default: "website" },

    twitterCard: { type: String, default: "summary_large_image" },
    twitterTitle: { type: String, default: "" },
    twitterDescription: { type: String, default: "" },
    twitterImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },

    structuredData: { type: mongoose.Schema.Types.Mixed },
    breadcrumbTitle: { type: String, default: "" },

    includeInSitemap: { type: Boolean, default: true, index: true },
    sitemapPriority: { type: Number, default: 0.5, min: 0, max: 1 },
    changeFrequency: {
      type: String,
      enum: ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"],
      default: "weekly",
    },

    redirectUrl: { type: String, default: "" },
    socialImageAlt: { type: String, default: "" },
  },
  { _id: false }
);

