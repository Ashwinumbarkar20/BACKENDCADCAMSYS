import mongoose from "mongoose";
import { Visitor } from "../../models/Visitor.js";
import { PageView } from "../../models/PageView.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, fail } from "../../utils/apiResponse.js";
import { listMeta } from "../../utils/publicList.js";

function parseListQuery(req) {
  const page = Math.max(1, Number.parseInt(req.query.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit ?? "20", 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.hasLead === "true") filter["linkedLeads.0"] = { $exists: true };
  if (req.query.hasLead === "false") filter["linkedLeads.0"] = { $exists: false };
  if (req.query.device && ["desktop", "mobile", "tablet"].includes(String(req.query.device))) {
    filter.device = String(req.query.device);
  }
  if (req.query.minScore) {
    const n = Number(req.query.minScore);
    if (!Number.isNaN(n)) filter.score = { ...(filter.score || {}), $gte: n };
  }
  if (req.query.from) {
    const d = new Date(String(req.query.from));
    if (!Number.isNaN(d.getTime())) filter.lastSeenAt = { ...(filter.lastSeenAt || {}), $gte: d };
  }
  if (req.query.to) {
    const d = new Date(String(req.query.to));
    if (!Number.isNaN(d.getTime())) filter.lastSeenAt = { ...(filter.lastSeenAt || {}), $lte: d };
  }
  if (req.query.q && typeof req.query.q === "string") {
    const rx = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { firstReferrer: rx },
      { firstLandingPath: rx },
      { browser: rx },
      { os: rx },
      { country: rx },
      { city: rx },
      { notes: rx },
    ];
  }

  // Default sort: most-engaged first, then most recent.
  let sort = "-score -lastSeenAt";
  if (typeof req.query.sort === "string" && /^-?[a-zA-Z0-9_.]+$/.test(req.query.sort)) {
    sort = req.query.sort;
  }

  return { filter, page, limit, skip, sort };
}

export const listVisitors = asyncHandler(async (req, res) => {
  const { filter, page, limit, skip, sort } = parseListQuery(req);
  const [items, total] = await Promise.all([
    Visitor.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Visitor.countDocuments(filter),
  ]);
  return ok(res, items, listMeta({ page, limit, total }));
});

export const getVisitor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return fail(res, 400, "BAD_ID", "Invalid id");
  const visitor = await Visitor.findById(id).lean();
  if (!visitor) return fail(res, 404, "NOT_FOUND", "Visitor not found");

  const pageviews = await PageView.find({ visitor: visitor._id })
    .sort({ viewedAt: -1 })
    .limit(500)
    .lean();

  return ok(res, { ...visitor, pageviews });
});

export const updateVisitor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return fail(res, 400, "BAD_ID", "Invalid id");
  // Admin can edit notes only — everything else is derived data.
  const update = {};
  if (typeof req.body?.notes === "string") update.notes = req.body.notes;
  const visitor = await Visitor.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!visitor) return fail(res, 404, "NOT_FOUND", "Visitor not found");
  return ok(res, visitor);
});

// Hard-delete the visitor and all their pageviews. For GDPR right-to-erasure
// requests; no soft-delete because the data is anonymous-by-design.
export const deleteVisitor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return fail(res, 400, "BAD_ID", "Invalid id");
  const visitor = await Visitor.findById(id);
  if (!visitor) return fail(res, 404, "NOT_FOUND", "Visitor not found");
  await PageView.deleteMany({ visitor: visitor._id });
  await visitor.deleteOne();
  return ok(res, { deleted: true });
});

// Roll-up of recent traffic for the dashboard / list page header.
export const visitorStats = asyncHandler(async (req, res) => {
  const days = Math.min(90, Math.max(1, Number.parseInt(req.query.days ?? "30", 10) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [totals, byDay, topPaths, topReferrers, topUtm, leadCount] = await Promise.all([
    // Headline numbers
    Visitor.aggregate([
      { $match: { lastSeenAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          uniqueVisitors: { $sum: 1 },
          totalPageViews: { $sum: "$pageViewCount" },
          avgScore: { $avg: "$score" },
        },
      },
    ]).then((r) => r[0] || { uniqueVisitors: 0, totalPageViews: 0, avgScore: 0 }),

    // Daily timeseries
    PageView.aggregate([
      { $match: { viewedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$viewedAt" } },
          views: { $sum: 1 },
          uniques: { $addToSet: "$visitorId" },
        },
      },
      { $project: { date: "$_id", _id: 0, views: 1, uniques: { $size: "$uniques" } } },
      { $sort: { date: 1 } },
    ]),

    // Top pages (by views)
    PageView.aggregate([
      { $match: { viewedAt: { $gte: since } } },
      { $group: { _id: "$path", views: { $sum: 1 }, uniques: { $addToSet: "$visitorId" } } },
      { $project: { path: "$_id", _id: 0, views: 1, uniques: { $size: "$uniques" } } },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]),

    // Top referrers (excluding empty / self)
    PageView.aggregate([
      { $match: { viewedAt: { $gte: since }, referrer: { $nin: ["", null] } } },
      { $group: { _id: "$referrer", views: { $sum: 1 } } },
      { $project: { referrer: "$_id", _id: 0, views: 1 } },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]),

    // Top UTM sources
    PageView.aggregate([
      { $match: { viewedAt: { $gte: since }, "utm.source": { $nin: ["", null] } } },
      {
        $group: {
          _id: { source: "$utm.source", medium: "$utm.medium", campaign: "$utm.campaign" },
          views: { $sum: 1 },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]),

    // Visitors who became leads
    Visitor.countDocuments({
      lastSeenAt: { $gte: since },
      "linkedLeads.0": { $exists: true },
    }),
  ]);

  const conversionRate =
    totals.uniqueVisitors > 0 ? (leadCount / totals.uniqueVisitors) * 100 : 0;

  return ok(res, {
    rangeDays: days,
    totals: {
      uniqueVisitors: totals.uniqueVisitors,
      totalPageViews: totals.totalPageViews,
      avgScore: Math.round((totals.avgScore || 0) * 10) / 10,
      leadCount,
      conversionRatePct: Math.round(conversionRate * 100) / 100,
    },
    byDay,
    topPaths,
    topReferrers,
    topUtm,
  });
});
