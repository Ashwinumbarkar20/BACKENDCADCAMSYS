import { Router } from "express";
import { listSolutions, getSolutionBySlug } from "../../controllers/public/solutions.controller.js";
import { validate } from "../../middlewares/validate.js";
import { slugParam } from "../../validations/common.js";

export const publicSolutionsRouter = Router();

publicSolutionsRouter.get("/", listSolutions);
publicSolutionsRouter.get("/:slug", validate({ params: slugParam }), getSolutionBySlug);

