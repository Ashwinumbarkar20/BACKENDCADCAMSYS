import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import compression from "compression";

import { env } from "./config/env.js";
import { getUploadDir, UPLOAD_PUBLIC_PATH } from "./config/uploads.js";
import { getUploadStorageDiagnostics } from "./utils/uploadsBackup.js";
import { getEmailDiagnostics } from "./services/email.service.js";
import { adminCors, publicCors } from "./middlewares/cors.js";
import { authRouter } from "./routes/auth.routes.js";
import { publicGlobalRouter } from "./routes/public/global.routes.js";
import { publicIndustriesRouter } from "./routes/public/industries.routes.js";
import { publicSolutionsRouter } from "./routes/public/solutions.routes.js";
import { publicProductsRouter } from "./routes/public/products.routes.js";
import { publicBlogsRouter } from "./routes/public/blogs.routes.js";
import { publicPagesRouter } from "./routes/public/pages.routes.js";
import { publicCaseStudiesRouter } from "./routes/public/caseStudies.routes.js";
import { publicTestimonialsRouter } from "./routes/public/testimonials.routes.js";
import { publicTutorialsRouter } from "./routes/public/tutorials.routes.js";
import { publicCareersRouter } from "./routes/public/careers.routes.js";
import { publicTeamMembersRouter } from "./routes/public/teamMembers.routes.js";
import { publicCategoriesRouter } from "./routes/public/categories.routes.js";
import { publicNewsRouter } from "./routes/public/news.routes.js";
import { formsRouter } from "./routes/forms.routes.js";
import { trackRouter } from "./routes/track.routes.js";
import { adminSingletonsRouter } from "./routes/admin/singletons.routes.js";
import { adminMediaRouter } from "./routes/admin/media.routes.js";
import { adminCrudRouter } from "./routes/admin/crud.routes.js";
import { sitemapXml, robotsTxt } from "./controllers/public/sitemap.controller.js";

import { requireAuth } from "./middlewares/auth.js";
import { loadUserPermissions } from "./middlewares/permissions.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  // Allow uploads to render in <img> from the admin SPA (different port / origin in dev).
  // Default Helmet CORP is same-origin, which breaks http://localhost:5173 → http://localhost:4000/uploads/...
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  // Rate limits are applied per surface (login, forms, track) — not globally.
  // A global limiter counted admin saves, media previews, and /uploads/* in one
  // bucket and caused 429 "Too many requests" during normal CMS editing.

  // Static uploads (swap to CDN/S3 in production). Uploaded files have unique
  // timestamped names, so they can be cached aggressively by the browser and by
  // next/image's optimizer — cutting repeat image loads on the public site.
  app.use(
    `/${UPLOAD_PUBLIC_PATH}`,
    express.static(getUploadDir(), { maxAge: "30d", etag: true, lastModified: true }),
  );

  // Static assets shipped with the backend (e.g. the tracker.js snippet served
  // at /tracker.js for embedding on the public website).
  app.use(express.static("public", { maxAge: "1h" }));

  // Lightweight liveness probe (used by container healthcheck and reverse proxy).
  app.get("/health", (_req, res) => {
    const storage = getUploadStorageDiagnostics();
    return res.json({
      status: "ok",
      version: "1.0.8",
      deployTest: "faq-email-diagnostics",
      email: getEmailDiagnostics(),
      persistentStorage: storage.persistentStorage,
      hostingerDetected: storage.hostingerDetected,
      uploadDir: storage.uploadDir,
      projectUploadDir: storage.projectUploadDir,
      uploadsBackup: storage.uploadsBackupEnv,
      backupDir: storage.backupDir,
      uploadFileCount: storage.uploadFileCount,
      backupFileCount: storage.backupFileCount,
      uptime: process.uptime(),
    });
  });

  // SEO endpoints served at the app root so crawlers find them at /sitemap.xml + /robots.txt.
  app.get("/sitemap.xml", sitemapXml);
  app.get("/robots.txt", robotsTxt);

  // Auth
  app.use(publicCors());
  app.use("/api/auth", authRouter);

  // Public APIs
  app.use(publicCors());
  app.use("/api/public", publicGlobalRouter);
  app.use("/api/public/industries", publicIndustriesRouter);
  app.use("/api/public/solutions", publicSolutionsRouter);
  app.use("/api/public/products", publicProductsRouter);
  app.use("/api/public/blogs", publicBlogsRouter);
  app.use("/api/public/pages", publicPagesRouter);
  app.use("/api/public/case-studies", publicCaseStudiesRouter);
  app.use("/api/public/testimonials", publicTestimonialsRouter);
  app.use("/api/public/tutorials", publicTutorialsRouter);
  app.use("/api/public/careers", publicCareersRouter);
  app.use("/api/public/team-members", publicTeamMembersRouter);
  app.use("/api/public/news", publicNewsRouter);
  app.use("/api/public", publicCategoriesRouter);

  // Form APIs
  app.use(publicCors());
  app.use("/api", formsRouter);

  // Anonymous visitor tracking (page views from the public website).
  // Uses cookies; CORS for the public site already enables credentials.
  app.use(publicCors());
  app.use("/api/track", trackRouter);

  // Admin APIs (protected). loadUserPermissions hydrates req.fullUser so
  // downstream routers can call requireOwner / requirePermission.
  app.use("/api/admin", adminCors(), requireAuth, loadUserPermissions, adminSingletonsRouter);
  app.use("/api/admin", adminCors(), requireAuth, loadUserPermissions, adminMediaRouter);
  app.use("/api/admin", adminCors(), requireAuth, loadUserPermissions, adminCrudRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

