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
import {
  Alma,
  ServicePage,
  Amc,
  Training,
  PostProcessor,
  ImplementationConsulting,
  Roi,
} from "../models/ContentSingletons.js";

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

const amc = {
  heading: "Annual Maintenance Contract (AMC)",
  tagline: "Priority support, updates, and health checks year-round.",
  intro:
    "<p>Keep your CAD/CAM software updated, supported, and optimized with a CADCAMSYS AMC — so your software never holds up the floor.</p>",
  items: [
    { icon: "phone", title: "Priority technical support", description: "Fast response from engineers who know your setup." },
    { icon: "arrow-up", title: "Version upgrades", description: "Stay current with the latest features and fixes." },
    { icon: "activity", title: "Periodic health checks", description: "Proactive checks and post-processor tune-ups keep machines productive." },
  ],
  seo: { metaTitle: "Annual Maintenance Contract (AMC)", metaDescription: "Keep your CAD/CAM software updated, supported, and optimized year-round with a CADCAMSYS AMC." },
};

const training = {
  heading: "Training",
  tagline: "Role-based training that builds confidence.",
  intro:
    "<p>Get your team productive fast with structured, role-based training for programmers, estimators, and managers — onsite or remote.</p>",
  items: [
    { icon: "book", title: "Programs", description: "Foundations, advanced nesting, quoting, scheduling, and robotics — tailored to your machines and parts." },
    { icon: "monitor", title: "Delivery", description: "Onsite at your plant or remote, with hands-on exercises on your own geometry." },
  ],
  seo: { metaTitle: "Training", metaDescription: "Role-based CAD/CAM training for programmers, estimators, and managers — onsite or remote." },
};

const postProcessor = {
  heading: "Post Processor Development",
  tagline: "Your machines, your output — exactly.",
  intro:
    "<p>Custom post-processors so CADCAMSYS drives every machine on your floor exactly the way you need.</p>",
  items: [
    { icon: "cpu", title: "Any machine, any controller", description: "We develop and validate post-processors for legacy and modern controllers across all major brands." },
    { icon: "check", title: "Validated on real cuts", description: "Every post is tested on representative parts so production output is right the first time." },
  ],
  seo: { metaTitle: "Post Processor Development", metaDescription: "Custom post-processors so CADCAMSYS drives every machine on your floor exactly the way you need." },
};

const implementationConsulting = {
  heading: "Implementation Consulting",
  tagline: "From kickoff to first production part.",
  intro:
    "<p>End-to-end implementation: scope, deploy, integrate, and validate so you reach production quickly.</p>",
  items: [
    { icon: "map", title: "Our process", description: "We map machines, workflows, and ERP/MES, then deploy, integrate, and validate against your real jobs." },
    { icon: "target", title: "Outcomes", description: "A configured system, trained team, and validated programs — producing on day one." },
  ],
  seo: { metaTitle: "Implementation Consulting", metaDescription: "End-to-end implementation: scope, deploy, integrate, and validate so you reach production quickly." },
};

const roi = {
  heading: "ROI Center",
  tagline: "See what tighter nesting and faster quoting are worth to your shop.",
  intro:
    "<p>Estimate the material, labor, and throughput savings CADCAMSYS can deliver. Enter a few numbers below to model your return — most shops recover the software cost in months.</p>",
  items: [
    { icon: "layers", title: "Material savings", description: "Best-in-class true-shape nesting typically improves yield by 10–15%." },
    { icon: "clock", title: "Faster quoting", description: "Automated quoting cuts estimating time by up to 3x." },
    { icon: "trending-up", title: "Higher utilization", description: "Better scheduling keeps machines cutting, not waiting." },
  ],
  seo: { metaTitle: "ROI Center", metaDescription: "Estimate the material, labor, and throughput savings CADCAMSYS can deliver for your shop." },
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
  await upsert(Amc, "AMC", amc);
  await upsert(Training, "Training", training);
  await upsert(PostProcessor, "Post Processor Development", postProcessor);
  await upsert(ImplementationConsulting, "Implementation Consulting", implementationConsulting);
  await upsert(Roi, "ROI Center", roi);

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
