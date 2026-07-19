import { Router } from "express";
import { getPublicAbout, getPublicAlma, getPublicServicePage, getPublicFooter, getPublicHome, getPublicNavigation, getPublicSettings, getPublicSolutionsPage } from "../../controllers/public/global.controller.js";
import { sitemapUrls } from "../../controllers/public/sitemap.controller.js";

export const publicGlobalRouter = Router();

publicGlobalRouter.get("/settings", getPublicSettings);
publicGlobalRouter.get("/navigation", getPublicNavigation);
publicGlobalRouter.get("/footer", getPublicFooter);
publicGlobalRouter.get("/home", getPublicHome);
publicGlobalRouter.get("/solutions-page", getPublicSolutionsPage);
publicGlobalRouter.get("/about", getPublicAbout);
publicGlobalRouter.get("/alma", getPublicAlma);
publicGlobalRouter.get("/services-page", getPublicServicePage);
publicGlobalRouter.get("/sitemap-urls", sitemapUrls);

