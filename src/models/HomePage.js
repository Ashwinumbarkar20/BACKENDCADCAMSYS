import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";

const CtaSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    href: { type: String, default: "" },
  },
  { _id: false }
);

const HeroSchema = new mongoose.Schema(
  {
    eyebrow: { type: String, default: "" },
    title: { type: String, default: "" },
    highlight: { type: String, default: "" }, // trailing emphasized phrase
    subtitle: { type: String, default: "" },
    primaryCta: { type: CtaSchema, default: () => ({}) },
    secondaryCta: { type: CtaSchema, default: () => ({}) },
    // Poster / fallback image — also used on mobile and while the video loads.
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    // Which hero background to show on the public site.
    mediaType: { type: String, enum: ["image", "video"], default: "image" },
    // Background video: an uploaded Media file OR an external URL (YouTube/Vimeo/mp4).
    videoFile: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    videoUrl: { type: String, default: "" },
  },
  { _id: false }
);

const TrustBarSchema = new mongoose.Schema(
  {
    text: { type: String, default: "" },
    logos: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }], default: [] },
  },
  { _id: false }
);

const CtaBandSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    primaryCta: { type: CtaSchema, default: () => ({}) },
    secondaryCta: { type: CtaSchema, default: () => ({}) },
  },
  { _id: false }
);

const SectionCopySchema = new mongoose.Schema(
  {
    eyebrow: { type: String, default: "" },
    title: { type: String, default: "" },
    intro: { type: String, default: "" },
  },
  { _id: false },
);

const HomeSectionsSchema = new mongoose.Schema(
  {
    showTrustBar: { type: Boolean, default: true },
    showSolutions: { type: Boolean, default: true },
    showProducts: { type: Boolean, default: true },
    showIndustries: { type: Boolean, default: true },
    showProof: { type: Boolean, default: true },
    showNews: { type: Boolean, default: true },
    showCtaBand: { type: Boolean, default: true },
    solutions: { type: SectionCopySchema, default: () => ({}) },
    products: { type: SectionCopySchema, default: () => ({}) },
    industries: { type: SectionCopySchema, default: () => ({}) },
  },
  { _id: false },
);

const HomePageSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "global", unique: true, index: true },
    hero: { type: HeroSchema, default: () => ({}) },
    trustBar: { type: TrustBarSchema, default: () => ({}) },
    ctaBand: { type: CtaBandSchema, default: () => ({}) },
    sections: { type: HomeSectionsSchema, default: () => ({}) },
    featuredSolutions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Solution" }],
    featuredProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    featuredIndustries: [{ type: mongoose.Schema.Types.ObjectId, ref: "Industry" }],
    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export const HomePage = mongoose.model("HomePage", HomePageSchema);
