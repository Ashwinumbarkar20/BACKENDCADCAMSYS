import { Blog } from "../../models/Blog.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, fail } from "../../utils/apiResponse.js";
import { listMeta, parsePublicListQuery } from "../../utils/publicList.js";

const publishedMatch = { status: "published" };

export const listBlogs = asyncHandler(async (req, res) => {
  const { filter, page, limit, skip, sort } = parsePublicListQuery(req, {
    filters: {
      tag: "string", // ?tag=foo  → maps to { tags: "foo" } below
    },
    searchPaths: ["title", "excerpt"],
    defaultSort: "-publishedAt",
  });

  // Rename the `tag` filter to match Mongo path `tags` (array of strings).
  if (filter.tag !== undefined) {
    filter.tags = filter.tag;
    delete filter.tag;
  }

  const [items, total] = await Promise.all([
    Blog.find(filter)
      .select("title slug excerpt images tags publishedAt seo")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate([{ path: "images" }])
      .lean(),
    Blog.countDocuments(filter),
  ]);

  return ok(res, items, listMeta({ page, limit, total }));
});

export const getBlogBySlug = asyncHandler(async (req, res) => {
  const doc = await Blog.findOne({ slug: req.params.slug.toLowerCase(), ...publishedMatch })
    .populate([
      { path: "images" },
      { path: "sections.detailSections.images" },
      {
        path: "relatedProducts",
        match: publishedMatch,
        // coverImage must be selected AND populated, otherwise the related
        // product cards on the blog page render with no image.
        select: "title slug tagline overview keyFeatures seo solution coverImage",
        // Nested populate so the website can derive "Related solutions" badges
        // from relatedProducts[].solution without needing a separate ref array.
        populate: [
          { path: "solution", match: publishedMatch, select: "title slug" },
          { path: "coverImage" },
        ],
      },
      {
        path: "relatedIndustries",
        match: publishedMatch,
        select: "title slug coverImage headline seo",
        populate: [{ path: "coverImage" }],
      },
      {
        path: "relatedCaseStudies",
        match: publishedMatch,
        select: "title slug customerName customerLogo industry seo",
        populate: [{ path: "customerLogo" }],
      },
      { path: "seo.ogImage" },
      { path: "seo.twitterImage" },
    ])
    .lean();

  if (!doc) return fail(res, 404, "NOT_FOUND", "Blog not found");
  return ok(res, doc);
});
