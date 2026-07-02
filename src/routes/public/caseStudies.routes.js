import { Router } from "express";
import { listCaseStudies, getCaseStudyBySlug } from "../../controllers/public/caseStudies.controller.js";
import { validate } from "../../middlewares/validate.js";
import { slugParam } from "../../validations/common.js";

export const publicCaseStudiesRouter = Router();

publicCaseStudiesRouter.get("/", listCaseStudies);
publicCaseStudiesRouter.get("/:slug", validate({ params: slugParam }), getCaseStudyBySlug);

