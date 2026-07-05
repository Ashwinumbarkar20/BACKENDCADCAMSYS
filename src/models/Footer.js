import mongoose from "mongoose";

const FooterLinkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const FooterColumnSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    links: { type: [FooterLinkSchema], default: [] },
  },
  { _id: false }
);

const FooterSocialLinksSchema = new mongoose.Schema(
  {
    linkedin: { type: String, default: "" },
    x: { type: String, default: "" },
    facebook: { type: String, default: "" },
    instagram: { type: String, default: "" },
  },
  { _id: false }
);

const FooterSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "global", unique: true, index: true },
    columns: { type: [FooterColumnSchema], default: [] },
    /** Fixed social column (LinkedIn, X, Facebook, Instagram) for the public footer */
    socialLinks: { type: FooterSocialLinksSchema, default: () => ({}) },
    copyrightText: { type: String, default: "" },
    /** Optional footer brand blurb; logo still comes from Settings */
    brandDescription: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Footer = mongoose.model("Footer", FooterSchema);

