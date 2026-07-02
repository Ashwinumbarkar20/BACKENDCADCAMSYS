import { ProductCategory } from "../../models/ProductCategory.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/apiResponse.js";

export const listProductCategories = asyncHandler(async (_req, res) => {
  const items = await ProductCategory.find({}).sort("title").lean();
  return ok(res, items);
});
