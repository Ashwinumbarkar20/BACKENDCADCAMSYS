import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { env } from "../../config/env.js";
import { uploadMedia, listMedia, getMediaById, deleteMedia } from "../../controllers/media.controller.js";
import { requireOwner } from "../../middlewares/permissions.js";

export const adminMediaRouter = Router();

if (!fs.existsSync(env.UPLOAD_DIR)) fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  "application/pdf",
  "video/mp4",
  "video/webm",
]);

const SAFE_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif",
  ".pdf",
  ".mp4", ".webm",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeOriginal = path.basename(file.originalname || "");
    const ext = path.extname(safeOriginal).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_MIME.has(file.mimetype) || !SAFE_EXT.has(ext)) {
      return cb(new Error(`File type not allowed: ${file.mimetype} (${ext})`));
    }
    cb(null, true);
  },
});

// Upload and get-by-id stay open to any logged-in user — content editors need
// to upload images inline (MediaPicker) and the picker resolves IDs to URLs.
adminMediaRouter.post(
  "/media/upload",
  upload.single("file"),
  (req, res, next) => {
    if (!req.file) return res.status(400).json({ success: false, error: { code: "NO_FILE", message: "No file uploaded" } });
    req.file.publicUrl = `/${env.UPLOAD_DIR}/${req.file.filename}`.replaceAll("\\", "/");
    next();
  },
  uploadMedia,
);
adminMediaRouter.get("/media/:id", getMediaById);

// Library browse + delete are owner-only.
adminMediaRouter.get("/media", requireOwner, listMedia);
adminMediaRouter.delete("/media/:id", requireOwner, deleteMedia);
