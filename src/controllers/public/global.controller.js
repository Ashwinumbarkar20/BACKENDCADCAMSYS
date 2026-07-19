import { Settings } from "../../models/Settings.js";
import { Navigation } from "../../models/Navigation.js";
import { Footer } from "../../models/Footer.js";
import { HomePage } from "../../models/HomePage.js";
import { SolutionsPage } from "../../models/SolutionsPage.js";
import { About } from "../../models/About.js";
import { Alma, ServicePage, Amc, Training, PostProcessor, ImplementationConsulting } from "../../models/ContentSingletons.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/apiResponse.js";

const publishedMatch = { status: "published" };

async function getSingleton(Model, populate) {
  let q = Model.findOne({ singletonKey: "global" });
  if (populate) for (const p of populate) q = q.populate(p);
  const doc = await q.lean();
  if (doc) return doc;
  const created = await Model.create({ singletonKey: "global" });
  return created.toObject();
}

export const getPublicSettings = asyncHandler(async (_req, res) => {
  const settings = await getSingleton(Settings, ["logo", "favicon"]);
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
    {
      path: "featuredSolutions",
      match: publishedMatch,
      select: "title slug shortDescription overview coverImage seo",
      populate: [{ path: "coverImage" }],
    },
    {
      path: "featuredProducts",
      match: publishedMatch,
      select: "title slug tagline overview coverImage seo category",
      populate: [
        { path: "coverImage" },
        { path: "category", select: "title slug" },
      ],
    },
    {
      path: "featuredIndustries",
      match: publishedMatch,
      select: "title slug headline coverImage seo",
      populate: [{ path: "coverImage" }],
    },
  ]);
  return ok(res, home);
});

export const getPublicSolutionsPage = asyncHandler(async (_req, res) => {
  const page = await getSingleton(SolutionsPage);
  return ok(res, page);
});

export const getPublicAbout = asyncHandler(async (_req, res) => {
  // Populate media refs so the public site receives resolvable image URLs.
  const about = await getSingleton(About, ["heroImage", "seo.ogImage", "seo.twitterImage"]);
  return ok(res, about);
});

export const getPublicAlma = asyncHandler(async (_req, res) => {
  const alma = await getSingleton(Alma, ["heroImage", "seo.ogImage", "seo.twitterImage"]);
  return ok(res, alma);
});

export const getPublicServicePage = asyncHandler(async (_req, res) => {
  const services = await getSingleton(ServicePage, ["heroImage", "seo.ogImage", "seo.twitterImage"]);
  return ok(res, services);
});

const servicePop = ["heroImage", "seo.ogImage", "seo.twitterImage"];
export const getPublicAmc = asyncHandler(async (_req, res) =>
  ok(res, await getSingleton(Amc, servicePop)),
);
export const getPublicTraining = asyncHandler(async (_req, res) =>
  ok(res, await getSingleton(Training, servicePop)),
);
export const getPublicPostProcessor = asyncHandler(async (_req, res) =>
  ok(res, await getSingleton(PostProcessor, servicePop)),
);
export const getPublicImplementationConsulting = asyncHandler(async (_req, res) =>
  ok(res, await getSingleton(ImplementationConsulting, servicePop)),
);

