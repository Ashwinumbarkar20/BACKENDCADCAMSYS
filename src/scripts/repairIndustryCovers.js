/**
 * Reassign industry coverImage when missing or pointing at files that 404 on the API host.
 * Prefers existing seed-{slug}.svg media; creates seed art for new industries when needed.
 *
 *   node src/scripts/repairIndustryCovers.js
 *   REPAIR_MEDIA_ORIGIN=https://api.cadcamsys.com node src/scripts/repairIndustryCovers.js
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { connectDb } from "../config/db.js";
import { Industry } from "../models/Industry.js";
import { Media } from "../models/Media.js";
import { ensureUploadDir, publicUploadUrl } from "../config/uploads.js";
import { coverSvg } from "../utils/coverSvg.js";

const MEDIA_ORIGIN = (process.env.REPAIR_MEDIA_ORIGIN || "https://api.cadcamsys.com").replace(/\/$/, "");

async function fileExistsOnServer(urlOrPath) {
  const url = /^https?:\/\//i.test(urlOrPath) ? urlOrPath : `${MEDIA_ORIGIN}${urlOrPath}`;
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(15000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureSeedMedia(slug, title) {
  const fileName = `seed-${slug}.svg`;
  let media = await Media.findOne({ fileName }).lean();
  if (media && (await fileExistsOnServer(media.url))) {
    return media._id;
  }

  const uploadDir = ensureUploadDir();
  const svg = coverSvg({ title, kicker: "Industry", palette: "industry" });
  fs.writeFileSync(path.join(uploadDir, fileName), svg, "utf8");
  const url = publicUploadUrl(fileName);

  const doc = await Media.findOneAndUpdate(
    { fileName },
    {
      $set: {
        fileName,
        originalName: `${title}.svg`,
        url,
        mimeType: "image/svg+xml",
        size: Buffer.byteLength(svg),
        altText: title,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const onServer = await fileExistsOnServer(url);
  console.log(`  Created seed art ${fileName} (on API host: ${onServer ? "yes" : "no — copy uploads/ to server"})`);
  return doc._id;
}

await connectDb();

const industries = await Industry.find({}).select("title slug coverImage").lean();
let repaired = 0;
let skipped = 0;

for (const ind of industries) {
  let currentUrl = null;
  if (ind.coverImage) {
    const media = await Media.findById(ind.coverImage).select("url fileName").lean();
    currentUrl = media?.url ?? null;
  }

  const coverOk = currentUrl ? await fileExistsOnServer(currentUrl) : false;
  if (coverOk) {
    console.log(`OK  ${ind.slug}`);
    continue;
  }

  const reason = !ind.coverImage ? "no cover" : `missing file ${currentUrl}`;
  console.log(`FIX ${ind.slug} (${reason})`);

  const seedId = await ensureSeedMedia(ind.slug, ind.title);
  const seedMedia = await Media.findById(seedId).select("url").lean();
  if (!seedMedia || !(await fileExistsOnServer(seedMedia.url))) {
    console.log(`  SKIP ${ind.slug} — seed file not reachable at ${MEDIA_ORIGIN}`);
    skipped += 1;
    continue;
  }

  await Industry.findByIdAndUpdate(ind._id, { $set: { coverImage: seedId } });
  repaired += 1;
  console.log(`  → ${seedMedia.url}`);
}

console.log(`\nRepaired ${repaired} industr${repaired === 1 ? "y" : "ies"}. Skipped ${skipped}.`);
process.exit(0);
