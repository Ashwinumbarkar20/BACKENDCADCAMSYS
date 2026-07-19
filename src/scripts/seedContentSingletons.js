/**
 * Seeds the "Alma Technology Partner" and "Support & Services" singletons — the
 * content behind /alma-technology-partner and /services, edited from their
 * dedicated admin tabs.
 *
 * Idempotent: only sets content on first insert (never overwrites admin edits).
 *
 * Run:
 *   node src/scripts/seedContentSingletons.js
 * or:
 *   npm run seed:content-singletons
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { Alma, ServicePage } from "../models/ContentSingletons.js";

const alma = {
  heading: "Alma Technology Partner",
  tagline: "Powered by Alma — delivered and supported locally by CADCAMSYS.",
  intro:
    "<p>Alma's software runs in thousands of plants worldwide. As your local partner, we handle implementation, training, and post-processor development so you get world-class CAD/CAM technology with hands-on support.</p>",
  items: [
    {
      icon: "layers",
      title: "One platform, every process",
      description:
        "2D and 3D CAM, true-shape nesting, quoting, production management, and robotics — integrated and Industry 4.0 ready.",
    },
    {
      icon: "globe",
      title: "A global engine, delivered locally",
      description:
        "Recognized among the best nesting engines in the world, backed by local implementation, training, and support.",
    },
    {
      icon: "shield",
      title: "Trusted worldwide",
      description:
        "Proven in thousands of fabrication plants across sheet metal, tube, and heavy engineering.",
    },
  ],
  seo: {
    metaTitle: "Alma Technology Partner",
    metaDescription:
      "CADCAMSYS is the authorized Alma technology partner, bringing the unified CAD-CAM platform for nesting, cutting, and robotics to your shop.",
  },
};

const services = {
  heading: "Support & Services",
  tagline: "Services that protect your CAD/CAM investment.",
  intro:
    "<p>From first install to ongoing optimization, our team keeps your software delivering on the floor — implementation, training, AMC, and custom post-processor development.</p>",
  items: [
    {
      icon: "settings",
      title: "Implementation Consulting",
      description:
        "We scope your machines, workflows, and ERP, then deploy and validate so you're in production fast.",
    },
    {
      icon: "book",
      title: "Training",
      description: "Role-based training for programmers, estimators, and managers — onsite or remote.",
    },
    {
      icon: "refresh",
      title: "Annual Maintenance Contract (AMC)",
      description: "Priority support, version upgrades, and periodic health checks year-round.",
    },
    {
      icon: "cpu",
      title: "Post-Processor Development",
      description: "Custom, validated post-processors so CADCAMSYS drives every machine on your floor.",
    },
  ],
  seo: {
    metaTitle: "Support & Services",
    metaDescription:
      "Implementation, training, AMC, and custom post-processor development to get the most from your CAD/CAM investment.",
  },
};

async function upsert(Model, label, data) {
  const res = await Model.findOneAndUpdate(
    { singletonKey: "global" },
    { $setOnInsert: { singletonKey: "global", ...data } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
  console.log(`  ✓ ${label}: "${res.heading}" (${res.items.length} items)`);
}

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected\n");

  await upsert(Alma, "Alma Technology Partner", alma);
  await upsert(ServicePage, "Support & Services", services);

  console.log("\n✓ Content singletons seeded.");
  await mongoose.disconnect();
  console.log("✓ Disconnected");
}

main().catch(async (err) => {
  console.error("\n✗ seedContentSingletons failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
