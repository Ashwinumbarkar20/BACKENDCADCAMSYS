/**
 * Seeds the "About" singleton — the content behind the public /about page,
 * edited from the "About Us" tab in the admin portal.
 *
 * This replaces the old approach of editing About through the generic Custom
 * Pages list. Safe to run multiple times (upsert on singletonKey:"global").
 *
 * Run:
 *   node src/scripts/seedAbout.js
 * or:
 *   npm run seed:about
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { About } from "../models/About.js";

const about = {
  heading: "About CADCAMSYS",
  tagline: "We make manufacturing faster.",
  intro:
    "<p>CADCAMSYS delivers production-grade CAM, nesting, quoting, and scheduling to fabrication shops across India and beyond — powered by Alma technology. As the trusted Alma technology partner, we bring world-class CAD/CAM, nesting, and robotics software to fabricators, backed by local implementation, training, and support.</p>",
  mission:
    "Give every fabrication shop the CAM, quoting, and scheduling tools to compete with the largest manufacturers in the world.",
  vision:
    "Software should pay for itself on the shop floor. Every deployment is measured in material saved, quotes won, and machines kept busy.",
  highlights: [
    {
      icon: "target",
      title: "Best nesting in the world",
      description:
        "Alma develops its nesting engine in-house — recognized among the best globally — so you save more material on every sheet.",
    },
    {
      icon: "users",
      title: "Local implementation & support",
      description:
        "On-site implementation, training, AMC, and custom post-processor development from a team that speaks the language of your floor.",
    },
    {
      icon: "chart",
      title: "Measured results",
      description:
        "Customers see 10–15% material savings, 3x faster quoting, and dramatically higher machine utilization.",
    },
  ],
  seo: {
    metaTitle: "About CADCAMSYS",
    metaDescription:
      "CADCAMSYS delivers production-grade CAM, nesting, quoting, and scheduling to fabrication shops — powered by Alma technology.",
  },
};

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected\n");

  const result = await About.findOneAndUpdate(
    { singletonKey: "global" },
    { $set: about, $setOnInsert: { singletonKey: "global" } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );

  console.log("▸ About");
  console.log(`  • heading: ${result.heading}`);
  console.log(`  • highlights: ${result.highlights.length}`);
  console.log("\n✓ About singleton seeded.");

  await mongoose.disconnect();
  console.log("✓ Disconnected");
}

main().catch(async (err) => {
  console.error("\n✗ About seed failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
