import { Router } from "express";
import { listBlogs, getBlogBySlug } from "../../controllers/public/blogs.controller.js";
import { validate } from "../../middlewares/validate.js";
import { slugParam } from "../../validations/common.js";

export const publicBlogsRouter = Router();

publicBlogsRouter.get("/", listBlogs);
publicBlogsRouter.get("/:slug", validate({ params: slugParam }), getBlogBySlug);

