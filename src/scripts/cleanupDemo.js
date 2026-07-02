/**
 * Removes stale demo records left over from `seed:demo` that are NOT part of
 * the current navigation-aligned catalog (seed:catalog). This fixes duplicate /
 * cover-less cards on the public Industries, Products, and Solutions pages
 * (e.g. an old "HVAC Manufacturing" duplicating "HVAC", or a cover-less
 * "Aerospace & Precision").
 *
 * Keep-lists below mirror seedCatalog.js. Anything whose slug is not in the
 * keep-list for its collection is deleted. Re-running seed:catalog re-creates
 * the intended set; re-running seed:demo would re-introduce the stale ones.
 *
 * Run:  node src/scripts/cleanupDemo.js   |   npm run cleanup:demo
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { Industry, Product, Solution } from "../models/index.js";

const KEEP = {
  Industry: [
    "sheet-metal-fabrication",
    "hvac",
    "automotive-components",
    "electrical-enclosures",
    "heavy-engineering",
    "architecture-cladding",
    "oem-manufacturing",
    "tube-profile-processing",
  ],
  Product: [
    "almacam-cut",
    "almacam-punch",
    "almacam-combi",
    "almacam-routing",
    "almacam-nester",
    "almacam-tube",
    "almacam-space-cut",
    "almacam-cube",
    "almaquote",
    "webquote",
    "production-management",
    "workshop-scheduler",
    "olp-welding",
    "olp-cutting",
  ],
  Solution: [
    "2d-cam-solutions",
    "nesting-optimization",
    "3d-cam-solutions",
    "quotation-costing",
    "erp-production-integration",
    "robotics",
  ],
};

async function clean(Model, keep, label) {
  const stale = await Model.find({ slug: { $nin: keep } }).select("slug title").lean();
  if (stale.length === 0) {
    console.log(`  ${label}: nothing stale`);
    return;
  }
  console.log(`  ${label}: removing ${stale.length} → ${stale.map((s) => s.slug).join(", ")}`);
  await Model.deleteMany({ slug: { $nin: keep } });
}

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected\n");

  console.log("▸ Cleaning stale demo records");
  await clean(Industry, KEEP.Industry, "Industries");
  await clean(Product, KEEP.Product, "Products");
  await clean(Solution, KEEP.Solution, "Solutions");

  console.log("\n✓ Cleanup complete. Public listings now show only the catalog set.");
  await mongoose.disconnect();
  console.log("✓ Disconnected");
}

main().catch(async (err) => {
  console.error("\n✗ Cleanup failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
