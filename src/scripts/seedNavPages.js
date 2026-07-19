/**
 * Creates and PUBLISHES the custom pages that the "About Us" navigation dropdown
 * links to but which did not exist yet:
 *   - /alma-technology-partner  → Page slug "alma-technology-partner"
 *   - /services                 → Page slug "services" ("Support & Services")
 *
 * These are ordinary Custom Pages, so once created the admin can edit them under
 * Admin → Custom Pages. The navigation is already wired to their slugs
 * (linkType: "page"), so publishing them makes the menu links work.
 *
 * Idempotent: content is only written on first insert (so admin edits are never
 * overwritten), but status is always set to "published".
 *
 * Run:
 *   node src/scripts/seedNavPages.js
 * or:
 *   npm run seed:nav-pages
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { Page } from "../models/Page.js";

const pages = [
  {
    slug: "alma-technology-partner",
    title: "Alma Technology Partner",
    sections: [
      {
        type: "hero",
        title: "Powered by Alma",
        content:
          "The unified CAD-CAM platform for nesting, cutting, and robotics — delivered and supported locally by CADCAMSYS.",
      },
      {
        type: "text",
        title: "A global engine, delivered locally",
        content:
          "Alma's software runs in thousands of plants worldwide. As your local partner, we handle implementation, training, and post-processor development so you get world-class technology with hands-on support.",
      },
      {
        type: "text",
        title: "One platform, every process",
        content:
          "2D and 3D CAM, true-shape nesting, quoting, production management, and robotics — integrated and Industry 4.0 ready.",
      },
    ],
    seo: {
      metaTitle: "Alma Technology Partner",
      metaDescription:
        "CADCAMSYS is the authorized Alma technology partner, bringing the unified CAD-CAM platform for nesting, cutting, and robotics to your shop.",
    },
  },
  {
    slug: "services",
    title: "Support & Services",
    sections: [
      {
        type: "hero",
        title: "Services that protect your investment",
        content:
          "From first install to ongoing optimization, our team keeps your software delivering on the floor.",
      },
      {
        type: "text",
        title: "Implementation Consulting",
        content:
          "We scope your machines, workflows, and ERP, then deploy and validate so you're in production fast.",
      },
      {
        type: "text",
        title: "Training",
        content: "Role-based training for programmers, estimators, and managers — onsite or remote.",
      },
      {
        type: "text",
        title: "AMC & Post-Processor Development",
        content:
          "Annual maintenance contracts and custom post-processors keep every machine running optimally.",
      },
    ],
    seo: {
      metaTitle: "Support & Services",
      metaDescription:
        "Implementation, training, AMC, and custom post-processor development to get the most from your CAD/CAM investment.",
    },
  },
];

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected\n");

  const now = new Date();
  for (const p of pages) {
    const res = await Page.findOneAndUpdate(
      { slug: p.slug },
      {
        // Always publish; only set content/title on first insert.
        $set: { status: "published", publishedAt: now },
        $setOnInsert: {
          slug: p.slug,
          title: p.title,
          pageType: "default",
          sections: p.sections,
          seo: p.seo,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
    console.log(`  ✓ ${p.slug} → "${res.title}" (status: ${res.status})`);
  }

  console.log("\n✓ Nav pages published.");
  await mongoose.disconnect();
  console.log("✓ Disconnected");
}

main().catch(async (err) => {
  console.error("\n✗ seedNavPages failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
