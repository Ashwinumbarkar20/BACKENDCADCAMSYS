import mongoose from "mongoose";

export const MediaSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    altText: { type: String, default: "" },
    caption: { type: String, default: "" },
  },
  { _id: false }
);

