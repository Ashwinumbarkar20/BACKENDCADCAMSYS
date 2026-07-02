import mongoose from "mongoose";

// Captured when a visitor downloads a gated PDF (product/industry brochure).
// Stored as a lead so sales can follow up.
const PdfDownloadRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, index: true },

    // Context: what was downloaded and from where.
    resourceType: { type: String, default: "" }, // "product" | "industry"
    resourceTitle: { type: String, default: "" },
    resourceSlug: { type: String, default: "" },
    pdfTitle: { type: String, default: "" },
    pdf: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    sourcePage: { type: String, default: "" },
  },
  { timestamps: true }
);

export const PdfDownloadRequest = mongoose.model(
  "PdfDownloadRequest",
  PdfDownloadRequestSchema
);
