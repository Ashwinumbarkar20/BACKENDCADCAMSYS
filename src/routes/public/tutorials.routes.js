import { Router } from "express";
import { listTutorials, getTutorialBySlug } from "../../controllers/public/tutorials.controller.js";
import { validate } from "../../middlewares/validate.js";
import { slugParam } from "../../validations/common.js";

export const publicTutorialsRouter = Router();

publicTutorialsRouter.get("/", listTutorials);
publicTutorialsRouter.get("/:slug", validate({ params: slugParam }), getTutorialBySlug);

