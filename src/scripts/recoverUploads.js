/**
 * Scan MongoDB media records and try to recover missing files from backup/legacy folders.
 *
 *   node src/scripts/recoverUploads.js
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { connectDb } from "../config/db.js";
import { Media } from "../models/Media.js";
import { getUploadDir, uploadFilePathFromUrl } from "../config/uploads.js";
import {
  recoverAllUploadSources,
  getBackupDir,
  getLegacySourceDirs,
  restoreMissingFiles,
} from "../utils/uploadsBackup.js";

await connectDb();

const boot = recoverAllUploadSources();
console.log("--- Startup recovery ---");
console.log(`Upload dir:     ${boot.uploadDir} (${boot.fileCount} files)`);
console.log(`Backup dir:     ${boot.backupDir || "(not set)"}`);
console.log(`Legacy dirs:    ${boot.legacySources.join(", ") || "(none)"}`);
console.log(`Restored:       ${boot.restored.length}`);
console.log(`New backups:    ${boot.backedUp.length}\n`);

const uploadDir = getUploadDir();
const docs = await Media.find({}).select("url originalName fileName").lean();
let ok = 0;
let missing = 0;
let recovered = 0;

const searchDirs = [uploadDir, getBackupDir(), ...getLegacySourceDirs()].filter(Boolean);

for (const doc of docs) {
  const target = uploadFilePathFromUrl(doc.url);
  if (fs.existsSync(target)) {
    ok += 1;
    continue;
  }

  const base = path.basename(target);
  let found = false;

  for (const dir of searchDirs) {
    const candidate = path.join(dir, base);
    if (dir !== uploadDir && fs.existsSync(candidate)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.copyFileSync(candidate, target);
      recovered += 1;
      found = true;
      console.log(`RECOVERED  ${doc.url}  ← ${candidate}`);
      break;
    }
  }

  if (!found) {
    missing += 1;
    console.log(`MISSING    ${doc.url}  (${doc.originalName || doc.fileName})`);
  }
}

console.log(`\n${ok} OK, ${recovered} recovered, ${missing} still missing (of ${docs.length} total).`);
if (missing > 0) {
  console.log("Re-upload missing files in Admin, or copy them into the upload folder manually.");
}

process.exit(missing > 0 ? 1 : 0);
