import {
  Page,
  Solution,
  Product,
  Industry,
  Blog,
  CaseStudy,
  Tutorial,
  Career,
  Settings,
} from "../../models/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/apiResponse.js";

// Content types that map to public URLs, with the URL prefix used on the
// Next.js site. Keep this in sync with the public site's routing.
const SITEMAP_MODELS = [
  { Model: Page, prefix: "" },
  { Model: Solution, prefix: "/solutions" },
  { Model: Product, prefix: "/products" },
  { Model: Industry, prefix: "/industries" },
  { Model: Blog, prefix: "/blog" },
  { Model: CaseStudy, prefix: "/case-studies" },
  { Model: Tutorial, prefix: "/tutorials" },
  { Model: Career, prefix: "/careers" },
];

const DEFAULT_PRIORITY = 0.5;
const DEFAULT_CHANGEFREQ = "weekly";

async function getSiteUrl() {
  const settings = await Settings.findOne({ singletonKey: "global" })
    .select("siteUrl")
    .lean();
  let raw = settings?.siteUrl || process.env.PUBLIC_SITE_URL || "";
  raw = String(raw).trim().replace(/\/$/, "");
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  return raw;
}

async function collectUrls(siteUrl) {
  const entries = [];
  // Homepage
  if (siteUrl) {
    entries.push({
      loc: `${siteUrl}/`,
      lastmod: new Date(),
      changefreq: "daily",
      priority: 1.0,
    });
  }
  await Promise.all(
    SITEMAP_MODELS.map(async ({ Model, prefix }) => {
      const docs = await Model.find({
        status: "published",
        $or: [
          { "seo.includeInSitemap": { $exists: false } },
          { "seo.includeInSitemap": true },
        ],
      })
        .select("slug seo publishedAt updatedAt")
        .lean();

      for (const d of docs) {
        if (!d.slug) continue;
        const path = `${prefix}/${d.slug}`.replace(/\/+/g, "/");
        const loc = siteUrl ? `${siteUrl}${path}` : path;
        entries.push({
          loc,
          lastmod: d.updatedAt || d.publishedAt || new Date(),
          changefreq: d?.seo?.changeFrequency || DEFAULT_CHANGEFREQ,
          priority: typeof d?.seo?.sitemapPriority === "number"
            ? d.seo.sitemapPriority
            : DEFAULT_PRIORITY,
        });
      }
    }),
  );
  return entries;
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const sitemapXml = asyncHandler(async (_req, res) => {
  const siteUrl = await getSiteUrl();
  const entries = await collectUrls(siteUrl);

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries
      .map(
        (e) =>
          `  <url>\n` +
          `    <loc>${xmlEscape(e.loc)}</loc>\n` +
          `    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>\n` +
          `    <changefreq>${xmlEscape(e.changefreq)}</changefreq>\n` +
          `    <priority>${Number(e.priority).toFixed(1)}</priority>\n` +
          `  </url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
  return res.send(body);
});

export const robotsTxt = asyncHandler(async (req, res) => {
  const siteUrl = await getSiteUrl();
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http").toString().split(",")[0];
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString();
  const apiBase = siteUrl || (host ? `${proto}://${host}` : "");

  const body =
    `User-agent: *\n` +
    `Allow: /\n` +
    `Disallow: /api/admin/\n` +
    (apiBase ? `Sitemap: ${apiBase}/sitemap.xml\n` : "");

  res.set("Content-Type", "text/plain; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
  return res.send(body);
});

// JSON helper for the Next.js site (or any consumer) that wants to render its
// own sitemap/robots. Returns absolute URLs when siteUrl is set.
export const sitemapUrls = asyncHandler(async (_req, res) => {
  const siteUrl = await getSiteUrl();
  const entries = await collectUrls(siteUrl);
  return ok(res, entries, { siteUrl });
});
