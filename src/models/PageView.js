import mongoose from "mongoose";

// One row per page hit. Cheap to write, easy to aggregate later.
const PageViewSchema = new mongoose.Schema(
  {
    visitor: { type: mongoose.Schema.Types.ObjectId, ref: "Visitor", required: true, index: true },
    visitorId: { type: String, index: true }, // denormalised for fast lookups by cookie id

    path: { type: String, required: true, index: true },
    title: { type: String, default: "" },
    referrer: { type: String, default: "" },

    utm: {
      source: { type: String, default: "" },
      medium: { type: String, default: "" },
      campaign: { type: String, default: "" },
      content: { type: String, default: "" },
      term: { type: String, default: "" },
    },

    viewedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

PageViewSchema.index({ viewedAt: -1 });
PageViewSchema.index({ visitor: 1, viewedAt: -1 });
PageViewSchema.index({ path: 1, viewedAt: -1 });

export const PageView = mongoose.model("PageView", PageViewSchema);
