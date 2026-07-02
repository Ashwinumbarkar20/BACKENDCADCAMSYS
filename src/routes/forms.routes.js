import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  applyJob,
  bookConsultation,
  createSupportRequest,
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
const formLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

formsRouter.use(formLimiter);

formsRouter.post("/contact", validate({ body: contactBody }), submitContact);
formsRouter.post("/book-consultation", validate({ body: consultationBody }), bookConsultation);
formsRouter.post("/support-request", validate({ body: supportRequestBody }), createSupportRequest);
formsRouter.post("/roi-request", validate({ body: roiRequestBody }), requestRoi);
formsRouter.post("/newsletter", validate({ body: newsletterBody }), subscribeNewsletter);
formsRouter.post("/job-application", validate({ body: jobApplicationBody }), applyJob);
formsRouter.post("/pdf-download", validate({ body: pdfDownloadBody }), requestPdfDownload);
