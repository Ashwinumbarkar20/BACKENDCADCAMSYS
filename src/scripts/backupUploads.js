/**
 * Backup / restore media files on disk (MongoDB records are separate).
 *
 *   node src/scripts/backupUploads.js          # sync uploads ↔ backup folder
 *   node src/scripts/backupUploads.js restore  # restore missing files from backup only
 *
 * Set UPLOADS_BACKUP_DIR in .env (absolute path on production).
 */
import "dotenv/config";
import { syncUploadsWithBackup } from "../utils/uploadsBackup.js";

const backupDir = process.env.UPLOADS_BACKUP_DIR?.trim();
if (!backupDir) {
  console.error("UPLOADS_BACKUP_DIR is not set in .env");
  process.exit(1);
}

const mode = process.argv[2];
const result = syncUploadsWithBackup(backupDir);

console.log(`Upload dir:  ${result.uploadDir}`);
console.log(`Backup dir:  ${result.backupDir}`);

if (mode === "restore") {
  console.log(`Restored ${result.restored.length} file(s) from backup.`);
  if (result.restored.length) result.restored.forEach((f) => console.log(`  + ${f}`));
} else {
  console.log(`Restored ${result.restored.length} missing file(s) from backup.`);
  if (result.restored.length) result.restored.forEach((f) => console.log(`  + ${f}`));
  console.log(`Backed up ${result.backedUp.length} new file(s) to backup.`);
  if (result.backedUp.length) result.backedUp.forEach((f) => console.log(`  → ${f}`));
}

process.exit(0);
