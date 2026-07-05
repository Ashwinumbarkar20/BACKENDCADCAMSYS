import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";

const ContactInfoSchema = new mongoose.Schema(
  {
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    mapEmbedUrl: { type: String, default: "" },
  },
  { _id: false }
);

const SocialLinkSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    url: { type: String, default: "" },
  },
  { _id: false }
);

const SettingsSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "global", unique: true, index: true },

    siteName: { type: String, default: "" },
    siteUrl: { type: String, default: "" },
    tagline: { type: String, default: "" },

    logo: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    favicon: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },

    contactInfo: { type: ContactInfoSchema, default: () => ({}) },
    socialLinks: { type: [SocialLinkSchema], default: [] },

    seoDefaults: { type: SeoSchema, default: () => ({}) },
    googleAnalyticsId: { type: String, default: "" },
    zohoBookingUrl: { type: String, default: "" },
    themeId: { type: String, default: "compassion-rose" },
    themeColors: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    customThemes: {
      type: [
        new mongoose.Schema(
          {
            id: { type: String, required: true },
            label: { type: String, required: true },
            primary: { type: String, required: true },
            background: { type: String, required: true },
            accent: { type: String, default: "" },
            highlight: { type: String, default: "" },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", SettingsSchema);

