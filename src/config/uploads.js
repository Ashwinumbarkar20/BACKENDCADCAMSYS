import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { env } from "./env.js";

/** Public URL prefix — always /uploads/... in Media.url (never changes). */
export const UPLOAD_PUBLIC_PATH = "uploads";

/** Folder inside the git/deploy tree — wiped on Hostinger redeploy. */
export function getProjectUploadDir() {
  const configured = env.UPLOAD_DIR || "uploads";
  if (path.isAbsolute(configured)) return configured;
  return path.resolve(process.cwd(), configured);
}

function defaultPersistentUploadDir() {
  const override = process.env.UPLOADS_PERSISTENT_DIR?.trim();
  if (override) {
    return path.isAbsolute(override) ? override : path.resolve(process.cwd(), override);
  }
  return path.join(os.homedir(), "cadcamsys-uploads");
}

function defaultPersistentBackupDir() {
  const override = process.env.UPLOADS_BACKUP_DIR?.trim();
  if (override) {
    return path.isAbsolute(override) ? override : path.resolve(process.cwd(), override);
  }
  return path.join(os.homedir(), "cadcamsys-uploads-backup");
}

/**
 * Hostinger Node.js Web App redeploys ~/nodejs on every git push.
 * Relative UPLOAD_DIR=uploads saves inside that folder and gets deleted.
 */
function shouldUsePersistentStorage(configured) {
  if (path.isAbsolute(configured)) return false;
  if (process.env.UPLOADS_PERSISTENT_DIR?.trim()) return true;
  if (env.NODE_ENV === "production") return true;
  if (process.env.HOSTINGER === "1") return true;
  // Typical Hostinger app root: /home/u123456789/nodejs
  if (/\/nodejs\/?$/i.test(process.cwd())) return true;
  return false;
}

/** Whether uploads are stored outside the deploy folder (Hostinger / production). */
export function isPersistentStorageEnabled() {
  const configured = env.UPLOAD_DIR || "uploads";
  return shouldUsePersistentStorage(configured);
}

/** Absolute directory where files are stored on disk. */
export function getUploadDir() {
  const configured = env.UPLOAD_DIR || "uploads";
  if (path.isAbsolute(configured)) return configured;
  if (shouldUsePersistentStorage(configured)) return defaultPersistentUploadDir();
  return path.resolve(process.cwd(), configured);
}

export function getPersistentBackupDir() {
  return defaultPersistentBackupDir();
}

export function ensureUploadDir() {
  const dir = getUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Build the URL stored on Media documents: /uploads/{fileName} */
export function publicUploadUrl(fileName) {
  return `/${UPLOAD_PUBLIC_PATH}/${fileName}`.replaceAll("\\", "/");
}

/** Resolve a Media.url or /uploads/... path to an absolute file path. */
export function uploadFilePathFromUrl(urlOrPath) {
  const raw = String(urlOrPath || "").replace(/^\//, "");
  const prefix = `${UPLOAD_PUBLIC_PATH}/`;
  const fileName = raw.startsWith(prefix) ? raw.slice(prefix.length) : path.basename(raw);
  return path.join(getUploadDir(), fileName);
}
