import { Router } from "express";
import rateLimit from "express-rate-limit";
import { trackPageView } from "../controllers/track.controller.js";

export const trackRouter = Router();

// 60 hits per IP per minute. Plenty for normal browsing; absorbs SPA route
// changes and double-fires without throttling real users.
const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

trackRouter.use(trackLimiter);
trackRouter.post("/", trackPageView);
