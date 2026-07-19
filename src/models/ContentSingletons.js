import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";

// A reusable "item" — icon + title + description — rendered as a card/row on the
// public page (e.g. a service, a capability, a reason).
const ContentItemSchema = new mongoose.Schema(
  {
    icon: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false },
);

// Shared shape for simple, structured content singletons that are edited from a
// dedicated admin tab (like About). Used for "Alma Technology Partner" and
// "Support & Services". Each model is its own singleton collection.
function buildContentSingletonSchema() {
  return new mongoose.Schema(
    {
      singletonKey: { type: String, default: "global", unique: true, index: true },
      heading: { type: String, default: "" },
      tagline: { type: String, default: "" },
      heroImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
      intro: { type: String, default: "" }, // rich text (HTML)
      items: { type: [ContentItemSchema], default: [] },
      seo: { type: SeoSchema, default: () => ({}) },
    },
    { timestamps: true },
  );
}

export const Alma = mongoose.model("Alma", buildContentSingletonSchema());
export const ServicePage = mongoose.model("ServicePage", buildContentSingletonSchema());

// ROI Center — intro content around the public ROI calculator.
export const Roi = mongoose.model("Roi", buildContentSingletonSchema());

// Downloads — an admin-managed list of downloadable files (PDFs, brochures…).
const DownloadItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    file: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
  },
  { _id: false },
);
const DownloadsSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "global", unique: true, index: true },
    heading: { type: String, default: "Downloads" },
    tagline: { type: String, default: "" },
    intro: { type: String, default: "" },
    items: { type: [DownloadItemSchema], default: [] },
    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true },
);
export const DownloadsPage = mongoose.model("DownloadsPage", DownloadsSchema);

// Service sub-pages, each edited from its own tab under "Support & Services".
export const Amc = mongoose.model("Amc", buildContentSingletonSchema());
export const Training = mongoose.model("Training", buildContentSingletonSchema());
export const PostProcessor = mongoose.model("PostProcessor", buildContentSingletonSchema());
export const ImplementationConsulting = mongoose.model(
  "ImplementationConsulting",
  buildContentSingletonSchema(),
);
