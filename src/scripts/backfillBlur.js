/**
 * Backfills width/height + a blur preview (LQIP) on existing raster Media that
 * were uploaded before blur-up support existed. Vector (SVG) media is skipped.
 *
 * Run:  node src/scripts/backfillBlur.js   |   npm run backfill:blur
 */
import "dotenv/config";
import path from "node:path";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { Media } from "../models/Media.js";
import { buildImageMeta } from "../utils/imageMeta.js";

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected\n");

  const candidates = await Media.find({
    mimeType: { $regex: /^image\/(jpeg|jpg|png|webp|avif|gif|tiff)$/i },
    $or: [{ blurDataURL: { $in: [null, ""] } }, { width: { $exists: false } }],
  });

  console.log(`▸ ${candidates.length} raster image(s) to process`);
  let done = 0;
  let skipped = 0;
  for (const m of candidates) {
    const filePath = path.resolve(process.cwd(), String(m.url).replace(/^\//, ""));
    const meta = await buildImageMeta(filePath, m.mimeType);
    if (!meta.blurDataURL) {
      skipped++;
      console.log(`  skip (unreadable): ${m.url}`);
      continue;
    }
    m.width = meta.width;
    m.height = meta.height;
    m.blurDataURL = meta.blurDataURL;
    await m.save();
    done++;
    console.log(`  ✓ ${m.url} (${meta.width}×${meta.height})`);
  }

  console.log(`\n✓ Backfilled ${done}, skipped ${skipped}.`);
  await mongoose.disconnect();
  console.log("✓ Disconnected");
}

main().catch(async (err) => {
  console.error("\n✗ Backfill failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
