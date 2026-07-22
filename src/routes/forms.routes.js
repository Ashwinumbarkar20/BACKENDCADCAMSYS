import { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "node:path";
import { ensureUploadDir, getUploadDir } from "../config/uploads.js";
import {
  applyJob,
  bookConsultation,
  createSupportRequest,
  getAppointmentSlots,
  requestRoi,
  requestPdfDownload,
  submitContact,
  subscribeNewsletter,
  requestEnrollment,
  requestPostProcessor,
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
  enrollmentBody,
  postProcessorBody,
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
formsRouter.post("/enroll", formLimiter, validate({ body: enrollmentBody }), requestEnrollment);

// Sample NC programs are small text/CAM files. Keep the allowlist tight and the
// size low since this is an unauthenticated endpoint.
ensureUploadDir();
const NC_EXT = new Set([".nc", ".txt", ".tap", ".cnc", ".iso", ".dxf", ".dwg", ".zip", ".pdf"]);
const ncUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, getUploadDir()),
    filename: (_req, file, cb) => {
      const ext = path.extname(path.basename(file.originalname || "")).toLowerCase();
      cb(null, `pp-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(path.basename(file.originalname || "")).toLowerCase();
    cb(null, NC_EXT.has(ext));
  },
});

formsRouter.post(
  "/post-processor-request",
  formLimiter,
  ncUpload.single("sampleFile"),
  validate({ body: postProcessorBody }),
  requestPostProcessor,
);
