/**
 * Lists Media rows whose files are missing from disk.
 * Run on the same machine that serves GET /uploads/* (production API host).
 *
 *   node src/scripts/checkMediaFiles.js
 */
import "dotenv/config";
import { connectDb } from "../config/db.js";
import { Media } from "../models/Media.js";
import { uploadFilePathFromUrl } from "../config/uploads.js";
import fs from "node:fs";

await connectDb();

const docs = await Media.find({}).select("url originalName fileName").lean();
let missing = 0;

for (const doc of docs) {
  const filePath = uploadFilePathFromUrl(doc.url);
  if (!fs.existsSync(filePath)) {
    missing += 1;
    console.log(`MISSING  ${doc.url}  (${doc.originalName || doc.fileName})`);
  }
}

console.log(`\n${missing} of ${docs.length} media file(s) missing on this server.`);
if (missing > 0) {
  console.log(
    "Re-upload via Admin with VITE_API_BASE_URL pointing at this API host, or copy files into the uploads folder.",
  );
}

process.exit(missing > 0 ? 1 : 0);
