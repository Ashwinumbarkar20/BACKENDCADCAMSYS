/**
 * Seeds the Footer singleton so the public footer is driven by the admin
 * instead of falling back to the hardcoded defaults in the frontend.
 *
 * Run:
 *   node src/scripts/seedFooter.js   (or: npm run seed:footer)
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { Footer } from "../models/Footer.js";

const data = {
  brandDescription:
    "Production-grade CAM, nesting, quoting, and scheduling for modern fabrication — powered by Alma technology.",
  columns: [
    {
      title: "Solutions",
      links: [
        { label: "All solutions", url: "/solutions" },
        { label: "Products", url: "/products" },
        { label: "Industries", url: "/industries" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Case Studies", url: "/case-studies" },
        { label: "Blog / Insights", url: "/blogs" },
        { label: "News", url: "/news" },
        { label: "Tutorials", url: "/tutorials" },
        { label: "Testimonials", url: "/testimonials" },
        { label: "ROI Center", url: "/roi-center" },
        { label: "Downloads", url: "/downloads" },
      ],
    },
    {
      title: "Support & Services",
      links: [
        { label: "Support & Services", url: "/services" },
        { label: "Implementation Consulting", url: "/implementation-consulting" },
        { label: "Training", url: "/training" },
        { label: "AMC", url: "/amc" },
        { label: "Post Processor Development", url: "/post-processor-development" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", url: "/about" },
        { label: "Alma Technology Partner", url: "/alma-technology-partner" },
        { label: "Careers", url: "/careers" },
        { label: "Contact Us", url: "/contact" },
        { label: "Book a Demo", url: "/book-demo" },
      ],
    },
  ],
  copyrightText: `© ${new Date().getFullYear()} CADCAM Automation Systems. All rights reserved.`,
};

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected\n");

  const res = await Footer.findOneAndUpdate(
    { singletonKey: "global" },
    { $set: data, $setOnInsert: { singletonKey: "global" } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );

  console.log("▸ Footer");
  res.columns.forEach((c) => console.log(`  • ${c.title} (${c.links.length} links)`));
  console.log(`\n✓ Footer seeded (${res.columns.length} columns).`);

  await mongoose.disconnect();
  console.log("✓ Disconnected");
}

main().catch(async (err) => {
  console.error("\n✗ Footer seed failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
