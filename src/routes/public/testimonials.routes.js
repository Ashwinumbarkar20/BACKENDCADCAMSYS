import { Router } from "express";
import { listTestimonials, getTestimonialById } from "../../controllers/public/testimonials.controller.js";
import { validate } from "../../middlewares/validate.js";
import { objectIdParam } from "../../validations/common.js";

export const publicTestimonialsRouter = Router();

publicTestimonialsRouter.get("/", listTestimonials);
publicTestimonialsRouter.get("/:id", validate({ params: objectIdParam }), getTestimonialById);

