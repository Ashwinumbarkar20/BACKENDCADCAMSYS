/**
 * Fills the Privacy Policy singleton with the standard policy text.
 *
 * New installs get this from the schema defaults. This script is for sites
 * where the document was already created empty — it only writes fields that
 * are currently blank, so an edited policy is never overwritten.
 *
 * Run:
 *   node src/scripts/seedPrivacy.js   (or: npm run seed:privacy)
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { PrivacyPage } from "../models/ContentSingletons.js";
import { PRIVACY_DEFAULTS } from "../config/privacyPolicyDefault.js";

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected\n");

  let doc = await PrivacyPage.findOne({ singletonKey: "global" });
  if (!doc) {
    doc = await PrivacyPage.create({ singletonKey: "global" });
    console.log("▸ Created the Privacy Policy singleton with default content.");
  }

  const filled = [];
  const skipped = [];
  for (const [field, value] of Object.entries(PRIVACY_DEFAULTS)) {
    const current = doc[field];
    const isEmpty = Array.isArray(current) ? current.length === 0 : !String(current ?? "").trim();
    if (!isEmpty) {
      skipped.push(field);
      continue;
    }
    doc[field] = value;
    filled.push(field);
  }

  if (filled.length === 0) {
    console.log("✓ Nothing to do — every field already has content.");
  } else {
    await doc.save();
    console.log(`✓ Filled: ${filled.join(", ")}`);
  }
  if (skipped.length > 0) {
    console.log(`• Left alone (already edited): ${skipped.join(", ")}`);
  }

  await mongoose.disconnect();
  console.log("✓ Disconnected");
}

main().catch(async (err) => {
  console.error("\n✗ Privacy seed failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
