import { CaseStudy } from "../../models/CaseStudy.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, fail } from "../../utils/apiResponse.js";
import { listMeta, parsePublicListQuery } from "../../utils/publicList.js";

const publishedMatch = { status: "published" };

export const listCaseStudies = asyncHandler(async (req, res) => {
  const { filter, page, limit, skip, sort } = parsePublicListQuery(req, {
    filters: {
      industry: "objectId",
      products: "objectId",
    },
    searchPaths: ["title", "customerName"],
    defaultSort: "-publishedAt",
  });

  const [items, total] = await Promise.all([
    CaseStudy.find(filter)
      .select("title slug customerName customerLogo industry challenge seo publishedAt")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate([{ path: "customerLogo" }, { path: "industry", select: "title slug" }])
      .lean(),
    CaseStudy.countDocuments(filter),
  ]);

  return ok(res, items, listMeta({ page, limit, total }));
});

export const getCaseStudyBySlug = asyncHandler(async (req, res) => {
  const doc = await CaseStudy.findOne({ slug: req.params.slug.toLowerCase(), ...publishedMatch })
    .populate([
      { path: "customerLogo" },
      { path: "industry", match: publishedMatch, select: "title slug coverImage headline" },
      { path: "products", match: publishedMatch, select: "title slug shortDescription hero" },
      { path: "testimonial", match: publishedMatch, select: "customerName company designation quote photo logo rating" },
      { path: "seo.ogImage" },
      { path: "seo.twitterImage" },
    ])
    .lean();

  if (!doc) return fail(res, 404, "NOT_FOUND", "Case study not found");
  return ok(res, doc);
});
