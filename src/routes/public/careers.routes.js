import { Router } from "express";
import { listCareers, getCareerBySlug } from "../../controllers/public/careers.controller.js";
import { validate } from "../../middlewares/validate.js";
import { slugParam } from "../../validations/common.js";

export const publicCareersRouter = Router();

publicCareersRouter.get("/", listCareers);
publicCareersRouter.get("/:slug", validate({ params: slugParam }), getCareerBySlug);

