import { Solution } from "../../models/Solution.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, fail } from "../../utils/apiResponse.js";
import { listMeta, parsePublicListQuery } from "../../utils/publicList.js";

const publishedMatch = { status: "published" };

export const listSolutions = asyncHandler(async (req, res) => {
  const { filter, page, limit, skip, sort } = parsePublicListQuery(req, {
    filters: {
      products: "objectId",
      industries: "objectId",
    },
    searchPaths: ["title", "shortDescription"],
    defaultSort: "sortOrder",
  });

  const [items, total] = await Promise.all([
    Solution.find(filter)
      .select("title slug shortDescription coverImage seo publishedAt createdAt sortOrder")
      .sort({ sortOrder: 1, title: 1 })
      .skip(skip)
      .limit(limit)
      .populate([
        { path: "coverImage" },
        {
          path: "products",
          match: publishedMatch,
          select: "title slug tagline coverImage seo",
          // Order follows the admin's products array on the solution.
          populate: [{ path: "coverImage" }],
        },
      ])
      .lean(),
    Solution.countDocuments(filter),
  ]);

  return ok(res, items, listMeta({ page, limit, total }));
});

export const getSolutionBySlug = asyncHandler(async (req, res) => {
  const doc = await Solution.findOne({ slug: req.params.slug.toLowerCase(), ...publishedMatch })
    .populate([
      { path: "coverImage" },
      {
        path: "products",
        match: publishedMatch,
        select: "title slug tagline coverImage seo",
        populate: [{ path: "coverImage" }],
      },
      {
        path: "industries",
        match: publishedMatch,
        select: "title slug coverImage headline seo",
        populate: [{ path: "coverImage" }],
      },
      {
        // Blog hero images live in `images` — there is no `featuredImage` path,
        // and populating a non-existent path makes Mongoose throw (500).
        path: "blogs",
        match: publishedMatch,
        select: "title slug excerpt images publishedAt seo",
        populate: [{ path: "images" }],
      },
      {
        path: "caseStudies",
        match: publishedMatch,
        select: "title slug customerName customerLogo industry seo",
        populate: [{ path: "customerLogo" }],
      },
      {
        path: "testimonials",
        match: publishedMatch,
        select: "customerName company designation quote photo logo rating seo",
        populate: [{ path: "photo" }, { path: "logo" }],
      },
      { path: "seo.ogImage" },
      { path: "seo.twitterImage" },
    ])
    .lean();

  if (!doc) return fail(res, 404, "NOT_FOUND", "Solution not found");
  return ok(res, doc);
});
