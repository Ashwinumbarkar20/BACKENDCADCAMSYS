import sharp from "sharp";

const RASTER = /^image\/(jpeg|jpg|png|webp|avif|gif|tiff)$/i;

/**
 * For a raster image on disk, returns its intrinsic dimensions plus a tiny
 * base64 blur preview (LQIP) used for blur-up loading on the public site.
 * Returns {} for vector/non-raster images or on any failure — callers should
 * spread the result so missing fields simply stay unset.
 */
export async function buildImageMeta(filePath, mimeType) {
  if (!filePath || !RASTER.test(mimeType || "")) return {};
  try {
    const img = sharp(filePath, { failOn: "none" });
    const meta = await img.metadata();
    const buf = await img
      .resize(20, null, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 45 })
      .toBuffer();
    return {
      width: meta.width,
      height: meta.height,
      blurDataURL: `data:image/webp;base64,${buf.toString("base64")}`,
    };
  } catch {
    return {};
  }
}
