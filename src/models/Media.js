import mongoose from "mongoose";

const MediaModelSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    url: { type: String, required: true, index: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    altText: { type: String, default: "" },
    caption: { type: String, default: "" },
    // Intrinsic dimensions + a tiny base64 blur preview (LQIP) for blur-up
    // image loading on the public site. Populated for raster images on upload.
    width: { type: Number },
    height: { type: Number },
    blurDataURL: { type: String, default: "" },
  },
  { timestamps: true }
);

MediaModelSchema.index({ originalName: "text", altText: "text", caption: "text" });

export const Media = mongoose.model("Media", MediaModelSchema);

