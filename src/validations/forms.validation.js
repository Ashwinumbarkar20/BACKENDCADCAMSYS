import { z } from "zod";

const optStr = z.string().trim().max(2000).optional();
const optShortStr = z.string().trim().max(200).optional();
const optEmail = z.string().email().optional();

// Campaign lead — the quick navbar campaign modal. Every visible field is
// mandatory: a campaign lead without a phone or company is not worth chasing.
export const campaignBody = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a valid mobile number")
    .max(40)
    .regex(/^[\d+][\d\s()-]*$/, "Enter a valid mobile number"),
  company: z.string().trim().min(1, "Company is required").max(200),
  campaign: optShortStr,
  destinationUrl: optStr,
  sourcePage: optShortStr,
  botField: z.string().max(200).optional(),
});

export const contactBody = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  name: z.string().trim().max(200).optional(),
  email: z.string().email(),
  company: optShortStr,
  designation: optShortStr,
  phone: z.string().trim().max(40).optional(),
  country: optShortStr,
  levelOfInterest: z
    .enum(["browsing", "ready_to_purchase", "evaluating", "beginning_investigation"])
    .optional(),
  industry: optShortStr,
  message: optStr,
  consent: z.boolean().optional(),
  sourcePage: optShortStr,
  // Honeypot: a hidden field real users never fill. Declared here so it
  // survives validation (Zod strips unknown keys) and reaches the controller,
  // which silently drops any submission that has it set. Capped so a bot can't
  // use it as a large free-text payload.
  botField: z.string().max(200).optional(),
});

export const consultationBody = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email(),
  company: optShortStr,
  phone: z.string().trim().max(40).optional(),
  consultationType: optShortStr,
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  notes: optStr,
  sourcePage: optShortStr,
  botField: z.string().max(200).optional(),
});

export const supportRequestBody = z.object({
  customerName: z.string().trim().min(1).max(200),
  email: z.string().email(),
  company: optShortStr,
  product: optShortStr,
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  issueDescription: z.string().trim().min(1).max(5000),
});

export const newsletterBody = z.object({
  email: z.string().email(),
  sourcePage: optShortStr,
});

export const roiRequestBody = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email(),
  company: optShortStr,
  currentProcess: optStr,
  painPoints: optStr,
});

export const jobApplicationBody = z.object({
  careerId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid careerId"),
  name: z.string().trim().min(1).max(200),
  email: z.string().email(),
  phone: z.string().trim().max(40).optional(),
  coverLetter: optStr,
  careerTitle: optShortStr,
  sourcePage: optShortStr,
  botField: z.string().max(200).optional(),
});

// Gated PDF download (product/industry brochure). name + mobile + email are
// required; the rest is context about which file was downloaded.
export const pdfDownloadBody = z.object({
  name: z.string().trim().min(1).max(200),
  mobile: z.string().trim().min(1).max(40),
  email: z.string().email(),
  resourceType: z.enum(["product", "industry"]).optional(),
  resourceTitle: optShortStr,
  resourceSlug: optShortStr,
  pdfTitle: optShortStr,
  pdf: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  sourcePage: optShortStr,
  // Honeypot — see contactBody.
  botField: z.string().max(200).optional(),
});

// Training certification enrolment (name + email required).
export const enrollmentBody = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email(),
  company: optShortStr,
  mobile: optShortStr,
  programme: optShortStr,
  message: z.string().max(4000).optional(),
  sourcePage: optShortStr,
  botField: z.string().max(200).optional(),
});

// Post-processor development request. Sent as multipart (optional NC file), so
// every field arrives as a string.
export const postProcessorBody = z.object({
  name: optShortStr,
  email: z.string().email(),
  company: optShortStr,
  mobile: optShortStr,
  machineBrand: z.string().trim().min(1).max(200),
  controller: optShortStr,
  technology: optShortStr,
  notes: z.string().max(4000).optional(),
  sourcePage: optShortStr,
  botField: z.string().max(200).optional(),
});
