import fs from "node:fs";
import { uploadFilePathFromUrl } from "../config/uploads.js";

/** True when the file for a Media.url exists on this server's upload disk. */
export function mediaFileExistsOnDisk(doc) {
  if (!doc?.url) return false;
  try {
    return fs.existsSync(uploadFilePathFromUrl(doc.url));
  } catch {
    return false;
  }
}

export function withMediaFileStatus(doc) {
  if (!doc || typeof doc !== "object") return doc;
  return { ...doc, fileExists: mediaFileExistsOnDisk(doc) };
}
