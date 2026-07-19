/**
 * One-time migration: move "About" from a generic Page to the dedicated About
 * singleton, and clean up the navigation.
 *
 * What it does (idempotent — safe to run multiple times):
 *   1. If the About singleton has no heading yet, seed it from the existing
 *      Page{slug:"about"} (title + sections → heading/intro/mission/seo).
 *   2. In the Navigation singleton, within the "About" menu, remove the
 *      "Team & Expertise" (/team) and "Why Choose Us" (/why-choose-us) children.
 *      If only the "About CADCAMSYS" self-link remains, collapse the dropdown to
 *      a plain link.
 *   3. Delete Page{slug:"why-choose-us"} (removed from the site entirely).
 *   4. Delete the now-superseded Page{slug:"about"} (content lives in the
 *      About singleton).
 *
 * Run from the backend directory:
 *   node src/migrations/2026-07-19-about-singleton.js
 * or:
 *   npm run migrate:about-singleton
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { About } from "../models/About.js";
import { Navigation } from "../models/Navigation.js";
import { Page } from "../models/Page.js";

// Labels/URLs of the About sub-sections being removed from the nav.
const REMOVED_URLS = ["/team", "/why-choose-us"];
const REMOVED_LABEL_RE = /(team\s*&?\s*expertise|why\s*choose|why\s*to\s*choose)/i;

function isRemovedChild(child) {
  const url = (child?.url || "").toLowerCase();
  const label = child?.label || "";
  if (REMOVED_URLS.includes(url)) return true;
  if (REMOVED_LABEL_RE.test(label)) return true;
  return false;
}

async function migrateAboutContent() {
  const about = await About.findOne({ singletonKey: "global" });
  if (about && about.heading) {
    console.log("  about singleton: already populated — skipping content copy");
    return;
  }

  const page = await Page.findOne({ slug: "about" }).lean();
  const payload = { singletonKey: "global" };

  if (page) {
    payload.heading = page.title || "About CADCAMSYS";
    const sections = Array.isArray(page.sections) ? page.sections : [];
    const hero = sections.find((s) => s.type === "hero");
    const texts = sections.filter((s) => s.type !== "hero");
    if (hero) payload.tagline = hero.title || "";
    if (hero?.image) payload.heroImage = hero.image;
    if (hero?.content) payload.intro = `<p>${hero.content}</p>`;
    if (texts[0]?.content) payload.mission = texts[0].content;
    if (texts[1]?.content) payload.vision = texts[1].content;
    payload.highlights = texts.slice(2).map((s) => ({
      icon: "",
      title: s.title || "",
      description: s.content || "",
    }));
    if (page.seo) payload.seo = page.seo;
  } else {
    payload.heading = "About CADCAMSYS";
  }

  await About.findOneAndUpdate(
    { singletonKey: "global" },
    { $set: payload, $setOnInsert: { singletonKey: "global" } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
  console.log(
    `  about singleton: seeded from ${page ? 'Page{slug:"about"}' : "defaults"} (heading="${payload.heading}")`,
  );
}

async function cleanupNavigation() {
  const nav = await Navigation.findOne({ singletonKey: "global" });
  if (!nav) {
    console.log("  navigation: none found — skipping");
    return;
  }

  let changed = 0;
  for (const menu of nav.items || []) {
    if (!Array.isArray(menu.children) || menu.children.length === 0) continue;
    const before = menu.children.length;
    menu.children = menu.children.filter((c) => !isRemovedChild(c));
    changed += before - menu.children.length;

    // Collapse a dropdown that now only points back to its own page.
    const isAboutMenu =
      (menu.url || "").toLowerCase() === "/about" || /about/i.test(menu.label || "");
    if (isAboutMenu && menu.children.length <= 1) {
      const onlyChild = menu.children[0];
      if (!onlyChild || (onlyChild.url || "").toLowerCase() === "/about") {
        menu.children = [];
      }
    }
  }

  if (changed > 0 || nav.isModified?.("items")) {
    nav.markModified("items");
    await nav.save();
    console.log(`  navigation: removed ${changed} About sub-item(s)`);
  } else {
    console.log("  navigation: nothing to remove");
  }
}

async function deletePages() {
  const why = await Page.deleteOne({ slug: "why-choose-us" });
  console.log(`  page why-choose-us: ${why.deletedCount} deleted`);
  const about = await Page.deleteOne({ slug: "about" });
  console.log(`  page about (superseded by singleton): ${about.deletedCount} deleted`);
}

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected\n");

  console.log("▸ Migrating About → singleton");
  await migrateAboutContent();
  await cleanupNavigation();
  await deletePages();

  await mongoose.disconnect();
  console.log("\n✓ Done. Disconnected.");
}

main().catch(async (err) => {
  console.error("\n✗ Migration failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
