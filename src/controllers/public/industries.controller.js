import { Industry } from "../../models/Industry.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, fail } from "../../utils/apiResponse.js";
import { listMeta, parsePublicListQuery } from "../../utils/publicList.js";

const publishedMatch = { status: "published" };

export const listIndustries = asyncHandler(async (req, res) => {
  const { filter, page, limit, skip, sort } = parsePublicListQuery(req, {
    searchPaths: ["title", "headline"],
    defaultSort: "title",
  });

  const [items, total] = await Promise.all([
    Industry.find(filter)
      .select("title slug coverImage headline seo publishedAt")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate([{ path: "coverImage" }])
      .lean(),
    Industry.countDocuments(filter),
  ]);

  return ok(res, items, listMeta({ page, limit, total }));
});

export const getIndustryBySlug = asyncHandler(async (req, res) => {
  const doc = await Industry.findOne({ slug: req.params.slug.toLowerCase(), ...publishedMatch })
    .populate([
      { path: "coverImage" },
      {
        path: "products",
        match: publishedMatch,
        select: "title slug tagline coverImage category solution seo",
        populate: [
          { path: "coverImage" },
          { path: "category", select: "title slug" },
          { path: "solution", match: publishedMatch, select: "title slug" },
        ],
      },
      {
        path: "caseStudies",
        match: publishedMatch,
        select: "title slug customerName customerLogo industry seo",
        populate: [{ path: "customerLogo" }],
      },
      { path: "testimonials", match: publishedMatch, select: "customerName company designation quote photo logo rating seo" },
      { path: "blogs", match: publishedMatch, select: "title slug excerpt featuredImage publishedAt seo" },
      { path: "tutorials", match: publishedMatch, select: "title slug videoUrl featuredImage seo" },
      { path: "customerLogos" },
      { path: "pdfs.file" },
      { path: "seo.ogImage" },
      { path: "seo.twitterImage" },
    ])
    .lean();

  if (!doc) return fail(res, 404, "NOT_FOUND", "Industry not found");
  return ok(res, doc);
});
