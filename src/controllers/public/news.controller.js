import { News } from "../../models/News.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, fail } from "../../utils/apiResponse.js";
import { listMeta, parsePublicListQuery } from "../../utils/publicList.js";

const publishedMatch = { status: "published" };

export const listNews = asyncHandler(async (req, res) => {
  const { filter, page, limit, skip, sort } = parsePublicListQuery(req, {
    searchPaths: ["title", "overview"],
    defaultSort: "-publishedAt",
  });

  const [items, total] = await Promise.all([
    News.find(filter)
      .select("title slug coverImage overview publishedAt seo")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate([{ path: "coverImage" }])
      .lean(),
    News.countDocuments(filter),
  ]);

  return ok(res, items, listMeta({ page, limit, total }));
});

export const getNewsBySlug = asyncHandler(async (req, res) => {
  const doc = await News.findOne({ slug: req.params.slug.toLowerCase(), ...publishedMatch })
    .populate([
      { path: "coverImage" },
      {
        path: "relatedNews",
        match: publishedMatch,
        select: "title slug coverImage overview publishedAt",
        populate: { path: "coverImage" },
      },
      {
        path: "relatedProducts",
        match: publishedMatch,
        select: "title slug tagline coverImage",
        populate: { path: "coverImage" },
      },
      {
        path: "relatedIndustries",
        match: publishedMatch,
        select: "title slug coverImage headline",
        populate: { path: "coverImage" },
      },
      {
        path: "relatedTestimonials",
        match: publishedMatch,
        select: "customerName company designation quote photo logo rating",
        populate: [{ path: "photo" }, { path: "logo" }],
      },
      {
        path: "relatedBlogs",
        match: publishedMatch,
        select: "title slug excerpt images publishedAt",
        populate: { path: "images" },
      },
      {
        path: "relatedCaseStudies",
        match: publishedMatch,
        select: "title slug customerName customerLogo",
        populate: { path: "customerLogo" },
      },
      { path: "seo.ogImage" },
      { path: "seo.twitterImage" },
    ])
    .lean();

  if (!doc) return fail(res, 404, "NOT_FOUND", "News article not found");
  return ok(res, doc);
});
