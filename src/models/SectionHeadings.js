import mongoose from "mongoose";

/**
 * Site-wide defaults for the section headings on Product / Solution / Industry
 * detail pages.
 *
 * Each detail page already supports per-item overrides via its own
 * `sectionTitles`, but with a couple of hundred products, renaming "Key
 * features" meant editing every one of them. These are the values used when an
 * item leaves its own field blank, so one edit here re-labels the whole catalog.
 *
 * Resolution order on the public site: item's own sectionTitles → this → the
 * built-in default baked into the page.
 *
 * Stored as free-form maps keyed exactly like `sectionTitles` (e.g. `keyFeatures`
 * and `keyFeaturesEyebrow`), so adding a section to a page needs no migration.
 */
const SectionHeadingsSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "global", unique: true, index: true },
    product: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    solution: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    industry: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

export const SectionHeadings = mongoose.model("SectionHeadings", SectionHeadingsSchema);
