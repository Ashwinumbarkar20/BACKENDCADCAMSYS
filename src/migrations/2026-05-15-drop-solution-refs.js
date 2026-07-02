/**
 * One-time cleanup: remove obsolete Solution-reference fields from existing
 * documents. Safe to run multiple times — already-clean docs are a no-op.
 *
 * Background: Solutions are now treated as parent containers. Cross-content
 * always links to specific Products; the website derives Related Solutions
 * from `relatedProducts[].solution`. See:
 *   - models/Blog.js, Product.js, Industry.js, CaseStudy.js, Testimonial.js
 *
 * Run from the backend directory:
 *   npm run migrate:drop-solution-refs
 * or:
 *   node src/migrations/2026-05-15-drop-solution-refs.js
 *
 * Reads MONGODB_URI from the same .env the app uses.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import {
  Blog,
  Product,
  Industry,
  CaseStudy,
  Testimonial,
} from "../models/index.js";

const TARGETS = [
  { Model: Blog, field: "relatedSolutions" },
  { Model: Product, field: "relatedSolutions" },
  { Model: Industry, field: "solutions" },
  { Model: CaseStudy, field: "solutions" },
  { Model: Testimonial, field: "solutions" },
];

async function unsetField(Model, field) {
  // Use the native driver — Mongoose's strict mode silently drops $unset for
  // fields that no longer exist on the schema, which is exactly what we have
  // here (the fields were removed from the model in this commit).
  const coll = Model.collection;
  const before = await coll.countDocuments({ [field]: { $exists: true } });
  const result = await coll.updateMany({}, { $unset: { [field]: "" } });
  return {
    collection: coll.collectionName,
    field,
    documentsWithField: before,
    modified: result.modifiedCount,
  };
}

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected");

  const summary = [];
  for (const { Model, field } of TARGETS) {
    const res = await unsetField(Model, field);
    summary.push(res);
    console.log(
      `  ${res.collection}.${res.field}: ${res.documentsWithField} had it → ${res.modified} cleared`,
    );
  }

  const totalModified = summary.reduce((sum, r) => sum + r.modified, 0);
  console.log(`\n✓ Done. ${totalModified} document(s) updated.`);

  await mongoose.disconnect();
  console.log("✓ Disconnected");
}

main().catch(async (err) => {
  console.error("\n✗ Migration failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
