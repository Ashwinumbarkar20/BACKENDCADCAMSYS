import { Router } from "express";
import { listProducts, getProductBySlug } from "../../controllers/public/products.controller.js";
import { validate } from "../../middlewares/validate.js";
import { slugParam } from "../../validations/common.js";

export const publicProductsRouter = Router();

publicProductsRouter.get("/", listProducts);
publicProductsRouter.get("/:slug", validate({ params: slugParam }), getProductBySlug);

