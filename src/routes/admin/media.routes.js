import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { env } from "../../config/env.js";
import { ensureUploadDir, getUploadDir, publicUploadUrl } from "../../config/uploads.js";
import { uploadMedia, listMedia, getMediaById, deleteMedia } from "../../controllers/media.controller.js";
import { requireOwner } from "../../middlewares/permissions.js";

export const adminMediaRouter = Router();

ensureUploadDir();

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
  destination: (_req, _file, cb) => cb(null, getUploadDir()),
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

adminMediaRouter.post(
  "/media/upload",
  upload.single("file"),
  (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: "NO_FILE", message: "No file uploaded" } });
    }
    const diskPath = path.join(getUploadDir(), req.file.filename);
    if (!fs.existsSync(diskPath)) {
      return res.status(500).json({
        success: false,
        error: { code: "UPLOAD_WRITE_FAILED", message: "File was not saved to disk. Check UPLOAD_DIR on the server." },
      });
    }
    req.file.publicUrl = publicUploadUrl(req.file.filename);
    next();
  },
  uploadMedia,
);
adminMediaRouter.get("/media/:id", getMediaById);

adminMediaRouter.get("/media", requireOwner, listMedia);
adminMediaRouter.delete("/media/:id", requireOwner, deleteMedia);
