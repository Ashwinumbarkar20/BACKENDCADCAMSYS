import { Router } from "express";
import { createSingletonControllers } from "../../controllers/admin/singleton.controller.js";
import { Settings, Navigation, Footer, HomePage, SolutionsPage, About } from "../../models/index.js";
import { requireOwner } from "../../middlewares/permissions.js";

export const adminSingletonsRouter = Router();

// Settings, Navigation, Footer, and Home are site-wide config — owner only.
adminSingletonsRouter.use(requireOwner);

const settingsCtl = createSingletonControllers(Settings, {
  populate: ["logo", "favicon"],
});
adminSingletonsRouter.get("/settings", settingsCtl.getOne);
adminSingletonsRouter.put("/settings", settingsCtl.updateOne);

const navCtl = createSingletonControllers(Navigation);
adminSingletonsRouter.get("/navigation", navCtl.getOne);
adminSingletonsRouter.put("/navigation", navCtl.updateOne);

const footerCtl = createSingletonControllers(Footer);
adminSingletonsRouter.get("/footer", footerCtl.getOne);
adminSingletonsRouter.put("/footer", footerCtl.updateOne);

const homeCtl = createSingletonControllers(HomePage, {
  populate: [
    "hero.image",
    "hero.videoFile",
    "trustBar.logos",
    "seo.ogImage",
    "seo.twitterImage",
    "featuredSolutions",
    "featuredProducts",
    "featuredIndustries",
  ],
});
adminSingletonsRouter.get("/home", homeCtl.getOne);
adminSingletonsRouter.put("/home", homeCtl.updateOne);

const solutionsPageCtl = createSingletonControllers(SolutionsPage);
adminSingletonsRouter.get("/solutions-page", solutionsPageCtl.getOne);
adminSingletonsRouter.put("/solutions-page", solutionsPageCtl.updateOne);

const aboutCtl = createSingletonControllers(About, {
  populate: ["heroImage", "seo.ogImage", "seo.twitterImage"],
});
adminSingletonsRouter.get("/about", aboutCtl.getOne);
adminSingletonsRouter.put("/about", aboutCtl.updateOne);

