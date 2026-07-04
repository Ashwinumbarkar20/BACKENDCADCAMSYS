import { asyncHandler } from "../utils/asyncHandler.js";
import { created } from "../utils/apiResponse.js";
import {
  ContactSubmission,
  ConsultationBooking,
  SupportRequest,
  NewsletterSubscriber,
  ROIRequest,
  JobApplication,
  PdfDownloadRequest,
  Career,
  Visitor,
  PageView,
} from "../models/index.js";
import { notifyAdminLead, sendLeadConfirmation } from "../services/email.service.js";
import {
  assertSlotAvailable,
  preferredDateFromYmd,
  getSlotsForDate,
  getUpcomingAvailability,
} from "../services/appointmentSlots.js";
import { readCookie, computeVisitorScore, VISITOR_COOKIE } from "../utils/track.js";

/**
 * If this request carries a visitor cookie, attach the new submission to that
 * visitor record and bump the score. Best-effort: never fails the form submit.
 */
async function linkSubmissionToVisitor(req, kind, submissionId) {
  try {
    const visitorId = readCookie(req, VISITOR_COOKIE);
    if (!visitorId) return;
    const visitor = await Visitor.findOne({ visitorId });
    if (!visitor) return;
    visitor.linkedLeads.push({ kind, submissionId, linkedAt: new Date() });
    const recent = await PageView.find({ visitor: visitor._id })
      .sort({ viewedAt: -1 })
      .limit(20)
      .select("path")
      .lean();
    visitor.score = computeVisitorScore({
      pageViewCount: visitor.pageViewCount,
      paths: recent.map((p) => p.path),
      hasLead: true,
    });
    await visitor.save();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[track] link submission failed:", err?.message);
  }
}

/**
 * Fire-and-forget email helper. Emails are best-effort: they should not block
 * the API response or fail the request when SMTP is misconfigured.
 */
function notify(promise) {
  Promise.resolve(promise).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[email] background notify failed:", err?.message);
  });
}

export const submitContact = asyncHandler(async (req, res) => {
  // Honeypot: bots fill the hidden botField. Acknowledge with a success
  // response (so the bot moves on) but persist nothing and send no emails.
  if (req.body.botField) {
    return created(res, { received: true });
  }
  delete req.body.botField;

  const firstName = String(req.body.firstName || "").trim();
  const lastName = String(req.body.lastName || "").trim();
  const payload = {
    ...req.body,
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" ").trim() || String(req.body.name || "").trim(),
  };

  const doc = await ContactSubmission.create(payload);
  notify(linkSubmissionToVisitor(req, "contact", doc._id));
  notify(
    notifyAdminLead({
      kind: "contact submission",
      fields: payload,
      replyTo: payload.email,
    }),
  );
  notify(sendLeadConfirmation({ to: payload.email, kind: "message", name: payload.name }));
  return created(res, doc);
});

export const bookConsultation = asyncHandler(async (req, res) => {
  if (req.body.botField) {
    return created(res, { received: true });
  }
  delete req.body.botField;

  const { preferredDate: dateYmd, preferredTime, ...rest } = req.body;
  await assertSlotAvailable(dateYmd, preferredTime);

  const payload = {
    ...rest,
    preferredDate: preferredDateFromYmd(dateYmd),
    preferredTime,
    sourcePage: rest.sourcePage || "",
  };

  const doc = await ConsultationBooking.create(payload);
  notify(linkSubmissionToVisitor(req, "consultation", doc._id));
  notify(
    notifyAdminLead({
      kind: "consultation booking",
      fields: {
        ...payload,
        preferredDate: dateYmd,
        appointment: `${dateYmd} at ${preferredTime} IST`,
      },
      replyTo: payload.email,
    }),
  );
  notify(
    sendLeadConfirmation({
      to: payload.email,
      kind: "appointment booking",
      name: payload.name,
    }),
  );
  return created(res, doc);
});

export const getAppointmentSlots = asyncHandler(async (req, res) => {
  const date = req.query.date;
  if (date) {
    const day = await getSlotsForDate(String(date));
    return res.status(200).json({ success: true, data: day });
  }
  const days = Math.min(30, Math.max(1, Number.parseInt(req.query.days ?? "21", 10) || 21));
  const upcoming = await getUpcomingAvailability(days);
  return res.status(200).json({ success: true, data: { days: upcoming } });
});

export const createSupportRequest = asyncHandler(async (req, res) => {
  const doc = await SupportRequest.create(req.body);
  notify(linkSubmissionToVisitor(req, "support", doc._id));
  notify(
    notifyAdminLead({
      kind: "support request",
      fields: req.body,
      replyTo: req.body.email,
    }),
  );
  notify(
    sendLeadConfirmation({
      to: req.body.email,
      kind: "support request",
      name: req.body.customerName,
    }),
  );
  return created(res, doc);
});

export const subscribeNewsletter = asyncHandler(async (req, res) => {
  const doc = await NewsletterSubscriber.create(req.body);
  notify(linkSubmissionToVisitor(req, "newsletter", doc._id));
  notify(
    notifyAdminLead({
      kind: "newsletter subscriber",
      fields: req.body,
      replyTo: req.body.email,
    }),
  );
  return created(res, doc);
});

export const requestRoi = asyncHandler(async (req, res) => {
  const doc = await ROIRequest.create(req.body);
  notify(linkSubmissionToVisitor(req, "roi", doc._id));
  notify(
    notifyAdminLead({
      kind: "ROI request",
      fields: req.body,
      replyTo: req.body.email,
    }),
  );
  notify(
    sendLeadConfirmation({
      to: req.body.email,
      kind: "ROI request",
      name: req.body.name,
    }),
  );
  return created(res, doc);
});

export const requestPdfDownload = asyncHandler(async (req, res) => {
  // Honeypot — see submitContact.
  if (req.body.botField) {
    return created(res, { received: true });
  }
  delete req.body.botField;

  const doc = await PdfDownloadRequest.create(req.body);
  notify(linkSubmissionToVisitor(req, "pdf-download", doc._id));
  notify(
    notifyAdminLead({
      kind: req.body.pdfTitle
        ? `PDF download — ${req.body.pdfTitle}`
        : "PDF download",
      fields: req.body,
      replyTo: req.body.email,
    }),
  );
  notify(
    sendLeadConfirmation({
      to: req.body.email,
      kind: "download request",
      name: req.body.name,
    }),
  );
  return created(res, doc);
});

export const applyJob = asyncHandler(async (req, res) => {
  const doc = await JobApplication.create(req.body);
  notify(linkSubmissionToVisitor(req, "job-application", doc._id));

  // Try to enrich the admin email with the job title (best-effort, ignored on failure).
  let careerTitle = "";
  try {
    const career = await Career.findById(req.body.careerId).select("title").lean();
    careerTitle = career?.title ?? "";
  } catch {
    // ignore
  }

  notify(
    notifyAdminLead({
      kind: careerTitle ? `job application — ${careerTitle}` : "job application",
      fields: { ...req.body, careerTitle },
      replyTo: req.body.email,
    }),
  );
  notify(
    sendLeadConfirmation({
      to: req.body.email,
      kind: "application",
      name: req.body.name,
    }),
  );
  return created(res, doc);
});
