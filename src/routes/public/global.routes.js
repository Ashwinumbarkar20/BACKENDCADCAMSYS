import { Router } from "express";
import { getPublicFooter, getPublicHome, getPublicNavigation, getPublicSettings, getPublicSolutionsPage } from "../../controllers/public/global.controller.js";
import { sitemapUrls } from "../../controllers/public/sitemap.controller.js";

export const publicGlobalRouter = Router();

publicGlobalRouter.get("/settings", getPublicSettings);
publicGlobalRouter.get("/navigation", getPublicNavigation);
publicGlobalRouter.get("/footer", getPublicFooter);
publicGlobalRouter.get("/home", getPublicHome);
publicGlobalRouter.get("/solutions-page", getPublicSolutionsPage);
publicGlobalRouter.get("/sitemap-urls", sitemapUrls);

