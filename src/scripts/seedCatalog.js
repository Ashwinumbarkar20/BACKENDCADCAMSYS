/**
 * Comprehensive catalog seed — fills the CMS with the full CADCAMSYS offering
 * aligned to the public navigation: all Solutions, Products, Industries, and
 * the supporting Pages (About, Why Choose Us, Services, etc.). Every record
 * gets SEO and a generated branded SVG cover image (written to the uploads
 * dir + registered as a Media record), so nothing renders empty.
 *
 * Content is modelled on almacam.com (the technology partner) and the legacy
 * cadcamsys.com positioning. Swap the generated SVGs for real photography any
 * time via the admin Media library.
 *
 * Idempotent: upserts by slug / fileName. Safe to re-run.
 *
 * Run:  node src/scripts/seedCatalog.js   |   npm run seed:catalog
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { env } from "../config/env.js";
import { ProductCategory, Solution, Product, Industry, Page, Media } from "../models/index.js";

import { coverSvg } from "../utils/coverSvg.js";

const PUBLISHED = { status: "published", publishedAt: new Date() };
const UPLOAD_DIR = env.UPLOAD_DIR || "uploads";

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

async function art(slug, { title, kicker, palette }) {
  ensureUploadDir();
  const svg = coverSvg({ title, kicker, palette });
  const fileName = `seed-${slug}.svg`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), svg, "utf8");
  const url = `/${UPLOAD_DIR}/${fileName}`.replaceAll("\\", "/");
  const doc = await Media.findOneAndUpdate(
    { fileName },
    {
      $set: {
        fileName,
        originalName: `${title}.svg`,
        url,
        mimeType: "image/svg+xml",
        size: Buffer.byteLength(svg),
        altText: title,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return doc._id;
}

// ---------------------------------------------------------------------------
// SEO helper
// ---------------------------------------------------------------------------

function seo({ title, description, keywords = [], priority = 0.8 }) {
  return {
    metaTitle: `${title} | CADCAMSYS`,
    metaDescription: description,
    keywords,
    ogTitle: `${title} | CADCAMSYS`,
    ogDescription: description,
    twitterCard: "summary_large_image",
    includeInSitemap: true,
    sitemapPriority: priority,
    changeFrequency: "weekly",
  };
}

async function upsertBySlug(Model, slug, doc, label) {
  const result = await Model.findOneAndUpdate(
    { slug },
    { $set: { ...doc, slug, ...PUBLISHED } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
  console.log(`  ${label}: ${result.title || slug}`);
  return result;
}

// ---------------------------------------------------------------------------
// Product categories
// ---------------------------------------------------------------------------

async function seedCategories() {
  console.log("\n▸ Product Categories");
  const defs = [
    ["cam-software", "CAM Software", "Programming and nesting for cutting, punching, routing, and 3D machines."],
    ["nesting-optimization", "Nesting & Optimization", "True-shape nesting and material-yield optimization."],
    ["quoting-estimation", "Quoting & Estimation", "RFQ pricing, costing, and web quoting for fabrication."],
    ["production-management", "Production Management", "Scheduling, ERP/MES integration, and shop-floor control."],
    ["robotics", "Robotics", "Offline programming (OLP) for welding and cutting robots."],
  ];
  const out = {};
  for (const [slug, title, description] of defs) {
    out[slug] = await upsertBySlug(ProductCategory, slug, { title, description }, "Category");
  }
  return out;
}

// ---------------------------------------------------------------------------
// Solutions (the navigation groups)
// ---------------------------------------------------------------------------

async function seedSolutions() {
  console.log("\n▸ Solutions");
  const defs = [
    {
      slug: "2d-cam-solutions",
      title: "2D CAM Solutions",
      palette: "cam2d",
      shortDescription: "Optimized CAM for laser, plasma, waterjet, oxy-cutting, and punching of flat sheet metal.",
      overview:
        "Drive every flat-sheet machine on your floor from one library. Almacam reads your CAD geometry, recognizes part features, and generates optimized cutting, punching, and routing programs with the best nesting algorithms in the industry.",
      painPoints: ["Hand-nesting wastes material", "Slow, error-prone manual programming", "Different software per machine brand"],
      capabilities: ["True-shape automatic nesting", "Common-line cutting", "Automatic tool selection", "200+ post-processors"],
      keywords: ["2D CAM software", "laser cutting CAM", "plasma nesting", "punching CAM", "sheet metal programming"],
    },
    {
      slug: "nesting-optimization",
      title: "Nesting & Optimization",
      palette: "nesting",
      shortDescription: "True-shape automatic nesting that beats hand-nesting on material yield, every job.",
      overview:
        "Alma develops its nesting engine in-house — recognized as among the best in the world. Pack parts by real geometry, manage remnants automatically, and batch hundreds of orders for maximum sheet utilization.",
      painPoints: ["Material is your biggest cost", "Remnants get lost and re-bought", "Yield depends on the operator"],
      capabilities: ["True-shape packing", "Automatic remnant tracking", "Batch / multi-order nesting", "Rotation & grain rules"],
      keywords: ["nesting software", "true shape nesting", "material optimization", "sheet utilization"],
    },
    {
      slug: "3d-cam-solutions",
      title: "3D CAM Solutions",
      palette: "cam3d",
      shortDescription: "5-axis CAM for tube, profile, and shaped 3D parts — no axial limitations.",
      overview:
        "Program 3D laser and plasma machines and robots for tube, profile, and complex shaped parts. Full support for intersection welding, end-prep, mitering, and 5-axis bevels.",
      painPoints: ["3D tube programming is specialist work", "Intersection joints are hard to model", "Limited machine reach in legacy CAM"],
      capabilities: ["5-axis cutting", "Tube & profile processing", "Automatic end-prep & mitering", "Intersection welding prep"],
      keywords: ["3D CAM software", "tube cutting CAM", "5-axis cutting", "profile cutting"],
    },
    {
      slug: "quotation-costing",
      title: "Quotation & Costing",
      palette: "quoting",
      shortDescription: "Turn RFQs into accurate, defensible quotes in minutes — desktop and web.",
      overview:
        "Almaquote auto-nests every quote, pulls live material costs, and outputs a branded PDF. Add WebQuote and let customers configure and price parts online, 24/7.",
      painPoints: ["Quotes take days and tie up estimators", "Pricing is guesswork without real yield", "No self-serve channel for buyers"],
      capabilities: ["Auto-nesting on quote", "Multi-level BOM costing", "Quantity-break pricing", "Online self-serve quoting"],
      keywords: ["quoting software", "sheet metal estimation", "RFQ pricing", "web quoting"],
    },
    {
      slug: "erp-production-integration",
      title: "ERP / Production Integration",
      palette: "production",
      shortDescription: "Plan, schedule, and connect the shop floor to your ERP/MES — Industry 4.0 ready.",
      overview:
        "Production Management and Workshop Scheduler turn programs into a coordinated plan: dispatch jobs to machines, track progress live, and sync orders both ways with SAP, Epicor, Infor, and more.",
      painPoints: ["Machines idle waiting for the next job", "No live view of shop-floor status", "Double data entry between CAM and ERP"],
      capabilities: ["Visual production scheduling", "Live machine status", "Two-way ERP/MES sync", "Capacity planning"],
      keywords: ["production scheduling", "MES integration", "ERP manufacturing", "shop floor control"],
    },
    {
      slug: "robotics",
      title: "Robotics",
      palette: "robotics",
      shortDescription: "Offline programming (OLP) for welding and cutting robots with realistic simulation.",
      overview:
        "Program welding and cutting robots offline, simulate the full cell to catch collisions before they happen, and post to every major robot brand — without stopping production.",
      painPoints: ["Teach-pendant programming halts the cell", "Collisions are found the hard way", "Each robot brand needs its own skills"],
      capabilities: ["Offline robot programming", "Full-cell collision simulation", "Multi-brand robot posts", "Automatic path generation"],
      keywords: ["offline programming", "robot welding OLP", "robotic cutting", "robot simulation"],
    },
  ];

  const out = {};
  for (const d of defs) {
    const coverImage = await art(d.slug, { title: d.title, kicker: "Solution", palette: d.palette });
    out[d.slug] = await upsertBySlug(
      Solution,
      d.slug,
      {
        title: d.title,
        coverImage,
        shortDescription: d.shortDescription,
        overview: d.overview,
        painPoints: d.painPoints,
        capabilities: d.capabilities,
        cta: {
          title: `See ${d.title} on your parts`,
          description: "Book a live demo with our application engineers.",
          primaryButton: { label: "Book Demo", url: "/contact", variant: "primary" },
        },
        seo: seo({ title: d.title, description: d.shortDescription, keywords: d.keywords, priority: 0.9 }),
      },
      "Solution",
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Products (aligned to the navigation)
// ---------------------------------------------------------------------------

const PRODUCTS = [
  {
    slug: "almacam-cut", title: "Almacam Cut", cat: "cam-software", sol: "2d-cam-solutions", palette: "cam2d",
    tagline: "Production-grade CAM for laser, plasma, waterjet, and oxy-cutting.",
    overview: "Almacam Cut turns CAD geometry into optimized cutting paths for every major CNC controller. Built for shops running multiple machines from one software library.",
    features: [["Automatic toolpath generation", "Recognizes part contours and sequences cuts in seconds."], ["Common-line cutting", "Cuts shared edges once to save material and machine time."], ["Multi-machine support", "One library drives laser, plasma, waterjet, and oxy."]],
    benefits: ["Up to 15% material savings via smarter nesting", "30% faster programming", "One toolkit for the whole cutting floor"],
    useCases: [["High-mix job shops", "Quick setup with reusable nesting rules."], ["Production fabricators", "Repeatable optimized programs for daily runs."]],
    keywords: ["laser cutting software", "plasma CAM", "waterjet nesting", "CNC cutting CAM"],
  },
  {
    slug: "almacam-punch", title: "Almacam Punch", cat: "cam-software", sol: "2d-cam-solutions", palette: "cam2d",
    tagline: "Punching CAM with intelligent tool selection and stripper management.",
    overview: "Generate optimal punch sequences with automatic tool selection from your turret, plus full support for forming, tapping, and combination punch/laser machines.",
    features: [["Automatic tool selection", "Matches features to the best tools in your turret."], ["Microjoint placement", "Keeps parts secure but easy to remove."], ["Combo machine support", "Drives punch/laser combination machines."]],
    benefits: ["20–40% faster programming", "Fewer tool changes per job", "Full forming and tapping support"],
    useCases: [["Enclosure makers", "Louvers, forms, and tapped holes in one setup."], ["HVAC fabricators", "High part counts nested per sheet."]],
    keywords: ["punching software", "turret punch CAM", "nibbling", "combo machine CAM"],
  },
  {
    slug: "almacam-combi", title: "Almacam Combi", cat: "cam-software", sol: "2d-cam-solutions", palette: "cam2d",
    tagline: "Unified programming for punch-laser and combination machines.",
    overview: "Almacam Combi programs combination machines in a single workflow — blending punching, forming, and laser cutting with optimal sequencing and minimal repositioning.",
    features: [["Blended sequencing", "Optimally orders punch, form, and cut operations."], ["Repositioning control", "Minimizes clamp moves and dead time."], ["Shared tool library", "One library across punch and laser."]],
    benefits: ["Maximum throughput on combo machines", "Less repositioning, more cutting", "Single program per part"],
    useCases: [["Combination-machine shops", "One workflow for punch + laser."], ["Mixed-feature parts", "Forms and cut profiles in one pass."]],
    keywords: ["combination machine CAM", "punch laser software", "combi machine programming"],
  },
  {
    slug: "almacam-routing", title: "Almacam Routing", cat: "cam-software", sol: "2d-cam-solutions", palette: "cam2d",
    tagline: "CAM for routing and milling of sheet, plate, and composite panels.",
    overview: "Program routing and milling operations with feed/speed control, lead-ins, tabbing, and multi-tool support for metal, plastic, and composite panels.",
    features: [["Tabbing & bridging", "Holds parts in place during routing."], ["Tool & feed control", "Per-material feeds, speeds, and lead-ins."], ["Multi-tool jobs", "Sequences drilling, routing, and engraving."]],
    benefits: ["Clean edges on panels and composites", "Reduced tool breakage", "Hands-off multi-tool jobs"],
    useCases: [["Composite panel shops", "Clean routed edges with tabbing."], ["Signage & fixtures", "Engrave, drill, and cut in one program."]],
    keywords: ["routing CAM", "panel milling software", "composite routing"],
  },
  {
    slug: "almacam-nester", title: "Almacam Nester", cat: "nesting-optimization", sol: "nesting-optimization", palette: "nesting",
    tagline: "True-shape automatic nesting that beats hand-nesting on every job.",
    overview: "Almacam Nester uses true-shape geometry and rotation rules to pack parts with yield hand-nesting can rarely match — and tracks every remnant automatically.",
    features: [["True-shape packing", "Considers real geometry, not bounding boxes."], ["Remnant management", "Tracks and re-uses sheet remnants automatically."], ["Batch nesting", "Nest hundreds of orders for maximum yield."]],
    benefits: ["5–12% additional material savings", "Sub-minute nests on large batches", "Remnant tracking that pays for itself"],
    useCases: [["High material-cost shops", "Stainless, aluminum, and exotic alloys."], ["Make-to-order fabricators", "Batch many orders onto shared stock."]],
    keywords: ["nesting software", "true shape nesting", "remnant management", "material optimization"],
  },
  {
    slug: "almacam-tube", title: "Almacam Tube", cat: "cam-software", sol: "3d-cam-solutions", palette: "cam3d",
    tagline: "Tube and profile cutting CAM for 3D laser and plasma machines.",
    overview: "Generate 3D cutting paths for round tube, square tube, and structural profiles with full support for end-prep, mitering, and intersection welding.",
    features: [["3D profile library", "Round, square, rectangular, and structural shapes."], ["Intersection welding", "Auto-prepares weld joints between members."], ["End-prep & mitering", "Bevels and copes ready for assembly."]],
    benefits: ["Weld-ready parts off the machine", "Less manual fitting at assembly", "Structural and tube in one tool"],
    useCases: [["Steel structures", "Copes and bevels for frames."], ["Furniture & handrails", "Clean miters on tube assemblies."]],
    keywords: ["tube cutting software", "3D laser tube CAM", "profile cutting", "structural steel CAM"],
  },
  {
    slug: "almacam-space-cut", title: "Almacam Space Cut", cat: "cam-software", sol: "3d-cam-solutions", palette: "cam3d",
    tagline: "5-axis cutting for shaped parts and complex 3D components.",
    overview: "Almacam Space Cut programs 5-axis laser and plasma machines for formed, hydroformed, and shaped 3D parts — without the axial limitations of legacy CAM.",
    features: [["5-axis toolpaths", "No axial limitations on complex shapes."], ["Collision-aware paths", "Keeps the head clear of the part."], ["CAD assembly import", "Brings 3D models straight into CAM."]],
    benefits: ["Cut shapes legacy CAM can't reach", "Fewer collisions and rework", "Direct from 3D CAD"],
    useCases: [["Automotive prototyping", "Trim formed and hydroformed parts."], ["Aerospace components", "Precise 5-axis profiles."]],
    keywords: ["5-axis cutting", "3D laser cutting CAM", "shaped part cutting"],
  },
  {
    slug: "almacam-cube", title: "Almacam Cube", cat: "cam-software", sol: "3d-cam-solutions", palette: "cam3d",
    tagline: "CAM for block and solid-material cutting.",
    overview: "Almacam Cube handles block and solid-material cutting workflows, generating optimized paths for thick stock and 3D solid components.",
    features: [["Solid-stock pathing", "Optimized cutting for thick blocks."], ["Volume optimization", "Minimizes waste from solid stock."], ["3D model driven", "Programs directly from CAD solids."]],
    benefits: ["Less waste from expensive stock", "Predictable thick-section cutting", "Direct-from-CAD programming"],
    useCases: [["Mold & die shops", "Rough thick stock efficiently."], ["Heavy components", "Solid-block profiling."]],
    keywords: ["block cutting CAM", "solid material cutting", "thick plate CAM"],
  },
  {
    slug: "almaquote", title: "AlmaQuote", cat: "quoting-estimation", sol: "quotation-costing", palette: "quoting",
    tagline: "Turn RFQs into accurate quotes in minutes.",
    overview: "AlmaQuote auto-nests every quote, looks up live material costs, and outputs a polished branded PDF — without tying up your senior estimator for a day.",
    features: [["Auto-nesting on quote", "Real material yield drives the price."], ["Quantity-break analysis", "Quote 1, 10, 100, and 1000 in one pass."], ["Branded PDF output", "Your logo, terms, and pricing, ready to send."]],
    benefits: ["Quote turnaround from days to minutes", "Win 25–40% more RFQs through speed", "Defensible pricing built on real costs"],
    useCases: [["High-RFQ job shops", "Quote 3x more jobs per estimator."], ["OEM suppliers", "Same-day RFQ responses."]],
    keywords: ["quoting software", "sheet metal estimating", "RFQ software", "fabrication cost estimation"],
  },
  {
    slug: "webquote", title: "WebQuote", cat: "quoting-estimation", sol: "quotation-costing", palette: "quoting",
    tagline: "Let customers configure and price parts online, 24/7.",
    overview: "WebQuote puts your costing engine online: buyers upload a part, get instant pricing, and place orders — turning your website into a self-serve quoting channel.",
    features: [["Instant online pricing", "Upload-to-price in seconds."], ["Self-serve ordering", "Customers quote and buy 24/7."], ["Same engine as AlmaQuote", "Consistent pricing online and in-house."]],
    benefits: ["Capture orders after hours", "Fewer manual RFQs to process", "Modern buying experience"],
    useCases: [["Repeat-part customers", "Re-order in a click."], ["New buyer acquisition", "Instant quotes lower the barrier."]],
    keywords: ["online quoting", "web quoting", "instant part pricing", "self-serve fabrication quotes"],
  },
  {
    slug: "production-management", title: "Production Management", cat: "production-management", sol: "erp-production-integration", palette: "production",
    tagline: "Connect CAM to the shop floor and your ERP/MES.",
    overview: "Production Management turns programs into a coordinated plan, tracks jobs live across machines, and synchronizes orders both ways with your ERP/MES.",
    features: [["Two-way ERP/MES sync", "No double data entry."], ["Live job tracking", "See status across every machine."], ["Material & remnant flow", "Stock and remnants stay in sync."]],
    benefits: ["One source of truth for the floor", "Less idle time between jobs", "Industry 4.0 connectivity"],
    useCases: [["Multi-machine plants", "Coordinate the whole floor."], ["ERP-driven shops", "Close the loop with SAP/Epicor/Infor."]],
    keywords: ["production management", "MES integration", "manufacturing execution", "shop floor software"],
  },
  {
    slug: "workshop-scheduler", title: "Workshop Scheduler", cat: "production-management", sol: "erp-production-integration", palette: "production",
    tagline: "Visual scheduling that keeps every machine busy.",
    overview: "Workshop Scheduler dispatches jobs to machines with a drag-and-drop plan, balances capacity, and updates live as the floor reports progress.",
    features: [["Drag-and-drop planning", "Re-sequence jobs in seconds."], ["Capacity balancing", "Spot bottlenecks before they bite."], ["Live progress updates", "Plan reflects the real floor."]],
    benefits: ["Higher machine utilization", "On-time delivery you can promise", "Less expediting and chaos"],
    useCases: [["Bottlenecked shops", "Level-load the constraint."], ["Promise-date driven", "Commit dates with confidence."]],
    keywords: ["production scheduling", "workshop scheduling", "capacity planning", "machine scheduling"],
  },
  {
    slug: "olp-welding", title: "OLP Welding", cat: "robotics", sol: "robotics", palette: "robotics",
    tagline: "Offline programming for robotic welding cells.",
    overview: "Program welding robots offline from CAD, simulate the full cell to catch collisions, and post to every major robot brand — without stopping production.",
    features: [["Offline weld programming", "Program from CAD, off the cell."], ["Full-cell simulation", "Catch collisions before they happen."], ["Multi-brand posts", "FANUC, KUKA, ABB, Yaskawa, and more."]],
    benefits: ["Keep the cell welding, not teaching", "Fewer crashes and rework", "Program any brand with one skillset"],
    useCases: [["High-mix welding", "New parts without re-teaching."], ["Complex assemblies", "Validate reach and access virtually."]],
    keywords: ["robotic welding", "offline programming", "weld OLP", "robot welding simulation"],
  },
  {
    slug: "olp-cutting", title: "OLP Cutting", cat: "robotics", sol: "robotics", palette: "robotics",
    tagline: "Offline programming for robotic cutting cells.",
    overview: "Generate robot cutting paths offline from 3D models, simulate the cell, and post to your controller — ideal for trimming, bevels, and 3D profiles beyond machine limits.",
    features: [["3D path generation", "Cutting paths straight from CAD."], ["Collision-checked cells", "Validate the whole cell virtually."], ["Brand-agnostic posts", "Output to any major robot controller."]],
    benefits: ["Cut shapes fixed machines can't reach", "Less trial-and-error on the cell", "Flexible, reprogrammable automation"],
    useCases: [["3D part trimming", "Robotic trim of formed parts."], ["Large-format cutting", "Reach beyond gantry limits."]],
    keywords: ["robotic cutting", "robot OLP", "offline robot programming", "3D robotic cutting"],
  },
];

async function seedProducts({ cats, sols }) {
  console.log("\n▸ Products");
  const out = {};
  for (const p of PRODUCTS) {
    const coverImage = await art(p.slug, { title: p.title, kicker: "Product", palette: p.palette });
    out[p.slug] = await upsertBySlug(
      Product,
      p.slug,
      {
        title: p.title,
        category: cats[p.cat]?._id,
        solution: sols[p.sol]?._id,
        coverImage,
        tagline: p.tagline,
        overview: p.overview,
        keyFeatures: p.features.map(([title, description]) => ({ title, description })),
        benefits: p.benefits,
        useCases: p.useCases.map(([title, description]) => ({ title, description })),
        faqSections: [
          {
            title: "Common questions",
            items: [
              { question: "What CAD formats can I import?", answer: "DXF, DWG, IGES, STEP, and native SolidWorks parts." },
              { question: "Will it work with my machine?", answer: "Yes — 200+ post-processors ship out of the box, with custom posts available." },
            ],
          },
        ],
        seo: seo({ title: p.title, description: p.tagline, keywords: p.keywords, priority: 0.8 }),
      },
      "Product",
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Industries
// ---------------------------------------------------------------------------

const INDUSTRIES = [
  { slug: "sheet-metal-fabrication", title: "Sheet Metal Fabrication", headline: "From RFQ to finished part — optimized end to end.",
    overview: "Job shops and fabricators use CADCAMSYS to quote faster, nest tighter, and keep every cutting and punching machine busy.",
    workflow: ["Quote with real material yield", "Nest and program in minutes", "Schedule across machines", "Track jobs to delivery"],
    pain: ["Material waste from hand-nesting", "Estimator bottlenecks", "Idle machines between jobs"],
    benefits: ["10–15% material savings", "3x faster quoting", "Higher machine utilization"],
    kpis: [["down", "Material scrap", "-12%"], ["up", "Quote throughput", "3x"]],
    keywords: ["sheet metal fabrication software", "fabrication CAM", "metal cutting nesting"] },
  { slug: "hvac", title: "HVAC", headline: "High part counts, tight margins, on-time delivery.",
    overview: "HVAC fabricators run hundreds of unique parts a day. CADCAMSYS nests them tightly and dispatches them to the right line automatically.",
    workflow: ["Import ductwork part libraries", "Batch-nest daily orders", "Auto-dispatch to punch/laser lines", "Report progress live"],
    pain: ["Operators idle waiting for jobs", "High scrap on thin gauge", "Manual scheduling chaos"],
    benefits: ["Punch utilization 60% → 84%", "Scrap down to 2%", "Predictable daily output"],
    kpis: [["up", "Line utilization", "+24pts"], ["down", "Operator idle time", "-80%"]],
    keywords: ["HVAC manufacturing software", "ductwork nesting", "HVAC fabrication CAM"] },
  { slug: "automotive-components", title: "Automotive Components", headline: "Same-day RFQs and repeatable production quality.",
    overview: "Tier-1 and Tier-2 suppliers use CADCAMSYS to respond to RFQs same-day and lock in repeatable, optimized programs for production runs.",
    workflow: ["Instant RFQ pricing", "Optimized production programs", "ERP-synced scheduling", "Traceable output"],
    pain: ["Slow RFQ response loses bids", "Inconsistent program quality", "ERP data re-entry"],
    benefits: ["Same-day RFQ responses", "Preferred-supplier status", "Consistent production quality"],
    kpis: [["down", "RFQ response time", "-90%"], ["up", "Win rate", "+30%"]],
    keywords: ["automotive components manufacturing", "tier 1 supplier CAM", "automotive fabrication"] },
  { slug: "electrical-enclosures", title: "Electrical Enclosures", headline: "Forms, louvers, and cutouts — programmed once, run forever.",
    overview: "Enclosure makers rely on CADCAMSYS for intelligent punching, forming, and tapping with high-yield nesting of repeat parts.",
    workflow: ["Library of standard enclosures", "Auto tool & form selection", "High-yield nesting", "Combo machine programs"],
    pain: ["Complex forming sequences", "Many SKUs to manage", "Tool changes slow throughput"],
    benefits: ["Fewer tool changes", "Reusable part libraries", "Tighter sheet yield"],
    kpis: [["down", "Programming time", "-40%"], ["up", "Sheet yield", "+10%"]],
    keywords: ["electrical enclosure manufacturing", "enclosure punching CAM", "sheet metal forming"] },
  { slug: "heavy-engineering", title: "Heavy Engineering", headline: "Thick plate and structural steel, programmed with confidence.",
    overview: "Heavy fabricators cut thick plate and structural sections faster with robust plasma and oxy post-processors and reliable bevel control.",
    workflow: ["Thick-plate nesting", "Bevel and weld-prep", "Structural profile cutting", "Distributed programming"],
    pain: ["Specialist programming bottleneck", "Thick-section quality issues", "Long programming backlogs"],
    benefits: ["8h → 1.5h average program time", "Backlog from weeks to days", "Rock-solid plasma posts"],
    kpis: [["down", "Program time", "-80%"], ["down", "Backlog", "weeks → days"]],
    keywords: ["heavy engineering fabrication", "thick plate cutting", "structural steel CAM"] },
  { slug: "architecture-cladding", title: "Architecture & Cladding", headline: "Bespoke panels and façades, repeatably accurate.",
    overview: "Architectural fabricators produce perforated panels, façades, and cladding with precise nesting and clean routed or cut edges.",
    workflow: ["Import architectural CAD", "Perforation & pattern nesting", "Clean-edge routing/cutting", "Batch panel production"],
    pain: ["One-off bespoke geometry", "Pattern alignment across panels", "Edge quality on finishes"],
    benefits: ["Accurate bespoke panels", "Consistent perforation patterns", "Premium edge finish"],
    kpis: [["up", "Panel accuracy", "±0.2mm"], ["down", "Rework", "-50%"]],
    keywords: ["architectural cladding manufacturing", "perforated panel CAM", "façade fabrication"] },
  { slug: "oem-manufacturing", title: "OEM Manufacturing", headline: "Scale production with consistent, connected programming.",
    overview: "OEMs standardize programming, quoting, and scheduling across plants — connected to ERP/MES for full Industry 4.0 visibility.",
    workflow: ["Standardized program libraries", "Centralized quoting", "Multi-plant scheduling", "ERP/MES integration"],
    pain: ["Inconsistent practices across plants", "Limited production visibility", "Disconnected systems"],
    benefits: ["Consistent quality at scale", "Plant-wide visibility", "Connected digital thread"],
    kpis: [["up", "On-time delivery", "+18pts"], ["up", "Throughput", "+22%"]],
    keywords: ["OEM manufacturing software", "multi-plant CAM", "Industry 4.0 fabrication"] },
  { slug: "tube-profile-processing", title: "Tube & Profile Processing", headline: "Weld-ready tube and profile parts straight off the machine.",
    overview: "Tube and profile processors use CADCAMSYS to program 3D cutting with automatic end-prep, mitering, and intersection welding.",
    workflow: ["Import 3D tube models", "Auto end-prep & miter", "Intersection weld prep", "Nest tube stock"],
    pain: ["Manual fitting at assembly", "Complex intersection joints", "Tube stock waste"],
    benefits: ["Weld-ready parts", "Less manual fit-up", "Higher tube yield"],
    kpis: [["down", "Fit-up time", "-45%"], ["up", "Tube yield", "+9%"]],
    keywords: ["tube processing software", "profile cutting CAM", "3D tube fabrication"] },
];

async function seedIndustries() {
  console.log("\n▸ Industries");
  const out = {};
  for (const ind of INDUSTRIES) {
    const coverImage = await art(ind.slug, { title: ind.title, kicker: "Industry", palette: "industry" });
    out[ind.slug] = await upsertBySlug(
      Industry,
      ind.slug,
      {
        title: ind.title,
        coverImage,
        headline: ind.headline,
        overview: ind.overview,
        workflow: ind.workflow,
        painPoints: ind.pain,
        benefits: ind.benefits,
        kpiBenefits: ind.kpis.map(([direction, metric, value]) => ({ direction, metric, value })),
        faqs: [
          { question: "Which machines do you support?", answer: "All major laser, plasma, waterjet, punch, and tube machine brands via 200+ post-processors." },
        ],
        seo: seo({ title: `${ind.title} Software`, description: ind.headline, keywords: ind.keywords, priority: 0.85 }),
      },
      "Industry",
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pages (About, Why Choose Us, Services, etc.)
// ---------------------------------------------------------------------------

async function seedPages() {
  console.log("\n▸ Pages");
  const pages = [
    // Note: the "About CADCAMSYS" page is no longer a generic Page — it is now a
    // dedicated "About" singleton edited from the admin "About Us" tab and seeded
    // by seedAbout.js. "Why Choose Us" was removed from the site entirely.
    { slug: "alma-technology-partner", title: "Alma Technology Partner", kicker: "Partnership", palette: "page",
      desc: "CADCAMSYS is the authorized Alma technology partner, bringing the unified CAD-CAM platform for nesting, cutting, and robotics to your shop.",
      sections: [
        ["hero", "Powered by Alma", "The unified CAD-CAM platform for nesting, cutting, and robotics — delivered and supported locally by CADCAMSYS."],
        ["text", "A global engine, delivered locally", "Alma's software runs in thousands of plants worldwide. As your local partner, we handle implementation, training, and post-processor development."],
        ["text", "One platform, every process", "2D and 3D CAM, true-shape nesting, quoting, production management, and robotics — integrated and Industry 4.0 ready."],
      ] },
    { slug: "services", title: "Support & Services", kicker: "Services", palette: "page",
      desc: "Implementation, training, AMC, and custom post-processor development to get the most from your CAD/CAM investment.",
      sections: [
        ["hero", "Services that protect your investment", "From first install to ongoing optimization, our team keeps your software delivering on the floor."],
        ["text", "Implementation Consulting", "We scope your machines, workflows, and ERP, then deploy and validate so you're in production fast."],
        ["text", "Training", "Role-based training for programmers, estimators, and managers — onsite or remote."],
        ["text", "AMC & Post-Processor Development", "Annual maintenance contracts and custom post-processors keep every machine running optimally."],
      ] },
    { slug: "amc", title: "Annual Maintenance Contract (AMC)", kicker: "Service", palette: "page",
      desc: "Keep your CAD/CAM software updated, supported, and optimized year-round with a CADCAMSYS AMC.",
      sections: [
        ["hero", "Annual Maintenance Contract", "Priority support, updates, and health checks so your software never holds up the floor."],
        ["text", "What's included", "Priority technical support, version upgrades, periodic health checks, and post-processor tune-ups."],
        ["text", "Why it matters", "Software that's current and tuned keeps machines productive and protects your investment."],
      ] },
    { slug: "training", title: "Training", kicker: "Service", palette: "page",
      desc: "Role-based CAD/CAM training for programmers, estimators, and managers — onsite or remote.",
      sections: [
        ["hero", "Training that builds confidence", "Get your team productive fast with structured, role-based training."],
        ["text", "Programs", "Foundations, advanced nesting, quoting, scheduling, and robotics — tailored to your machines and parts."],
        ["text", "Delivery", "Onsite at your plant or remote, with hands-on exercises on your own geometry."],
      ] },
    { slug: "post-processor-development", title: "Post Processor Development", kicker: "Service", palette: "page",
      desc: "Custom post-processors so CADCAMSYS drives every machine on your floor exactly the way you need.",
      sections: [
        ["hero", "Post-processor development", "Your machines, your output — exactly. We build and tune custom posts for any controller."],
        ["text", "Any machine, any controller", "We develop and validate post-processors for legacy and modern controllers across all major brands."],
        ["text", "Validated on real cuts", "Every post is tested on representative parts so production output is right the first time."],
      ] },
    { slug: "implementation-consulting", title: "Implementation Consulting", kicker: "Service", palette: "page",
      desc: "End-to-end implementation: scope, deploy, integrate, and validate so you reach production quickly.",
      sections: [
        ["hero", "Implementation consulting", "From kickoff to first production part, we make the rollout smooth and measurable."],
        ["text", "Our process", "We map machines, workflows, and ERP/MES, then deploy, integrate, and validate against your real jobs."],
        ["text", "Outcomes", "A configured system, trained team, and validated programs — producing on day one."],
      ] },
    { slug: "resources", title: "Resources", kicker: "Resources", palette: "page",
      desc: "Case studies, customer stories, insights, product news, tutorials, ROI tools, and downloads from CADCAMSYS.",
      sections: [
        ["hero", "Resources", "Case studies, insights, tutorials, and tools to help you get more from your machines."],
        ["text", "Explore", "Browse case studies and testimonials for proof, the blog and news for insights, tutorials to upskill your team, and the ROI Center to estimate your savings."],
      ] },
    { slug: "roi-center", title: "ROI Center", kicker: "Resources", palette: "page",
      desc: "Estimate the material, labor, and throughput savings CADCAMSYS can deliver for your shop.",
      sections: [
        ["hero", "Calculate your ROI", "See what tighter nesting, faster quoting, and better scheduling are worth to your shop."],
        ["text", "Where the savings come from", "Material yield, programming time, quote throughput, and machine utilization typically pay back software in months."],
        ["text", "Get a tailored estimate", "Share a few numbers and our team will model your specific return. Contact us to get started."],
      ] },
    { slug: "downloads", title: "Downloads", kicker: "Resources", palette: "page",
      desc: "Brochures, datasheets, and resources for the CADCAMSYS product suite.",
      sections: [
        ["hero", "Downloads", "Product brochures, datasheets, and technical resources."],
        ["text", "Request resources", "Looking for a specific datasheet or brochure? Contact us and we'll send the latest version."],
      ] },
  ];

  for (const pg of pages) {
    const ogImage = await art(`page-${pg.slug}`, { title: pg.title, kicker: pg.kicker, palette: pg.palette });
    await upsertBySlug(
      Page,
      pg.slug,
      {
        title: pg.title,
        pageType: "default",
        sections: pg.sections.map(([type, title, content]) => ({ type, title, content })),
        seo: { ...seo({ title: pg.title, description: pg.desc, keywords: [], priority: 0.6 }), ogImage },
      },
      "Page",
    );
  }
}

// ---------------------------------------------------------------------------
// Cross-links
// ---------------------------------------------------------------------------

async function linkEverything({ sols, products, industries }) {
  console.log("\n▸ Linking");
  const map = {
    "2d-cam-solutions": ["almacam-cut", "almacam-punch", "almacam-combi", "almacam-routing"],
    "nesting-optimization": ["almacam-nester"],
    "3d-cam-solutions": ["almacam-tube", "almacam-space-cut", "almacam-cube"],
    "quotation-costing": ["almaquote", "webquote"],
    "erp-production-integration": ["production-management", "workshop-scheduler"],
    robotics: ["olp-welding", "olp-cutting"],
  };
  const indIds = Object.values(industries).map((i) => i._id);
  for (const [solSlug, prodSlugs] of Object.entries(map)) {
    const sol = sols[solSlug];
    if (!sol) continue;
    await Solution.findByIdAndUpdate(sol._id, {
      products: prodSlugs.map((s) => products[s]?._id).filter(Boolean),
      industries: indIds.slice(0, 4),
    });
  }
  // Each industry points at a sensible product mix.
  const fab = ["almacam-cut", "almacam-nester", "almaquote", "workshop-scheduler"];
  for (const ind of Object.values(industries)) {
    await Industry.findByIdAndUpdate(ind._id, {
      products: fab.map((s) => products[s]?._id).filter(Boolean),
    });
  }
  console.log("  Linked solutions ↔ products ↔ industries");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected");

  const cats = await seedCategories();
  const sols = await seedSolutions();
  const products = await seedProducts({ cats, sols });
  const industries = await seedIndustries();
  await seedPages();
  await linkEverything({ sols, products, industries });

  console.log("\n✓ Catalog seeded (Solutions, Products, Industries, Pages + SEO + cover art).");
  await mongoose.disconnect();
  console.log("✓ Disconnected");
}

main().catch(async (err) => {
  console.error("\n✗ Catalog seed failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
