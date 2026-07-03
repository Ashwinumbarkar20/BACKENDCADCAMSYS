import { Product } from "../../models/Product.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, fail } from "../../utils/apiResponse.js";
import { listMeta, parsePublicListQuery } from "../../utils/publicList.js";

const publishedMatch = { status: "published" };

export const listProducts = asyncHandler(async (req, res) => {
  const { filter, page, limit, skip, sort } = parsePublicListQuery(req, {
    filters: {
      category: "objectId",
      solution: "objectId",
      relatedIndustries: "objectId",
    },
    searchPaths: ["title", "tagline", "overview"],
    defaultSort: "title",
  });

  const [items, total] = await Promise.all([
    Product.find(filter)
      .select("title slug tagline overview coverImage logo seo publishedAt category solution keyFeatures")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate([
        { path: "category", select: "title slug" },
        { path: "solution", select: "title slug" },
        { path: "coverImage" },
        { path: "logo" },
        { path: "keyFeatures.image" },
      ])
      .lean(),
    Product.countDocuments(filter),
  ]);

  return ok(res, items, listMeta({ page, limit, total }));
});

export const getProductBySlug = asyncHandler(async (req, res) => {
  const doc = await Product.findOne({ slug: req.params.slug.toLowerCase(), ...publishedMatch })
    .populate([
      { path: "category", select: "title slug" },
      { path: "solution", match: publishedMatch, select: "title slug tagline seo" },
      { path: "coverImage" },
      { path: "logo" },
      { path: "keyFeatures.image" },
      { path: "supportingMachine.images" },
      {
        path: "relatedIndustries",
        match: publishedMatch,
        select: "title slug coverImage headline seo",
      },
      {
        path: "relatedBlogs",
        match: publishedMatch,
        select: "title slug excerpt featuredImage publishedAt seo",
      },
      {
        path: "relatedTestimonials",
        match: publishedMatch,
        select: "customerName company designation quote photo logo rating seo",
      },
      {
        path: "relatedCaseStudies",
        match: publishedMatch,
        select: "title slug customerName customerLogo industry seo",
        populate: [{ path: "customerLogo" }],
      },
      { path: "mediaSection.pdfs.file" },
      { path: "seo.ogImage" },
      { path: "seo.twitterImage" },
    ])
    .lean();

  if (!doc) return fail(res, 404, "NOT_FOUND", "Product not found");
  return ok(res, doc);
});
