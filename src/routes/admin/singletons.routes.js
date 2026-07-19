import { Router } from "express";
import { createSingletonControllers } from "../../controllers/admin/singleton.controller.js";
import { Settings, Navigation, Footer, HomePage, SolutionsPage, About, Alma, ServicePage, Amc, Training, PostProcessor, ImplementationConsulting, Roi, DownloadsPage } from "../../models/index.js";
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

const almaCtl = createSingletonControllers(Alma, {
  populate: ["heroImage", "seo.ogImage", "seo.twitterImage"],
});
adminSingletonsRouter.get("/alma", almaCtl.getOne);
adminSingletonsRouter.put("/alma", almaCtl.updateOne);

const servicePageCtl = createSingletonControllers(ServicePage, {
  populate: ["heroImage", "seo.ogImage", "seo.twitterImage"],
});
adminSingletonsRouter.get("/services-page", servicePageCtl.getOne);
adminSingletonsRouter.put("/services-page", servicePageCtl.updateOne);

// Service sub-pages.
const servicePop = { populate: ["heroImage", "seo.ogImage", "seo.twitterImage"] };
for (const [segment, Model] of [
  ["amc", Amc],
  ["training", Training],
  ["post-processor-development", PostProcessor],
  ["implementation-consulting", ImplementationConsulting],
]) {
  const ctl = createSingletonControllers(Model, servicePop);
  adminSingletonsRouter.get(`/${segment}`, ctl.getOne);
  adminSingletonsRouter.put(`/${segment}`, ctl.updateOne);
}

const roiCtl = createSingletonControllers(Roi, servicePop);
adminSingletonsRouter.get("/roi-center", roiCtl.getOne);
adminSingletonsRouter.put("/roi-center", roiCtl.updateOne);

const downloadsCtl = createSingletonControllers(DownloadsPage, {
  populate: ["items.file", "seo.ogImage", "seo.twitterImage"],
});
adminSingletonsRouter.get("/downloads", downloadsCtl.getOne);
adminSingletonsRouter.put("/downloads", downloadsCtl.updateOne);

