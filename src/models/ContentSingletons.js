import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";
import { PRIVACY_DEFAULTS } from "../config/privacyPolicyDefault.js";

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
      // Small uppercase label shown above the page title (hero eyebrow).
      eyebrow: { type: String, default: "" },
      heading: { type: String, default: "" },
      tagline: { type: String, default: "" },
      heroImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
      // Optional brand/partner logo shown beside the intro.
      logo: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
      intro: { type: String, default: "" }, // rich text (HTML)
      items: { type: [ContentItemSchema], default: [] },
      seo: { type: SeoSchema, default: () => ({}) },
    },
    { timestamps: true },
  );
}

export const Alma = mongoose.model("Alma", buildContentSingletonSchema());
export const ServicePage = mongoose.model("ServicePage", buildContentSingletonSchema());

// Book a demo + Contact pages — heading/intro shown above their forms.
export const BookDemoPage = mongoose.model("BookDemoPage", buildContentSingletonSchema());
export const ContactPage = mongoose.model("ContactPage", buildContentSingletonSchema());

// Privacy policy — a list of sections rather than one blob of HTML, so the
// admin adds/reorders sections and fills in a paragraph, bullet points, or
// both, without writing markup.
const PolicySectionSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "" },
    text: { type: String, default: "" }, // paragraph(s); blank lines split them
    items: { type: [String], default: [] }, // bullet points
  },
  { _id: false },
);

const PrivacyPageSchema = buildContentSingletonSchema();
PrivacyPageSchema.add({ sections: { type: [PolicySectionSchema], default: () => [] } });
PrivacyPageSchema.path("eyebrow").default(PRIVACY_DEFAULTS.eyebrow);
PrivacyPageSchema.path("heading").default(PRIVACY_DEFAULTS.heading);
PrivacyPageSchema.path("tagline").default(PRIVACY_DEFAULTS.tagline);
PrivacyPageSchema.path("sections").default(() => PRIVACY_DEFAULTS.sections);
export const PrivacyPage = mongoose.model("PrivacyPage", PrivacyPageSchema);

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
