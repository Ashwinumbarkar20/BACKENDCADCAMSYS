import { Testimonial } from "../../models/Testimonial.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, fail } from "../../utils/apiResponse.js";
import { listMeta, parsePublicListQuery } from "../../utils/publicList.js";

const publishedMatch = { status: "published" };

export const listTestimonials = asyncHandler(async (req, res) => {
  const { filter, page, limit, skip, sort } = parsePublicListQuery(req, {
    filters: {
      industry: "objectId",
      products: "objectId",
    },
    searchPaths: ["customerName", "company", "quote"],
    defaultSort: "-publishedAt",
  });

  const [items, total] = await Promise.all([
    Testimonial.find(filter)
      .select("customerName company designation quote photo logo rating industry products seo publishedAt")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate([
        { path: "photo" },
        { path: "logo" },
        { path: "industry", select: "title slug" },
        { path: "products", match: publishedMatch, select: "title slug" },
      ])
      .lean(),
    Testimonial.countDocuments(filter),
  ]);

  return ok(res, items, listMeta({ page, limit, total }));
});

export const getTestimonialById = asyncHandler(async (req, res) => {
  const doc = await Testimonial.findOne({ _id: req.params.id, ...publishedMatch })
    .populate([
      { path: "photo" },
      { path: "logo" },
      { path: "industry", match: publishedMatch, select: "title slug coverImage headline" },
      { path: "products", match: publishedMatch, select: "title slug shortDescription hero" },
      { path: "seo.ogImage" },
      { path: "seo.twitterImage" },
    ])
    .lean();

  if (!doc) return fail(res, 404, "NOT_FOUND", "Testimonial not found");
  return ok(res, doc);
});
