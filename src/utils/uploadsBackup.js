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

function resolveDir(dir) {
  if (!dir) return null;
  return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
}

export function getBackupDir() {
  return resolveDir(process.env.UPLOADS_BACKUP_DIR?.trim());
}

/** Extra folders to scan on startup (comma-separated env or defaults). */
export function getLegacySourceDirs() {
  const fromEnv = (process.env.UPLOADS_LEGACY_DIRS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const defaults = ["/app/uploads-legacy", "/app/uploads-bundled", "data/uploads", "uploads"];
  const seen = new Set();
  const out = [];

  for (const d of [...fromEnv, ...defaults]) {
    const resolved = resolveDir(d);
    if (!resolved || seen.has(resolved)) continue;
    seen.add(resolved);
    if (fs.existsSync(resolved)) out.push(resolved);
  }
  return out;
}

/**
 * Copy files from source → dest only when missing in dest (never overwrites live uploads).
 */
export function restoreMissingFiles(sourceDir, destDir) {
  const restored = [];
  const src = resolveDir(sourceDir);
  const dest = resolveDir(destDir);
  if (!src || !fs.existsSync(src) || !dest) return restored;

  fs.mkdirSync(dest, { recursive: true });

  for (const name of listFiles(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (!fs.existsSync(to)) {
      fs.copyFileSync(from, to);
      restored.push(name);
    }
  }
  return restored;
}

/**
 * Copy files from uploads → backup when missing in backup.
 */
export function backupNewFiles(sourceDir, backupDir) {
  const backedUp = [];
  const src = resolveDir(sourceDir);
  const dest = resolveDir(backupDir);
  if (!src || !fs.existsSync(src) || !dest) return backedUp;

  fs.mkdirSync(dest, { recursive: true });

  for (const name of listFiles(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (!fs.existsSync(to)) {
      fs.copyFileSync(from, to);
      backedUp.push(name);
    }
  }
  return backedUp;
}

/** Copy one file into backup (called on every new upload). */
export function backupFileByName(fileName) {
  const backupDir = getBackupDir();
  if (!backupDir || !fileName) return false;

  const uploadDir = getUploadDir();
  const from = path.join(uploadDir, fileName);
  if (!fs.existsSync(from)) return false;

  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(from, path.join(backupDir, fileName));
  return true;
}

/**
 * On startup: pull missing files from legacy folders + backup, then refresh backup.
 */
export function recoverAllUploadSources() {
  const uploadDir = getUploadDir();
  fs.mkdirSync(uploadDir, { recursive: true });

  const restored = [];
  const sources = [...getLegacySourceDirs()];
  const backupDir = getBackupDir();
  if (backupDir) sources.push(backupDir);

  for (const src of sources) {
    if (resolveDir(src) === resolveDir(uploadDir)) continue;
    restored.push(...restoreMissingFiles(src, uploadDir));
  }

  const backedUp = backupDir ? backupNewFiles(uploadDir, backupDir) : [];

  return {
    uploadDir,
    backupDir,
    legacySources: getLegacySourceDirs(),
    fileCount: listFiles(uploadDir).length,
    restored,
    backedUp,
  };
}

/** Restore from backup dir, then sync any new uploads into backup. */
export function syncUploadsWithBackup(backupDir) {
  const uploadDir = getUploadDir();
  if (!backupDir) {
    return { uploadDir, restored: [], backedUp: [] };
  }

  const resolvedBackup = resolveDir(backupDir);
  const restored = restoreMissingFiles(resolvedBackup, uploadDir);
  const backedUp = backupNewFiles(uploadDir, resolvedBackup);

  return { uploadDir, backupDir: resolvedBackup, restored, backedUp };
}
