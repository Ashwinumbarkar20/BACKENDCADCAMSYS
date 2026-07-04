import fs from "node:fs";
import path from "node:path";
import { uploadFilePathFromUrl, getUploadDir } from "../config/uploads.js";
import { getBackupDir, getLegacySourceDirs } from "./uploadsBackup.js";

/** True when the file for a Media.url exists on this server's upload disk. */
export function mediaFileExistsOnDisk(doc) {
  if (!doc?.url) return false;
  try {
    return fs.existsSync(uploadFilePathFromUrl(doc.url));
  } catch {
    return false;
  }
}

/**
 * If the file is missing from the live upload folder, copy it from backup or legacy dirs.
 * Returns true when the file exists after recovery (or already existed).
 */
export function tryRecoverMediaFile(doc) {
  if (!doc?.url) return false;

  const target = uploadFilePathFromUrl(doc.url);
  if (fs.existsSync(target)) return true;

  const base = path.basename(target);
  if (!base) return false;

  const uploadDir = getUploadDir();
  fs.mkdirSync(uploadDir, { recursive: true });

  const sources = [getBackupDir(), ...getLegacySourceDirs()].filter(Boolean);

  for (const dir of sources) {
    if (path.resolve(dir) === path.resolve(uploadDir)) continue;
    const candidate = path.join(dir, base);
    if (fs.existsSync(candidate)) {
      fs.copyFileSync(candidate, target);
      return true;
    }
  }
  return fs.existsSync(target);
}

export function withMediaFileStatus(doc) {
  if (!doc || typeof doc !== "object") return doc;
  tryRecoverMediaFile(doc);
  return { ...doc, fileExists: mediaFileExistsOnDisk(doc) };
}
