import { Router } from "express";
import { listProductCategories } from "../../controllers/public/categories.controller.js";

export const publicCategoriesRouter = Router();

publicCategoriesRouter.get("/product-categories", listProductCategories);
