import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  applyJob,
  bookConsultation,
  createSupportRequest,
  getAppointmentSlots,
  requestRoi,
  requestPdfDownload,
  submitContact,
  subscribeNewsletter,
} from "../controllers/forms.controller.js";
import { validate } from "../middlewares/validate.js";
import {
  contactBody,
  consultationBody,
  supportRequestBody,
  newsletterBody,
  roiRequestBody,
  jobApplicationBody,
  pdfDownloadBody,
} from "../validations/forms.validation.js";

export const formsRouter = Router();

// Per-IP rate limit on public form endpoints to slow down spam/abuse.
// Applied per route — not via router.use(), because this router is mounted at
// /api and router-level middleware would throttle /api/admin/* CMS traffic too.
const formLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

formsRouter.get("/appointment-slots", formLimiter, getAppointmentSlots);
formsRouter.post("/contact", formLimiter, validate({ body: contactBody }), submitContact);
formsRouter.post("/book-consultation", formLimiter, validate({ body: consultationBody }), bookConsultation);
formsRouter.post("/support-request", formLimiter, validate({ body: supportRequestBody }), createSupportRequest);
formsRouter.post("/roi-request", formLimiter, validate({ body: roiRequestBody }), requestRoi);
formsRouter.post("/newsletter", formLimiter, validate({ body: newsletterBody }), subscribeNewsletter);
formsRouter.post("/job-application", formLimiter, validate({ body: jobApplicationBody }), applyJob);
formsRouter.post("/pdf-download", formLimiter, validate({ body: pdfDownloadBody }), requestPdfDownload);
