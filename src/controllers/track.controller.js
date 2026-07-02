import crypto from "crypto";
import { Visitor } from "../models/Visitor.js";
import { PageView } from "../models/PageView.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import {
  hashIp,
  getClientIp,
  isBotUserAgent,
  parseUserAgent,
  computeVisitorScore,
  readCookie,
  visitorCookieOptions,
  VISITOR_COOKIE,
} from "../utils/track.js";

// Recompute the engagement score from recent activity. Pulls a small window of
// the visitor's most recent paths so high-intent pages bump the score.
async function recomputeScore(visitor) {
  const recent = await PageView.find({ visitor: visitor._id })
    .sort({ viewedAt: -1 })
    .limit(20)
    .select("path")
    .lean();
  const paths = recent.map((p) => p.path);
  visitor.score = computeVisitorScore({
    pageViewCount: visitor.pageViewCount,
    paths,
    hasLead: visitor.linkedLeads.length > 0,
  });
}

function safeStr(v, max = 2048) {
  if (v == null) return "";
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

// POST /api/track  — public, called by the small tracker script on the website.
// Honours Do-Not-Track and skips known bots so the lead funnel stays clean.
export const trackPageView = asyncHandler(async (req, res) => {
  // Respect DNT signal — store nothing.
  if (req.headers.dnt === "1") return ok(res, { tracked: false, reason: "dnt" });

  const ua = safeStr(req.headers["user-agent"], 512);
  if (isBotUserAgent(ua)) return ok(res, { tracked: false, reason: "bot" });

  const body = req.body || {};
  const path = safeStr(body.path || "/", 1024);
  const title = safeStr(body.title, 512);
  const referrer = safeStr(body.referrer, 1024);
  const utm = {
    source: safeStr(body?.utm?.source, 256),
    medium: safeStr(body?.utm?.medium, 256),
    campaign: safeStr(body?.utm?.campaign, 256),
    content: safeStr(body?.utm?.content, 256),
    term: safeStr(body?.utm?.term, 256),
  };

  // Visitor cookie: use the existing one or mint a new id and set it on the response.
  let visitorId = readCookie(req, VISITOR_COOKIE);
  let isNewVisitor = false;
  if (!visitorId || visitorId.length < 16) {
    visitorId = crypto.randomUUID();
    isNewVisitor = true;
    res.cookie(VISITOR_COOKIE, visitorId, visitorCookieOptions());
  }

  const ipHash = hashIp(getClientIp(req));
  const parsed = parseUserAgent(ua);

  // Upsert the Visitor row. On first sight, capture the entry context so we
  // can attribute conversions back to the source/landing page later.
  const setOnInsert = {
    visitorId,
    firstSeenAt: new Date(),
    firstReferrer: referrer,
    firstLandingPath: path,
    firstUtm: utm,
    userAgent: ua,
    ipHash,
    ...parsed,
  };

  const visitor = await Visitor.findOneAndUpdate(
    { visitorId },
    {
      $setOnInsert: setOnInsert,
      $set: { lastSeenAt: new Date(), userAgent: ua, ipHash, ...parsed },
      $inc: { pageViewCount: 1 },
    },
    { new: true, upsert: true }
  );

  await PageView.create({
    visitor: visitor._id,
    visitorId,
    path,
    title,
    referrer,
    utm,
    viewedAt: new Date(),
  });

  await recomputeScore(visitor);
  await visitor.save();

  return ok(res, {
    tracked: true,
    isNewVisitor,
    visitorId,
    score: visitor.score,
  });
});
