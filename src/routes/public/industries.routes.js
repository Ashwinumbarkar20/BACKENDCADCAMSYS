import { Router } from "express";
import { listIndustries, getIndustryBySlug } from "../../controllers/public/industries.controller.js";
import { validate } from "../../middlewares/validate.js";
import { slugParam } from "../../validations/common.js";

export const publicIndustriesRouter = Router();

publicIndustriesRouter.get("/", listIndustries);
publicIndustriesRouter.get("/:slug", validate({ params: slugParam }), getIndustryBySlug);

