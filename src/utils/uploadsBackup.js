import fs from "node:fs";
import path from "node:path";
import { getUploadDir } from "../config/uploads.js";

function listFiles(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith("."))
    .map((e) => e.name);
}

/**
 * Copy files from source → dest only when missing in dest (never overwrites uploads).
 */
export function restoreMissingFiles(sourceDir, destDir) {
  const restored = [];
  if (!sourceDir || !fs.existsSync(sourceDir)) return restored;

  fs.mkdirSync(destDir, { recursive: true });

  for (const name of listFiles(sourceDir)) {
    const from = path.join(sourceDir, name);
    const to = path.join(destDir, name);
    if (!fs.existsSync(to)) {
      fs.copyFileSync(from, to);
      restored.push(name);
    }
  }
  return restored;
}

/**
 * Copy files from source → dest only when missing in dest (keeps backup up to date).
 */
export function backupNewFiles(sourceDir, backupDir) {
  const backedUp = [];
  if (!sourceDir || !fs.existsSync(sourceDir)) return backedUp;

  fs.mkdirSync(backupDir, { recursive: true });

  for (const name of listFiles(sourceDir)) {
    const from = path.join(sourceDir, name);
    const to = path.join(backupDir, name);
    if (!fs.existsSync(to)) {
      fs.copyFileSync(from, to);
      backedUp.push(name);
    }
  }
  return backedUp;
}

/** Restore from backup dir, then sync any new uploads into backup. */
export function syncUploadsWithBackup(backupDir) {
  const uploadDir = getUploadDir();
  if (!backupDir) {
    return { uploadDir, restored: [], backedUp: [] };
  }

  const resolvedBackup = path.isAbsolute(backupDir)
    ? backupDir
    : path.resolve(process.cwd(), backupDir);

  const restored = restoreMissingFiles(resolvedBackup, uploadDir);
  const backedUp = backupNewFiles(uploadDir, resolvedBackup);

  return { uploadDir, backupDir: resolvedBackup, restored, backedUp };
}
