import { Career } from "../../models/Career.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, fail } from "../../utils/apiResponse.js";
import { listMeta, parsePublicListQuery } from "../../utils/publicList.js";

const publishedMatch = { status: "published" };

export const listCareers = asyncHandler(async (req, res) => {
  const { filter, page, limit, skip, sort } = parsePublicListQuery(req, {
    filters: {
      department: "string",
      location: "string",
      employmentType: "string",
    },
    searchPaths: ["title", "description"],
    defaultSort: "-publishedAt",
  });

  const [items, total] = await Promise.all([
    Career.find(filter)
      .select("title slug department location employmentType seo publishedAt")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Career.countDocuments(filter),
  ]);

  return ok(res, items, listMeta({ page, limit, total }));
});

export const getCareerBySlug = asyncHandler(async (req, res) => {
  const doc = await Career.findOne({ slug: req.params.slug.toLowerCase(), ...publishedMatch })
    .populate([{ path: "seo.ogImage" }, { path: "seo.twitterImage" }])
    .lean();

  if (!doc) return fail(res, 404, "NOT_FOUND", "Career not found");
  return ok(res, doc);
});
