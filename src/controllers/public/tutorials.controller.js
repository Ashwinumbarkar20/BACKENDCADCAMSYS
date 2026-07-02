import { Tutorial } from "../../models/Tutorial.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, fail } from "../../utils/apiResponse.js";
import { listMeta, parsePublicListQuery } from "../../utils/publicList.js";

const publishedMatch = { status: "published" };

export const listTutorials = asyncHandler(async (req, res) => {
  const { filter, page, limit, skip, sort } = parsePublicListQuery(req, {
    filters: {
      products: "objectId",
      industries: "objectId",
    },
    searchPaths: ["title", "content"],
    defaultSort: "-publishedAt",
  });

  const [items, total] = await Promise.all([
    Tutorial.find(filter)
      .select("title slug videoUrl featuredImage seo publishedAt")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate([{ path: "featuredImage" }])
      .lean(),
    Tutorial.countDocuments(filter),
  ]);

  return ok(res, items, listMeta({ page, limit, total }));
});

export const getTutorialBySlug = asyncHandler(async (req, res) => {
  const doc = await Tutorial.findOne({ slug: req.params.slug.toLowerCase(), ...publishedMatch })
    .populate([
      { path: "featuredImage" },
      { path: "products", match: publishedMatch, select: "title slug hero shortDescription" },
      { path: "industries", match: publishedMatch, select: "title slug coverImage headline" },
      { path: "seo.ogImage" },
      { path: "seo.twitterImage" },
    ])
    .lean();

  if (!doc) return fail(res, 404, "NOT_FOUND", "Tutorial not found");
  return ok(res, doc);
});
