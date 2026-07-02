/**
 * Replaces the public-site primary navigation (the "Navigation" singleton you
 * edit in the admin portal) with the current CADCAMSYS information architecture:
 *
 *   Solutions | Industries | Resources | About Us | Contact Us
 *
 * "Solutions" is a grouped mega-menu (2D CAM, Nesting, 3D CAM, Quotation, ERP,
 * Robotics). Group headers use "#" as a non-navigable anchor.
 *
 * This OVERWRITES the existing navigation items wholesale — old values are
 * removed and the new navbar is written in their place. It does not touch any
 * other singleton (settings, footer) or content.
 *
 * Run:
 *   node src/scripts/seedNavigation.js
 * or:
 *   npm run seed:navigation
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { Navigation } from "../models/Navigation.js";

const items = [
  {
    label: "Solutions",
    url: "/solutions",
    children: [
      {
        label: "2D CAM Solutions",
        url: "/solutions/2d-cam-solutions",
        children: [
          { label: "Almacam Cut", url: "/products/almacam-cut" },
          { label: "Almacam Punch", url: "/products/almacam-punch" },
          { label: "Almacam Combi", url: "/products/almacam-combi" },
          { label: "Almacam Routing", url: "/products/almacam-routing" },
        ],
      },
      {
        label: "Nesting & Optimization",
        url: "/solutions/nesting-optimization",
        children: [{ label: "Almacam Nester", url: "/products/almacam-nester" }],
      },
      {
        label: "3D CAM Solutions",
        url: "/solutions/3d-cam-solutions",
          { label: "Almacam Space Cut", url: "/products/almacam-space-cut" },
          { label: "Almacam Cube", url: "/products/almacam-cube" },
        ],
      },
      {
        label: "Quotation & Costing",
        url: "/solutions/quotation-costing",
        children: [
          { label: "AlmaQuote", url: "/products/almaquote" },
          { label: "WebQuote", url: "/products/webquote" },
        ],
      },
      {
        label: "ERP / Production Integration",
        url: "/solutions/erp-production-integration",
        children: [
          { label: "Production Management", url: "/products/production-management" },
          { label: "Workshop Scheduler", url: "/products/workshop-scheduler" },
        ],
      },
      {
        label: "Robotics",
        url: "/solutions/robotics",
        children: [
          { label: "OLP Welding", url: "/products/olp-welding" },
          { label: "OLP Cutting", url: "/products/olp-cutting" },
        ],
      },
    ],
  },
  {
    // Single link — no nested children. The Industries page lists every
    // industry as cards; each industry page has its own left-hand list.
    label: "Industries",
    url: "/industries",
    children: [],
  },
  {
    label: "Resources",
    url: "/resources",
    children: [
      { label: "Case Studies", url: "/case-studies" },
      { label: "Customer Testimonials", url: "/testimonials" },
      { label: "Blog / Insights", url: "/blogs" },
      { label: "Product News & Releases", url: "/news" },
      { label: "Learning Center / Tutorials", url: "/tutorials" },
      { label: "ROI Center", url: "/roi-center" },
      { label: "Downloads", url: "/downloads" },
    ],
  },
  {
    label: "About Us",
    url: "/about",
    children: [
      { label: "About CADCAMSYS", url: "/about" },
      { label: "Why Choose Us", url: "/why-choose-us" },
      { label: "Alma Technology Partner", url: "/alma-technology-partner" },
      { label: "Team & Expertise", url: "/team" },
      {
        label: "Support & Services",
        url: "/services",
        children: [
          { label: "AMC", url: "/amc" },
          { label: "Training", url: "/training" },
          { label: "Post Processor Development", url: "/post-processor-development" },
          { label: "Implementation Consulting", url: "/implementation-consulting" },
        ],
      },
      { label: "Careers", url: "/careers" },
    ],
  },
  {
    label: "Contact Us",
    url: "/contact",
    children: [
      { label: "Contact Us", url: "/contact" },
      { label: "Book Consultation", url: "/contact" },
      { label: "Support Request", url: "/contact" },
    ],
  },
];

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected\n");

  const result = await Navigation.findOneAndUpdate(
    { singletonKey: "global" },
    { $set: { items } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );

  const count = (nodes) =>
    (nodes || []).reduce((n, item) => n + 1 + count(item.children), 0);

  console.log("▸ Navigation");
  result.items.forEach((m) => console.log(`  • ${m.label} (${m.url})`));
  console.log(`\n✓ Wrote ${result.items.length} top-level menus, ${count(result.items)} links total.`);

  await mongoose.disconnect();
  console.log("✓ Disconnected");
}

main().catch(async (err) => {
  console.error("\n✗ Navigation seed failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
