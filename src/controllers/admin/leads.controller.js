import {
  ContactSubmission,
  ConsultationBooking,
  SupportRequest,
  NewsletterSubscriber,
  ROIRequest,
  JobApplication,
  PdfDownloadRequest,
} from "../../models/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/apiResponse.js";

/** Lead inbox segments — matches admin sidebar paths under /leads (except visitors). */
export const LEAD_INBOX_SEGMENTS = [
  { id: "leads/contact-submissions", model: ContactSubmission },
  { id: "leads/consultation-bookings", model: ConsultationBooking },
  { id: "leads/support-requests", model: SupportRequest },
  { id: "leads/newsletter-subscribers", model: NewsletterSubscriber },
  { id: "leads/roi-requests", model: ROIRequest },
  { id: "leads/job-applications", model: JobApplication },
  { id: "leads/pdf-downloads", model: PdfDownloadRequest },
];

function parseSince(iso) {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * POST /api/admin/leads/new-counts
 * Body: { since: { "leads/contact-submissions": "ISO-8601", ... } }
 * Returns submission counts created after each segment's last-seen timestamp.
 */
export const leadNewCounts = asyncHandler(async (req, res) => {
  const sinceMap = req.body?.since && typeof req.body.since === "object" ? req.body.since : {};

  const counts = {};
  let total = 0;

  await Promise.all(
    LEAD_INBOX_SEGMENTS.map(async ({ id, model }) => {
      const sinceDate = parseSince(sinceMap[id]);
      const filter = sinceDate ? { createdAt: { $gt: sinceDate } } : {};
      const newCount = await model.countDocuments(filter);
      counts[id] = newCount;
      total += newCount;
    }),
  );

  return ok(res, { counts, total });
});
