import { Router } from "express";
import { listNews, getNewsBySlug } from "../../controllers/public/news.controller.js";
import { validate } from "../../middlewares/validate.js";
import { slugParam } from "../../validations/common.js";

export const publicNewsRouter = Router();

publicNewsRouter.get("/", listNews);
publicNewsRouter.get("/:slug", validate({ params: slugParam }), getNewsBySlug);
