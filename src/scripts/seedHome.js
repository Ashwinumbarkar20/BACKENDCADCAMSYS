/**
 * Seeds the Home Page singleton (the "Home Page" editor in the admin portal)
 * with sensible default copy + SEO so the public homepage renders immediately.
 *
 * Hero image / background video are Media uploads — leave them empty here and
 * set them from the admin Media picker. Re-running OVERWRITES text + SEO with
 * these defaults but never deletes media you've attached unless you've changed
 * the fields below.
 *
 * Run:
 *   node src/scripts/seedHome.js
 * or:
 *   npm run seed:home
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { HomePage } from "../models/HomePage.js";

const doc = {
  hero: {
    eyebrow: "Manufacturing software, reimagined.",
    title: "Cut, nest, quote, and schedule —",
    highlight: "in one suite.",
    subtitle:
      "Production-grade CAM, quoting, and scheduling that move the entire shop floor — from RFQ to final delivery. Trusted by fabricators across HVAC, automotive, and heavy engineering.",
    primaryCta: { label: "Book Demo", href: "/contact" },
    secondaryCta: { label: "Talk to an Expert", href: "/contact" },
    videoUrl: "",
  },
  trustBar: {
    text: "Trusted by fabrication shops across HVAC, automotive, aerospace, and heavy engineering.",
    logos: [],
  },
  ctaBand: {
    title: "Ready to see it on your parts?",
    subtitle: "Book a 30-minute demo and we'll run your geometry live.",
    primaryCta: { label: "Book Demo", href: "/contact" },
    secondaryCta: { label: "Contact Sales", href: "/contact" },
  },
  sections: {
    showTrustBar: true,
    showSolutions: true,
    showProducts: true,
    showIndustries: true,
    showProof: true,
    showNews: true,
    showCtaBand: true,
  },
  seo: {
    metaTitle: "CADCAMSYS — CAM, Nesting, Quoting & Scheduling for Fabricators",
    metaDescription:
      "CADCAMSYS gives fabrication shops production-grade CAM, true-shape nesting, automated quoting, and shop-floor scheduling. Cut, nest, quote, and schedule in one suite.",
    keywords: [
      "CAM software",
      "nesting software",
      "quoting software",
      "sheet metal fabrication software",
      "AlmaCAM",
      "production scheduling",
    ],
    ogTitle: "CADCAMSYS — Production-grade CAM, quoting, and scheduling",
    ogDescription:
      "One suite to cut, nest, quote, and schedule. Trusted by fabricators across HVAC, automotive, and heavy engineering.",
    twitterCard: "summary_large_image",
    includeInSitemap: true,
    sitemapPriority: 1.0,
    changeFrequency: "weekly",
  },
};

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected\n");

  const result = await HomePage.findOneAndUpdate(
    { singletonKey: "global" },
    { $set: doc, $setOnInsert: { singletonKey: "global" } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );

  console.log("▸ Home Page");
  console.log(`  Hero: ${result.hero.title} ${result.hero.highlight}`);
  console.log(`  SEO title: ${result.seo.metaTitle}`);
  console.log("\n✓ Home page seeded. Add a hero image / video from the admin Media picker.");

  await mongoose.disconnect();
  console.log("✓ Disconnected");
}

main().catch(async (err) => {
  console.error("\n✗ Home seed failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
