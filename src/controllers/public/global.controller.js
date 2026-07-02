import { Settings } from "../../models/Settings.js";
import { Navigation } from "../../models/Navigation.js";
import { Footer } from "../../models/Footer.js";
import { HomePage } from "../../models/HomePage.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/apiResponse.js";

async function getSingleton(Model, populate) {
  let q = Model.findOne({ singletonKey: "global" });
  if (populate) for (const p of populate) q = q.populate(p);
  const doc = await q.lean();
  if (doc) return doc;
  const created = await Model.create({ singletonKey: "global" });
  return created.toObject();
}

export const getPublicSettings = asyncHandler(async (_req, res) => {
  const settings = await getSingleton(Settings);
  return ok(res, settings);
});

export const getPublicNavigation = asyncHandler(async (_req, res) => {
  const nav = await getSingleton(Navigation);
  return ok(res, nav);
});

export const getPublicFooter = asyncHandler(async (_req, res) => {
  const footer = await getSingleton(Footer);
  return ok(res, footer);
});

export const getPublicHome = asyncHandler(async (_req, res) => {
  // Populate media refs so the public site receives resolvable URLs.
  const home = await getSingleton(HomePage, [
    "hero.image",
    "hero.videoFile",
    "trustBar.logos",
    "seo.ogImage",
    "seo.twitterImage",
  ]);
  return ok(res, home);
});

