import fs from "node:fs/promises";
import path from "node:path";
import { Media } from "../models/Media.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildImageMeta } from "../utils/imageMeta.js";
import { created, ok, fail } from "../utils/apiResponse.js";
import { getUploadDir, uploadFilePathFromUrl } from "../config/uploads.js";
import { withMediaFileStatus } from "../utils/mediaFileStatus.js";

export const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) return fail(res, 400, "UPLOAD_MISSING", "No file uploaded");

  const caption = String(req.body?.caption ?? "").trim();
  const originalName = req.file.originalname || "upload";

  // Dimensions + tiny blur preview for blur-up loading (raster images only).
  const imageMeta = await buildImageMeta(req.file.path, req.file.mimetype);

  const doc = await Media.create({
    fileName: req.file.filename,
    originalName: req.file.originalname,
    url: req.file.publicUrl,
    mimeType: req.file.mimetype,
    size: req.file.size,
    altText: String(req.body?.altText ?? "").trim(),
    caption: caption || originalName,
    ...imageMeta,
  });

  return created(res, withMediaFileStatus(doc.toObject()));
});

export const listMedia = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Media.find({}).sort("-createdAt").skip(skip).limit(limit).lean(),
    Media.countDocuments({}),
  ]);

  return ok(res, items.map(withMediaFileStatus), { page, limit, total });
});

export const getMediaById = asyncHandler(async (req, res) => {
  const doc = await Media.findById(req.params.id).lean();
  if (!doc) return fail(res, 404, "NOT_FOUND", "Media not found");
  return ok(res, withMediaFileStatus(doc));
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const doc = await Media.findById(req.params.id);
  if (!doc) return fail(res, 404, "NOT_FOUND", "Media not found");

  const filePath = uploadFilePathFromUrl(doc.url);
  await Media.deleteOne({ _id: doc._id });
  await fs.unlink(filePath).catch(() => {});

  return ok(res, { deleted: true });
});

