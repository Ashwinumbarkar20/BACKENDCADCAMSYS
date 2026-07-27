import fs from "node:fs";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, fail } from "../../utils/apiResponse.js";
import { uploadFilePathFromUrl } from "../../config/uploads.js";
import {
  PostProcessorRequest,
  JobApplication,
  PdfDownloadRequest,
} from "../../models/index.js";

// Lead types that carry uploaded files, and how their file fields are shaped.
const FILE_LEADS = {
  "post-processor-requests": PostProcessorRequest,
  "job-applications": JobApplication,
  "pdf-downloads": PdfDownloadRequest,
};

function unlinkQuietly(url) {
  if (!url) return;
  try {
    fs.unlinkSync(uploadFilePathFromUrl(url));
  } catch {
    /* file already gone / not on this disk — ignore */
  }
}

/**
 * Delete ONLY the uploaded attachment(s) on a lead, keeping the lead record.
 * DELETE /api/admin/leads/:segment/:id/attachment
 */
export const deleteLeadAttachment = asyncHandler(async (req, res) => {
  const { segment, id } = req.params;
  const Model = FILE_LEADS[segment];
  if (!Model) return fail(res, 400, "BAD_REQUEST", "This lead type has no attachments.");

  const doc = await Model.findById(id);
  if (!doc) return fail(res, 404, "NOT_FOUND", "Lead not found.");

  // Collect every file URL this lead points at, then clear the fields.
  const urls = [];
  if (Array.isArray(doc.sampleFiles)) {
    doc.sampleFiles.forEach((f) => f?.url && urls.push(f.url));
    doc.sampleFiles = [];
  }
  if (doc.sampleFileUrl) {
    urls.push(doc.sampleFileUrl);
    doc.sampleFileUrl = "";
    doc.sampleFileName = "";
  }
  if (doc.resumeUrl) {
    urls.push(doc.resumeUrl);
    doc.resumeUrl = "";
    doc.resumeName = "";
  }
  // pdf-downloads store a Media ref (shared library) — just unlink the ref, do
  // not delete the Media file since it may be reused elsewhere.
  if (doc.pdf) doc.pdf = undefined;

  urls.forEach(unlinkQuietly);
  await doc.save();

  return ok(res, { id: doc._id, removed: urls.length });
});
