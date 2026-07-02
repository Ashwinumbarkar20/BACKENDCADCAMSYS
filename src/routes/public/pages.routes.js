import { Router } from "express";
import { listPages, getPageBySlug } from "../../controllers/public/pages.controller.js";
import { validate } from "../../middlewares/validate.js";
import { slugParam } from "../../validations/common.js";

export const publicPagesRouter = Router();

publicPagesRouter.get("/", listPages);
publicPagesRouter.get("/:slug", validate({ params: slugParam }), getPageBySlug);

