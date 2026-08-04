import { asyncHandler } from "../utils/asyncHandler.js";
import { created } from "../utils/apiResponse.js";
import {
  ContactSubmission,
  CampaignLead,
  ConsultationBooking,
  SupportRequest,
  NewsletterSubscriber,
  ROIRequest,
  JobApplication,
  PdfDownloadRequest,
  Career,
  Visitor,
  PageView,
  EnrollmentRequest,
  PostProcessorRequest,
} from "../models/index.js";
import { notifyAdminLead, sendLeadConfirmation } from "../services/email.service.js";
import {
  assertSlotAvailable,
  assertNoConflictAfterInsert,
  assertNotDuplicate,
  preferredDateFromYmd,
  getSlotsForDate,
  getUpcomingAvailability,
} from "../services/appointmentSlots.js";
import { provisionMeeting } from "../services/bookingService.js";
import { MEETING_DEFAULTS } from "../config/zoho.js";
import { readCookie, computeVisitorScore, VISITOR_COOKIE } from "../utils/track.js";
import { publicUploadUrl } from "../config/uploads.js";

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

// Campaign lead — the navbar campaign modal. Stored in its own collection so it
// shows up under Leads → Campaign Leads in the admin, next to every other inbox.
export const submitCampaignLead = asyncHandler(async (req, res) => {
  if (req.body.botField) {
    return created(res, { received: true });
  }
  delete req.body.botField;

  const payload = {
    campaign: String(req.body.campaign || "").trim() || "Campaign",
    name: String(req.body.name || "").trim(),
    email: String(req.body.email || "").trim(),
    phone: String(req.body.phone || "").trim(),
    company: String(req.body.company || "").trim(),
    destinationUrl: String(req.body.destinationUrl || "").trim(),
    sourcePage: String(req.body.sourcePage || "").trim(),
  };

  const doc = await CampaignLead.create(payload);
  notify(linkSubmissionToVisitor(req, "campaign", doc._id));
  notify(
    notifyAdminLead({
      kind: `campaign lead — ${payload.campaign}`,
      fields: payload,
      replyTo: payload.email,
    }),
  );
  notify(sendLeadConfirmation({ to: payload.email, kind: "enquiry", name: payload.name }));
  return created(res, doc);
});

/**
 * Book a demo (FRD §5): validate → check the slot → save → create the Zoho
 * meeting → email customer + organiser with calendar invites.
 *
 * The booking is saved *before* Zoho is called. If the meeting fails the record
 * survives as `pending_meeting` and is retried, rather than the visitor seeing
 * an error for something that isn't their problem.
 */
export const bookConsultation = asyncHandler(async (req, res) => {
  if (req.body.botField) {
    return created(res, { received: true });
  }
  delete req.body.botField;

  const { preferredDate: dateYmd, preferredTime, ...rest } = req.body;
  const email = String(rest.email || "").trim();

  // Throws 400/409 with a message the form shows as-is.
  const { durationMinutes } = await assertSlotAvailable(dateYmd, preferredTime);
  await assertNotDuplicate({ email, ymd: dateYmd, time: preferredTime });

  const doc = await ConsultationBooking.create({
    ...rest,
    email,
    preferredDate: preferredDateFromYmd(dateYmd),
    bookingYmd: dateYmd,
    preferredTime,
    durationMinutes,
    sourcePage: rest.sourcePage || "",
    meetingTitle: MEETING_DEFAULTS.topic,
    status: "pending_meeting",
  });

  // Two people submitting the same slot at once can both clear the check above.
  // This removes the loser before a meeting is ever created for it.
  await assertNoConflictAfterInsert(doc);

  notify(linkSubmissionToVisitor(req, "consultation", doc._id));

  // Creates the meeting and sends both branded emails with the .ics invite.
  const booking = await provisionMeeting(doc);

  return created(res, {
    _id: booking._id,
    status: booking.status,
    name: booking.name,
    email: booking.email,
    bookingYmd: booking.bookingYmd,
    preferredTime: booking.preferredTime,
    durationMinutes: booking.durationMinutes,
    meetingTitle: booking.meetingTitle,
    meetingId: booking.meetingId,
    joinUrl: booking.joinUrl,
    meetingPassword: booking.meetingPassword,
  });
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
  if (req.body.botField) return created(res, { received: true });
  delete req.body.botField;
  const payload = { ...req.body };
  if (req.file) {
    payload.resumeUrl = publicUploadUrl(req.file.filename);
    payload.resumeName = req.file.originalname || req.file.filename;
  }
  const doc = await JobApplication.create(payload);
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
      fields: { ...payload, careerTitle },
      replyTo: payload.email,
      attachments: req.file
        ? [{ filename: payload.resumeName || req.file.filename, path: req.file.path }]
        : undefined,
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

// ---------------------------------------------------------------------------
// Training certification enrolment
// ---------------------------------------------------------------------------
export const requestEnrollment = asyncHandler(async (req, res) => {
  if (req.body.botField) return created(res, { received: true });
  delete req.body.botField;

  const doc = await EnrollmentRequest.create(req.body);
  notify(linkSubmissionToVisitor(req, "enrollment", doc._id));
  notify(
    notifyAdminLead({
      kind: req.body.programme
        ? `Training enrolment — ${req.body.programme}`
        : "Training enrolment",
      fields: req.body,
      replyTo: req.body.email,
    }),
  );
  notify(
    sendLeadConfirmation({ to: req.body.email, kind: "enrolment request", name: req.body.name }),
  );
  return created(res, doc);
});

// ---------------------------------------------------------------------------
// Post-processor development request (multipart — optional sample NC file)
// ---------------------------------------------------------------------------
export const requestPostProcessor = asyncHandler(async (req, res) => {
  if (req.body.botField) return created(res, { received: true });
  delete req.body.botField;

  const payload = { ...req.body };
  const files = Array.isArray(req.files) ? req.files : [];
  if (files.length) {
    payload.sampleFiles = files.map((f) => ({
      url: publicUploadUrl(f.filename),
      name: f.originalname || f.filename,
    }));
    // Mirror the first file into the legacy fields so older views keep working.
    payload.sampleFileUrl = payload.sampleFiles[0].url;
    payload.sampleFileName = payload.sampleFiles[0].name;
  }

  const doc = await PostProcessorRequest.create(payload);
  notify(linkSubmissionToVisitor(req, "post-processor", doc._id));
  notify(
    notifyAdminLead({
      kind: `Post-processor request — ${payload.machineBrand || "machine"}`,
      fields: payload,
      replyTo: payload.email,
      // Attach the uploaded sample NC file so the team gets it directly in the
      // email rather than only a link.
      attachments: files.length
        ? files.map((f) => ({ filename: f.originalname || f.filename, path: f.path }))
        : undefined,
    }),
  );
  notify(
    sendLeadConfirmation({ to: payload.email, kind: "post-processor request", name: payload.name }),
  );
  return created(res, doc);
});
