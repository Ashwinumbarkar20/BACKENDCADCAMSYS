import fs from "node:fs";
import path from "node:path";
import { env } from "./env.js";

/** Public URL prefix — always /uploads/... in Media.url (never changes). */
export const UPLOAD_PUBLIC_PATH = "uploads";

/** Absolute directory where files are stored on disk. */
export function getUploadDir() {
  const configured = env.UPLOAD_DIR || "uploads";
  if (path.isAbsolute(configured)) return configured;
  return path.resolve(process.cwd(), configured);
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
