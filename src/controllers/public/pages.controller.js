import { Page } from "../../models/Page.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, fail } from "../../utils/apiResponse.js";

const publishedMatch = { status: "published" };

export const listPages = asyncHandler(async (_req, res) => {
  const items = await Page.find(publishedMatch)
    .select("title slug pageType seo publishedAt")
    .sort("title")
    .lean();
  return ok(res, items);
});

export const getPageBySlug = asyncHandler(async (req, res) => {
  const doc = await Page.findOne({ slug: req.params.slug.toLowerCase(), ...publishedMatch })
    .populate([{ path: "seo.ogImage" }, { path: "seo.twitterImage" }, { path: "sections.image" }])
    .lean();

  if (!doc) return fail(res, 404, "NOT_FOUND", "Page not found");
  return ok(res, doc);
});

