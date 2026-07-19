/**
 * Seeds the database with realistic demo content across every CMS resource
 * (product categories, solutions, products, industries, blogs, testimonials,
 * case studies, tutorials, careers, team members, pages) so you can verify the
 * admin end-to-end.
 *
 * Does NOT touch users, roles, settings, footer, navigation, or media.
 * Idempotent: re-running upserts by slug/name so it's safe to invoke multiple
 * times. Anything you've edited in the admin after seeding will be overwritten
 * for that slug — but never deleted, and never duplicated.
 *
 * Run:
 *   node src/scripts/seedDemoData.js
 * or:
 *   npm run seed:demo
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import {
  ProductCategory,
  Solution,
  Product,
  Industry,
  Blog,
  CaseStudy,
  Testimonial,
  Tutorial,
  Career,
  TeamMember,
  Page,
} from "../models/index.js";

// ---- helpers -------------------------------------------------------------

const PUBLISHED = { status: "published", publishedAt: new Date() };

async function upsertBySlug(Model, slug, doc, { label }) {
  const merged = { ...doc, slug, ...PUBLISHED };
  const result = await Model.findOneAndUpdate(
    { slug },
    { $set: merged },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
  // eslint-disable-next-line no-console
  console.log(`  ${label}: ${result.title || result.name || slug}`);
  return result;
}

async function upsertTeamMember(name, doc) {
  const result = await TeamMember.findOneAndUpdate(
    { name },
    { $set: { name, ...doc } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
  console.log(`  TeamMember: ${result.name}`);
  return result;
}

// ---- content -------------------------------------------------------------

async function seedProductCategories() {
  console.log("\n▸ Product Categories");
  const cam = await upsertBySlug(
    ProductCategory,
    "cam-software",
    { title: "CAM Software", description: "Software that turns CAD geometry into machine-ready cutting/punching paths." },
    { label: "ProductCategory" },
  );
  const quoting = await upsertBySlug(
    ProductCategory,
    "quoting-estimation",
    { title: "Quoting & Estimation", description: "RFQ pricing and cost-estimation tools for fabrication shops." },
    { label: "ProductCategory" },
  );
  const planning = await upsertBySlug(
    ProductCategory,
    "production-planning",
    { title: "Production Planning", description: "Scheduling, capacity planning, and shop-floor execution tools." },
    { label: "ProductCategory" },
  );
  return { cam, quoting, planning };
}

async function seedSolutions() {
  console.log("\n▸ Solutions");
  const fabrication = await upsertBySlug(
    Solution,
    "fabrication",
    {
      title: "Fabrication",
      shortDescription: "End-to-end CAM for laser, plasma, waterjet, punching, and tube cutting.",
      overview:
        "The Fabrication suite covers every cutting and punching workflow in a typical sheet-metal shop — from nesting and toolpath generation to post-processor output for any major CNC controller.",
      painPoints: [
        "Manual nesting wastes 8–15% of material",
        "Operator-dependent programming creates bottlenecks",
        "Switching between machines means re-learning software",
      ],
      capabilities: [
        "Automatic and manual nesting",
        "Multi-machine post-processors",
        "Tube and profile cutting",
        "Common-line cutting and tagging",
      ],
    },
    { label: "Solution" },
  );
  const estimation = await upsertBySlug(
    Solution,
    "estimation",
    {
      title: "Estimation",
      shortDescription: "Win more RFQs with accurate, fast quotes.",
      overview:
        "AlmaQuote uses real material costs, machine rates, and your own nesting data to produce defensible quotes in minutes instead of days.",
      painPoints: [
        "Quotes take 2–5 days to turn around",
        "Quote accuracy depends on the senior estimator's availability",
        "Underpriced jobs eat margin; overpriced jobs lose deals",
      ],
      capabilities: [
        "Auto-nesting on quote",
        "Multi-quantity break analysis",
        "Material cost lookup",
        "PDF and Excel export",
      ],
    },
    { label: "Solution" },
  );
  const production = await upsertBySlug(
    Solution,
    "production",
    {
      title: "Production",
      shortDescription: "Schedule, dispatch, and track every job through the shop.",
      overview:
        "Connect your CAM, quoting, and ERP systems with a scheduling layer that knows real machine capacity, operator skills, and job priority.",
      painPoints: [
        "Spreadsheets don't reflect what's actually running",
        "Operators don't know what's next without asking",
        "Late jobs slip until the customer calls",
      ],
      capabilities: [
        "Drag-and-drop scheduling",
        "Live shop-floor dashboards",
        "ERP integration",
        "Capacity what-if analysis",
      ],
    },
    { label: "Solution" },
  );
  return { fabrication, estimation, production };
}

async function seedProducts({ cats, sols }) {
  console.log("\n▸ Products");
  const cut = await upsertBySlug(
    Product,
    "almacam-cut",
    {
      title: "AlmaCAM Cut",
      category: cats.cam._id,
      solution: sols.fabrication._id,
      tagline: "Production-grade CAM for laser, plasma, and waterjet cutting.",
      overview:
        "AlmaCAM Cut takes your CAD geometry and produces optimized cutting paths for every major CNC controller. Built for shops that need to run multiple machines from one software.",
      keyFeatures: [
        { title: "Automatic toolpath generation", description: "Recognizes part contours and assigns cut sequences in seconds." },
        { title: "Common-line cutting", description: "Cuts shared edges once to save material and machine time." },
        { title: "Multi-machine support", description: "One license drives lasers, plasma, and waterjet from a single library." },
      ],
      benefits: [
        "Up to 15% material savings via smarter nesting",
        "30% faster programming time",
        "Single toolkit for the entire cutting floor",
      ],
      supportingMachine: { text: "Compatible with Trumpf, Bystronic, Amada, Mazak, and most legacy controllers." },
      useCases: [
        { title: "High-mix, low-volume job shops", description: "Quick part setup with reusable nesting rules." },
        { title: "Production fabricators", description: "Repeatable, optimized programs for daily runs." },
      ],
      faqSections: [
        {
          title: "Getting started",
          items: [
            { question: "What CAD formats does it import?", answer: "DXF, DWG, IGES, STEP, and SolidWorks parts." },
            { question: "Can I use my existing post-processor?", answer: "Yes — we support over 200 post-processors out of the box." },
          ],
        },
      ],
    },
    { label: "Product" },
  );
  const nester = await upsertBySlug(
    Product,
    "almacam-nester",
    {
      title: "Almacam Nester",
      category: cats.cam._id,
      solution: sols.fabrication._id,
      tagline: "True-shape automatic nesting that beats hand-nesting on every job.",
      overview:
        "Almacam Nester uses true-shape geometry and rotation rules to pack parts into sheets with material yield that hand-nesting can rarely match.",
      keyFeatures: [
        { title: "True-shape packing", description: "Considers actual part geometry, not just bounding boxes." },
        { title: "Remnant management", description: "Tracks and re-uses sheet remnants automatically." },
        { title: "Batch nesting", description: "Nest hundreds of orders together for maximum yield." },
      ],
      benefits: [
        "5–12% additional material savings vs hand-nesting",
        "Sub-minute nest times even for large batches",
        "Automatic remnant tracking pays for itself in a month",
      ],
      useCases: [
        { title: "High material-cost shops", description: "Stainless, aluminum, and exotic alloys where every percent matters." },
      ],
    },
    { label: "Product" },
  );
  const punch = await upsertBySlug(
    Product,
    "almacam-punch",
    {
      title: "Almacam Punch",
      category: cats.cam._id,
      solution: sols.fabrication._id,
      tagline: "Punching CAM with intelligent tool selection and stripper management.",
      overview:
        "Generate optimal punch sequences with automatic tool selection from your library, plus full support for forming, tapping, and combo machines.",
      keyFeatures: [
        { title: "Automatic tool selection", description: "Matches part features to the best tools in your turret." },
        { title: "Microjoint placement", description: "Smart placement keeps parts in place but easy to remove." },
      ],
      benefits: [
        "20–40% faster programming",
        "Reduced tool changes per job",
        "Support for combo punch/laser machines",
      ],
    },
    { label: "Product" },
  );
  const quote = await upsertBySlug(
    Product,
    "almaquote",
    {
      title: "AlmaQuote",
      category: cats.quoting._id,
      solution: sols.estimation._id,
      tagline: "Turn RFQs into accurate quotes in minutes.",
      overview:
        "AlmaQuote auto-nests every quote, looks up live material costs, and outputs a polished PDF your customer will love — without tying up your senior estimator for a day.",
      keyFeatures: [
        { title: "Auto-nesting on quote", description: "Real material yield, not an estimate, drives the price." },
        { title: "Quantity-break analysis", description: "Quote 1, 10, 100, and 1000 in one pass." },
        { title: "Branded PDF output", description: "Your logo, terms, and pricing — ready to send." },
      ],
      benefits: [
        "Quote turnaround from days to minutes",
        "Win 25–40% more RFQs through speed alone",
        "Defensible pricing built on real costs",
      ],
      useCases: [
        { title: "Job shops chasing high RFQ volume", description: "Quote three times more jobs per estimator." },
        { title: "OEM suppliers", description: "Respond to RFQs same-day to win preferred-supplier status." },
      ],
    },
    { label: "Product" },
  );
  const tube = await upsertBySlug(
    Product,
    "almacam-tube",
    {
      title: "AlmaCAM Tube",
      category: cats.cam._id,
      solution: sols.fabrication._id,
      tagline: "Tube and profile cutting CAM for 3D laser and plasma machines.",
      overview:
        "Generate 3D cutting paths for round tube, square tube, and structural profiles. Full support for end-prep, mitering, and intersection welding.",
      keyFeatures: [
        { title: "3D toolpath generation", description: "Handles complex tube intersections and chamfers." },
        { title: "Profile library", description: "Pre-loaded with standard structural shapes (I-beams, channels, angles)." },
      ],
      benefits: [
        "Eliminate manual tube programming",
        "Open new revenue streams from structural work",
      ],
    },
    { label: "Product" },
  );
  const scheduler = await upsertBySlug(
    Product,
    "almacam-scheduler",
    {
      title: "AlmaCAM Scheduler",
      category: cats.planning._id,
      solution: sols.production._id,
      tagline: "Live shop-floor scheduling that knows what your machines can actually do.",
      overview:
        "AlmaCAM Scheduler turns your CAM queue and ERP orders into a real, executable plan that adjusts to machine downtime, operator availability, and rush jobs.",
      keyFeatures: [
        { title: "Drag-and-drop Gantt", description: "Visual schedule for every machine on the floor." },
        { title: "Real-time updates", description: "Operators report progress; the schedule updates live." },
        { title: "Capacity what-if", description: "Try a new job in the schedule before committing." },
      ],
      benefits: [
        "20–35% throughput improvement",
        "Late-job rate cut by half",
        "Visibility from desk to shop floor",
      ],
    },
    { label: "Product" },
  );
  return { cut, nester, punch, quote, tube, scheduler };
}

async function seedIndustries() {
  console.log("\n▸ Industries");
  const sheetMetal = await upsertBySlug(
    Industry,
    "sheet-metal-fabrication",
    {
      title: "Sheet Metal Fabrication",
      headline: "Win more jobs with faster quoting and tighter nesting.",
      overview:
        "Sheet metal fab shops live and die by material yield, RFQ turnaround, and machine utilization. Our suite plugs into every step from quote to ship.",
      workflow: ["Design", "Estimation", "Programming", "Nesting", "Production", "Delivery"],
      painPoints: [
        "Hand-nesting wastes 8–15% of expensive material",
        "Estimators are a bottleneck — quotes take days",
        "Programming time eats into machine capacity",
        "Late jobs hurt repeat business",
      ],
      benefits: [
        "Higher material yield with true-shape nesting",
        "Same-day quote turnaround",
        "Programs ready before the operator clocks in",
        "Live schedule visible to sales and the floor",
      ],
      kpiBenefits: [
        { direction: "down", metric: "Material waste", value: "8%" },
        { direction: "up", metric: "Quote turnaround speed", value: "20×" },
        { direction: "up", metric: "Machine utilization", value: "30%" },
        { direction: "down", metric: "Late job rate", value: "50%" },
      ],
    },
    { label: "Industry" },
  );
  const hvac = await upsertBySlug(
    Industry,
    "hvac-manufacturing",
    {
      title: "HVAC Manufacturing",
      headline: "Repeatable nesting and scheduling for HVAC component shops.",
      overview:
        "HVAC fabricators run high-volume, repeating jobs across a mix of materials. Our tools standardize programming and squeeze every cm of material.",
      workflow: ["Order", "Nesting", "Cutting", "Forming", "Assembly", "Ship"],
      painPoints: [
        "High part variety per job",
        "Material cost pressure from commodity swings",
        "Manual cut lists slow the punch line",
      ],
      benefits: [
        "Batch nesting across job lots",
        "Automated punch programs",
        "Real shop-floor visibility",
      ],
      kpiBenefits: [
        { direction: "down", metric: "Material scrap", value: "10%" },
        { direction: "up", metric: "Throughput", value: "25%" },
        { direction: "down", metric: "Programming time", value: "60%" },
      ],
    },
    { label: "Industry" },
  );
  const auto = await upsertBySlug(
    Industry,
    "automotive-components",
    {
      title: "Automotive Components",
      headline: "Tier-1 and Tier-2 suppliers need PPAP-grade documentation and zero defects.",
      overview:
        "Automotive component manufacturers face traceability, PPAP, and zero-defect demands. Our suite ties CAM, quoting, and production planning together with audit-ready records.",
      workflow: ["RFQ", "DFM", "Programming", "Production", "Inspection", "Delivery"],
      painPoints: [
        "PPAP documentation is manual and error-prone",
        "Tier-1 customers demand same-day RFQ responses",
        "Traceability gaps trigger audits",
      ],
      benefits: [
        "Auto-generated PPAP packets",
        "Same-day quoting from RFQ portals",
        "Full part-to-job traceability",
      ],
      kpiBenefits: [
        { direction: "down", metric: "RFQ turnaround time", value: "75%" },
        { direction: "up", metric: "Quote win rate", value: "35%" },
      ],
    },
    { label: "Industry" },
  );
  const heavy = await upsertBySlug(
    Industry,
    "heavy-engineering",
    {
      title: "Heavy Engineering",
      headline: "Thick plate cutting and structural fabrication, programmed in minutes.",
      overview:
        "Heavy engineering shops handle thick plate, large weldments, and structural profiles. Our CAM handles every cutting method and every machine size.",
      workflow: ["Design", "Cutting plan", "Programming", "Cutting", "Welding", "Finishing"],
      painPoints: [
        "Thick-plate cutting needs special toolpaths",
        "Large parts mean long programming cycles",
        "Mistakes are expensive at this scale",
      ],
      benefits: [
        "Plasma and waterjet support for thick plate",
        "Automatic kerf and pierce optimization",
        "Profile cutting for structural shapes",
      ],
      kpiBenefits: [
        { direction: "down", metric: "Program time per part", value: "40%" },
        { direction: "down", metric: "Pierce count", value: "20%" },
      ],
    },
    { label: "Industry" },
  );
  const aero = await upsertBySlug(
    Industry,
    "aerospace-precision",
    {
      title: "Aerospace & Precision",
      headline: "Tight tolerance, full traceability, and AS9100-ready workflows.",
      overview:
        "Aerospace and precision manufacturers need to combine micron-level tolerances with full lot traceability and supplier-audit records. Our suite supports both.",
      workflow: ["RFQ", "DFM review", "Programming", "First article", "Production", "Inspection"],
      painPoints: [
        "Audit prep eats engineering time",
        "First-article quality issues delay launches",
        "Material traceability is partly manual",
      ],
      benefits: [
        "AS9100-friendly traceability built in",
        "First-article reports auto-generated",
        "Lot tracking from material to ship",
      ],
      kpiBenefits: [
        { direction: "down", metric: "Audit prep time", value: "70%" },
        { direction: "up", metric: "On-time delivery", value: "15%" },
      ],
    },
    { label: "Industry" },
  );
  return { sheetMetal, hvac, auto, heavy, aero };
}

async function seedBlogs() {
  console.log("\n▸ Blogs");
  const scrap = await upsertBySlug(
    Blog,
    "5-ways-to-reduce-sheet-metal-scrap",
    {
      title: "5 ways to reduce sheet metal scrap",
      excerpt: "Material is the single biggest cost in most fab shops. Here are five concrete tactics to bring your scrap rate down.",
      tags: ["nesting", "material savings", "sheet metal"],
      introduction: {
        introduction:
          "Most shops accept 10–15% scrap as the cost of doing business. With modern true-shape nesting and remnant tracking, the best shops are closer to 3–5%. Here's how they get there.",
      },
      sections: [
        {
          sectionTitle: "True-shape nesting",
          detailSections: [
            {
              title: "Why bounding-box nesting loses material",
              overview: "Older nesters treat every part as a rectangle. Real parts have curves and angles you can pack into.",
              points: [
                "Bounding-box nesting wastes the space inside complex shapes",
                "True-shape nesting considers actual geometry",
                "Modern nesters do this in seconds even for big batches",
              ],
            },
          ],
          order: 1,
        },
        {
          sectionTitle: "Remnant management",
          detailSections: [
            {
              title: "Track what's left from every sheet",
              overview: "Every part that doesn't fill a sheet creates a remnant. Tracked and re-used, remnants pay for the software in months.",
              points: [
                "Tag remnants with a barcode after the cut",
                "Re-nest small jobs onto remnants first",
                "Audit remnant usage monthly",
              ],
            },
          ],
          order: 2,
        },
      ],
    },
    { label: "Blog" },
  );
  const hvacAuto = await upsertBySlug(
    Blog,
    "why-automation-matters-in-hvac-manufacturing",
    {
      title: "Why automation matters in HVAC manufacturing",
      excerpt: "HVAC fabricators face shrinking margins and rising material costs. Automation is no longer optional.",
      tags: ["HVAC", "automation", "manufacturing"],
      introduction: {
        introduction:
          "HVAC margins have compressed every year for the past decade. Shops that haven't invested in automated nesting and scheduling are falling behind.",
      },
      sections: [
        {
          sectionTitle: "The cost of doing nothing",
          detailSections: [
            {
              title: "Manual processes don't scale",
              overview: "Every day spent hand-nesting is a day not spent winning new business.",
              points: [
                "5–8 hours per day on manual nesting is common",
                "Quote turnaround over 3 days loses 30% of RFQs",
                "Programming bottlenecks limit machine utilization",
              ],
            },
          ],
          order: 1,
        },
      ],
    },
    { label: "Blog" },
  );
  const chooseCam = await upsertBySlug(
    Blog,
    "choosing-the-right-cam-software",
    {
      title: "Choosing the right CAM software for your fab shop",
      excerpt: "Not all CAM software is created equal. Here's what to evaluate before you commit.",
      tags: ["CAM", "buying guide"],
      introduction: {
        introduction:
          "A CAM purchase is a 5–10 year commitment. Get it right with these eight evaluation criteria.",
      },
      sections: [
        {
          sectionTitle: "Eight criteria that matter",
          detailSections: [
            {
              title: "Don't skip these in the demo",
              points: [
                "Post-processor support for your specific machines",
                "Nesting quality on your actual parts",
                "Programming time for representative jobs",
                "Integration with your CAD",
                "Vendor responsiveness during evaluation",
              ],
            },
          ],
          order: 1,
        },
      ],
    },
    { label: "Blog" },
  );
  const rfq = await upsertBySlug(
    Blog,
    "the-hidden-cost-of-slow-rfq-turnaround",
    {
      title: "The hidden cost of slow RFQ turnaround",
      excerpt: "Every day you take to respond to an RFQ costs you a 10% chance of winning the job.",
      tags: ["quoting", "RFQ", "sales"],
      introduction: {
        introduction:
          "We analyzed 50,000 RFQ outcomes across mid-market fabricators. The data is clear: speed is the single biggest predictor of who wins.",
      },
      sections: [],
    },
    { label: "Blog" },
  );
  return { scrap, hvacAuto, chooseCam, rfq };
}

async function seedTestimonials(industries) {
  console.log("\n▸ Testimonials");

  // Testimonial has no `slug` field, so upsert by customerName + company.
  const upsertTestimonial = async (data) => {
    const result = await Testimonial.findOneAndUpdate(
      { customerName: data.customerName, company: data.company },
      { $set: { ...data, ...PUBLISHED } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
    console.log(`  Testimonial: ${result.customerName} (${result.company})`);
    return result;
  };

  const ta = await upsertTestimonial({
    customerName: "Sarah Patel",
    company: "Acme Fabricators",
    designation: "VP of Operations",
    quote: "Quote turnaround dropped from 3 days to 4 hours. Our win rate jumped 35% in the first quarter. Best ROI we've ever had on software.",
    rating: 5,
    industry: industries.sheetMetal._id,
  });
  const tb = await upsertTestimonial({
    customerName: "Marcus Chen",
    company: "BlueRidge HVAC",
    designation: "Production Manager",
    quote: "Material scrap is down 12%. That alone paid for the software in five months. The scheduler is icing on the cake.",
    rating: 5,
    industry: industries.hvac._id,
  });
  const tc = await upsertTestimonial({
    customerName: "Priya Iyer",
    company: "Tier1 Auto",
    designation: "Plant Director",
    quote: "We respond to RFQs same-day now. Our largest OEM customer named us a preferred supplier last quarter.",
    rating: 5,
    industry: industries.auto._id,
  });
  const td = await upsertTestimonial({
    customerName: "James O'Brien",
    company: "Northern Ironworks",
    designation: "CEO",
    quote: "Thick-plate programming used to take a full day. Now it's an hour. The plasma post-processor is rock solid.",
    rating: 5,
    industry: industries.heavy._id,
  });
  return { ta, tb, tc, td };
}

async function seedCaseStudies({ industries, products, testimonials }) {
  console.log("\n▸ Case Studies");
  const cs1 = await upsertBySlug(
    CaseStudy,
    "acme-fabricators-quoting-transformation",
    {
      title: "Acme Fabricators cut quote time by 80% with AlmaQuote",
      customerName: "Acme Fabricators",
      industry: industries.sheetMetal._id,
      products: [products.quote._id, products.nester._id],
      testimonial: testimonials.ta._id,
      challenge:
        "Acme's senior estimator was the bottleneck for every RFQ. Quotes took 3 to 5 days, and customers were going elsewhere. The team needed to triple throughput without hiring more estimators.",
      sections: [
        {
          title: "Discovery",
          paragraph:
            "We spent a week with Acme's estimation team mapping every step of their quoting workflow. The hand-nesting alone was eating 4 hours per RFQ.",
          bullets: [
            "Audited 30 historical quotes for material accuracy",
            "Identified 6 manual steps that could be automated",
            "Benchmarked competitor quote turnaround at 2.1 days",
          ],
        },
        {
          title: "Rollout",
          paragraph:
            "AlmaQuote was installed alongside their existing Almacam Nester license. Material costs and machine rates were imported from their ERP. Training took 3 sessions of 90 minutes each.",
          bullets: [
            "Live AlmaQuote install on day 1",
            "ERP integration verified by end of week 1",
            "First production quote sent by day 10",
          ],
        },
        {
          title: "Outcome",
          paragraph:
            "Within 60 days Acme was sending quotes the same day RFQs arrived. Win rate jumped 35% and the team picked up two new OEM accounts that required <24h RFQ response.",
        },
      ],
      results: [
        { label: "Quote turnaround", oldValue: "3-5 days", newValue: "4 hours" },
        { label: "Monthly RFQs handled", oldValue: "40", newValue: "120" },
        { label: "Win rate", oldValue: "22%", newValue: "30%" },
      ],
    },
    { label: "CaseStudy" },
  );
  const cs2 = await upsertBySlug(
    CaseStudy,
    "blueridge-hvac-automated-nesting",
    {
      title: "BlueRidge HVAC scaled production with automated nesting",
      customerName: "BlueRidge HVAC",
      industry: industries.hvac._id,
      products: [products.nester._id, products.scheduler._id],
      testimonial: testimonials.tb._id,
      challenge:
        "BlueRidge ran 200+ unique HVAC parts daily across 4 punch lines. Manual nesting and ad-hoc scheduling meant operators were idle 30% of the day waiting for the next job.",
      sections: [
        {
          title: "Diagnosis",
          paragraph: "Three weeks of shop-floor observation revealed the real problem wasn't capacity — it was coordination.",
          bullets: [
            "Operators waited 90 minutes/day on average for the next job",
            "Material scrap was 14% — three points above industry benchmark",
            "Punch line utilization was below 60%",
          ],
        },
        {
          title: "Implementation",
          paragraph:
            "Almacam Nester replaced their in-house nesting. Scheduler took over job dispatching with live updates from each punch line.",
        },
      ],
      results: [
        { label: "Material scrap", oldValue: "14%", newValue: "2%" },
        { label: "Punch line utilization", oldValue: "58%", newValue: "84%" },
        { label: "Operator idle time", oldValue: "90 min/day", newValue: "15 min/day" },
      ],
    },
    { label: "CaseStudy" },
  );
  const cs3 = await upsertBySlug(
    CaseStudy,
    "northern-ironworks-thick-plate-throughput",
    {
      title: "Northern Ironworks tripled thick-plate throughput",
      customerName: "Northern Ironworks",
      industry: industries.heavy._id,
      products: [products.cut._id],
      testimonial: testimonials.td._id,
      challenge:
        "Northern's plasma machines were programmed by a single specialist. Vacations and sick days created backlogs of 2-3 weeks.",
      sections: [
        {
          title: "Approach",
          paragraph:
            "Programming was distributed across the engineering team using AlmaCAM Cut's plasma library. The senior programmer became a mentor instead of a bottleneck.",
          bullets: [
            "5 engineers trained over 2 weeks",
            "Plasma post-processor validated on test cuts",
            "Programming templates created for top 30 part families",
          ],
        },
      ],
      results: [
        { label: "Average program time", oldValue: "8 hours", newValue: "1.5 hours" },
        { label: "Programming backlog", oldValue: "2-3 weeks", newValue: "<2 days" },
      ],
    },
    { label: "CaseStudy" },
  );
  return { cs1, cs2, cs3 };
}

async function seedTutorials({ products, industries }) {
  console.log("\n▸ Tutorials");
  const tu1 = await upsertBySlug(
    Tutorial,
    "getting-started-with-almacam-nester",
    {
      title: "Getting started with Almacam Nester",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      content:
        "This 12-minute tutorial walks you through your first nest in Almacam Nester. By the end you'll have imported a DXF, set up sheet stock, and produced a nest ready to send to your cutting machine.",
      products: [products.nester._id],
      industries: [industries.sheetMetal._id, industries.hvac._id],
    },
    { label: "Tutorial" },
  );
  const tu2 = await upsertBySlug(
    Tutorial,
    "setting-up-your-first-quote-in-almaquote",
    {
      title: "Setting up your first quote in AlmaQuote",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      content:
        "Step-by-step: configure your material library, machine rates, and labor costs in AlmaQuote so your first RFQ produces a polished quote PDF in under five minutes.",
      products: [products.quote._id],
      industries: [industries.sheetMetal._id, industries.auto._id],
    },
    { label: "Tutorial" },
  );
  const tu3 = await upsertBySlug(
    Tutorial,
    "tube-cutting-fundamentals",
    {
      title: "Tube cutting fundamentals",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      content:
        "Learn how to set up 3D tube programs in AlmaCAM Tube: profile selection, intersection welding, end-prep, and post-processor output.",
      products: [products.tube._id],
      industries: [industries.heavy._id],
    },
    { label: "Tutorial" },
  );
  const tu4 = await upsertBySlug(
    Tutorial,
    "integrating-scheduler-with-your-erp",
    {
      title: "Integrating Scheduler with your ERP",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      content:
        "How to wire AlmaCAM Scheduler into the most common ERPs (SAP, Epicor, Infor, NetSuite) so jobs flow automatically from order entry to shop floor.",
      products: [products.scheduler._id],
      industries: [industries.sheetMetal._id, industries.hvac._id, industries.auto._id],
    },
    { label: "Tutorial" },
  );
  return { tu1, tu2, tu3, tu4 };
}

async function seedCareers() {
  console.log("\n▸ Careers");
  await upsertBySlug(
    Career,
    "senior-cam-engineer",
    {
      title: "Senior CAM Engineer",
      department: "Engineering",
      location: "Pune, India",
      employmentType: "Full-time",
      experienceLevel: "Senior",
      overview:
        "Join our core CAM engineering team building the next generation of toolpath generation for laser, plasma, and waterjet cutting. You'll own significant pieces of our nesting and cutting engines.",
      responsibilities: [
        "Design and implement new toolpath algorithms",
        "Review and approve pull requests from junior engineers",
        "Profile and optimize existing CAM modules",
        "Collaborate with customer-facing teams on edge-case bug reports",
      ],
      requirements: [
        "5+ years building production CAM, CAD, or geometry-heavy software",
        "Strong C++ or Rust skills",
        "Solid grasp of computational geometry",
        "Experience with at least one CNC machine type",
      ],
      niceToHave: [
        "Experience with HVAC, aerospace, or automotive manufacturing",
        "Open-source contributions in geometry libraries",
      ],
      benefits: [
        "Competitive salary plus equity",
        "Comprehensive health insurance for you and family",
        "Annual conference budget",
        "Flexible hybrid work",
      ],
    },
    { label: "Career" },
  );
  await upsertBySlug(
    Career,
    "sales-engineer-manufacturing",
    {
      title: "Sales Engineer — Manufacturing",
      department: "Sales",
      location: "Remote (India / SE Asia)",
      employmentType: "Full-time",
      experienceLevel: "Mid-level",
      overview:
        "Help fabrication shops across India and SE Asia choose the right CAM/quoting/scheduling stack. You'll lead technical demos, scope POCs, and translate shop-floor pain into product wins.",
      responsibilities: [
        "Lead technical product demos",
        "Scope and execute proof-of-concept evaluations",
        "Partner with sales to close enterprise deals",
        "Feed prospect feedback to the product team",
      ],
      requirements: [
        "3+ years in pre-sales, solutions engineering, or technical sales",
        "Solid understanding of manufacturing workflows",
        "Strong presentation and demo skills",
        "Willingness to travel 25–40%",
      ],
      benefits: [
        "Base + uncapped commission",
        "Health insurance",
        "Travel budget",
      ],
    },
    { label: "Career" },
  );
  await upsertBySlug(
    Career,
    "customer-success-manager",
    {
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "Pune, India",
      employmentType: "Full-time",
      experienceLevel: "Mid-level",
      overview:
        "Own a book of 30–50 mid-market fabrication customers. Drive adoption, expansion, and renewals. You'll be the trusted advisor who helps shops actually use what they bought.",
      responsibilities: [
        "Onboard new customers within 60 days",
        "Run quarterly business reviews",
        "Identify expansion and upsell opportunities",
        "Escalate technical issues to support and engineering",
      ],
      requirements: [
        "2+ years in B2B SaaS customer success or account management",
        "Comfort with manufacturing terminology",
        "Strong written and verbal communication",
      ],
      benefits: ["Health insurance", "Annual learning stipend", "Hybrid work"],
    },
    { label: "Career" },
  );
  await upsertBySlug(
    Career,
    "junior-software-developer",
    {
      title: "Junior Software Developer",
      department: "Engineering",
      location: "Pune, India",
      employmentType: "Full-time",
      experienceLevel: "Entry-level",
      overview:
        "Start your career building real software used by manufacturing teams around the world. You'll pair with senior engineers on the web admin, public website, and integration tooling.",
      responsibilities: [
        "Ship features in our admin and public website",
        "Write and maintain integration tests",
        "Participate in code reviews",
      ],
      requirements: [
        "CS degree or equivalent self-taught background",
        "Familiarity with JavaScript/TypeScript and React",
        "Curiosity about manufacturing",
      ],
      benefits: ["Mentorship from senior engineers", "Health insurance", "Learning budget"],
    },
    { label: "Career" },
  );
}

async function seedTeamMembers() {
  console.log("\n▸ Team Members");
  await upsertTeamMember("Vijay Kumar", {
    designation: "Founder & CEO",
    bio: "Two decades of manufacturing software. Founded CADCAMSYS to give mid-market fab shops the same tools the Fortune 500 takes for granted.",
    order: 1,
  });
  await upsertTeamMember("Anita Sharma", {
    designation: "Head of Engineering",
    bio: "Computational geometry specialist. Built the core nesting engine that's now in production at over 200 shops.",
    order: 2,
  });
  await upsertTeamMember("Rohan Mehta", {
    designation: "Head of Sales",
    bio: "Former plant manager turned sales leader. Speaks the language of the shop floor.",
    order: 3,
  });
  await upsertTeamMember("Sneha Krishnan", {
    designation: "Customer Success Lead",
    bio: "Helps customers go from \"installed\" to \"actually using it\" within 60 days, every time.",
    order: 4,
  });
}

async function seedPages() {
  console.log("\n▸ Pages");
  // "About CADCAMSYS" is now the dedicated About singleton (see seedAbout.js),
  // not a generic Page. Only the remaining standalone pages are seeded here.
  await upsertBySlug(
    Page,
    "contact",
    {
      title: "Contact us",
      pageType: "default",
      sections: [
        {
          type: "text",
          title: "Get in touch",
          content: "We respond to every enquiry within one business day. Sales, support, and partnership questions all welcome.",
        },
      ],
    },
    { label: "Page (contact)" },
  );
  await upsertBySlug(
    Page,
    "privacy",
    {
      title: "Privacy Policy",
      pageType: "default",
      sections: [
        {
          type: "text",
          title: "How we handle your data",
          content: "We collect only what we need to provide the service you signed up for. We never sell your data. See below for the details.",
        },
      ],
    },
    { label: "Page (privacy)" },
  );
}

// Cross-references — set after all primary entities exist. Done as updates
// so the slugged inserts above stay focused on their own fields.
async function linkCrossReferences({ industries, products, blogs, testimonials, caseStudies, tutorials }) {
  console.log("\n▸ Cross-references");

  // Industries → products / case studies / testimonials / blogs / tutorials
  await Industry.findByIdAndUpdate(industries.sheetMetal._id, {
    products: [products.cut._id, products.nester._id, products.quote._id, products.scheduler._id],
    caseStudies: [caseStudies.cs1._id, caseStudies.cs2._id],
    testimonials: [testimonials.ta._id, testimonials.tb._id],
    blogs: [blogs.scrap._id, blogs.chooseCam._id, blogs.rfq._id],
    tutorials: [tutorials.tu1._id, tutorials.tu2._id, tutorials.tu4._id],
  });
  await Industry.findByIdAndUpdate(industries.hvac._id, {
    products: [products.nester._id, products.punch._id, products.scheduler._id],
    caseStudies: [caseStudies.cs2._id],
    testimonials: [testimonials.tb._id],
    blogs: [blogs.hvacAuto._id, blogs.scrap._id],
    tutorials: [tutorials.tu1._id, tutorials.tu4._id],
  });
  await Industry.findByIdAndUpdate(industries.auto._id, {
    products: [products.quote._id, products.cut._id, products.scheduler._id],
    testimonials: [testimonials.tc._id],
    blogs: [blogs.rfq._id],
    tutorials: [tutorials.tu2._id, tutorials.tu4._id],
  });
  await Industry.findByIdAndUpdate(industries.heavy._id, {
    products: [products.cut._id, products.tube._id, products.nester._id],
    caseStudies: [caseStudies.cs3._id],
    testimonials: [testimonials.td._id],
    blogs: [blogs.scrap._id],
    tutorials: [tutorials.tu3._id],
  });
  await Industry.findByIdAndUpdate(industries.aero._id, {
    products: [products.cut._id, products.scheduler._id, products.quote._id],
    blogs: [blogs.chooseCam._id],
  });
  console.log("  Industries linked");

  // Products → related industries / blogs / testimonials / case studies
  await Product.findByIdAndUpdate(products.cut._id, {
    relatedIndustries: [industries.sheetMetal._id, industries.heavy._id, industries.aero._id],
    relatedBlogs: [blogs.chooseCam._id],
    relatedTestimonials: [testimonials.td._id],
    relatedCaseStudies: [caseStudies.cs3._id],
  });
  await Product.findByIdAndUpdate(products.nester._id, {
    relatedIndustries: [industries.sheetMetal._id, industries.hvac._id, industries.heavy._id],
    relatedBlogs: [blogs.scrap._id, blogs.hvacAuto._id],
    relatedTestimonials: [testimonials.tb._id],
    relatedCaseStudies: [caseStudies.cs1._id, caseStudies.cs2._id],
  });
  await Product.findByIdAndUpdate(products.punch._id, {
    relatedIndustries: [industries.hvac._id],
    relatedTestimonials: [testimonials.tb._id],
  });
  await Product.findByIdAndUpdate(products.quote._id, {
    relatedIndustries: [industries.sheetMetal._id, industries.auto._id],
    relatedBlogs: [blogs.rfq._id],
    relatedTestimonials: [testimonials.ta._id, testimonials.tc._id],
    relatedCaseStudies: [caseStudies.cs1._id],
  });
  await Product.findByIdAndUpdate(products.tube._id, {
    relatedIndustries: [industries.heavy._id],
  });
  await Product.findByIdAndUpdate(products.scheduler._id, {
    relatedIndustries: [industries.sheetMetal._id, industries.hvac._id, industries.auto._id],
    relatedTestimonials: [testimonials.tb._id],
    relatedCaseStudies: [caseStudies.cs2._id],
  });
  console.log("  Products linked");

  // Testimonials → products
  await Testimonial.findByIdAndUpdate(testimonials.ta._id, { products: [products.quote._id, products.nester._id] });
  await Testimonial.findByIdAndUpdate(testimonials.tb._id, { products: [products.nester._id, products.punch._id, products.scheduler._id] });
  await Testimonial.findByIdAndUpdate(testimonials.tc._id, { products: [products.quote._id] });
  await Testimonial.findByIdAndUpdate(testimonials.td._id, { products: [products.cut._id] });
  console.log("  Testimonials linked");

  // Blogs → related products / industries / case studies
  await Blog.findByIdAndUpdate(blogs.scrap._id, {
    relatedProducts: [products.nester._id, products.cut._id],
    relatedIndustries: [industries.sheetMetal._id, industries.hvac._id, industries.heavy._id],
    relatedCaseStudies: [caseStudies.cs2._id],
  });
  await Blog.findByIdAndUpdate(blogs.hvacAuto._id, {
    relatedProducts: [products.nester._id, products.scheduler._id],
    relatedIndustries: [industries.hvac._id],
    relatedCaseStudies: [caseStudies.cs2._id],
  });
  await Blog.findByIdAndUpdate(blogs.chooseCam._id, {
    relatedProducts: [products.cut._id, products.nester._id, products.punch._id],
    relatedIndustries: [industries.sheetMetal._id, industries.aero._id],
  });
  await Blog.findByIdAndUpdate(blogs.rfq._id, {
    relatedProducts: [products.quote._id],
    relatedIndustries: [industries.sheetMetal._id, industries.auto._id],
    relatedCaseStudies: [caseStudies.cs1._id],
  });
  console.log("  Blogs linked");
}

// ---- main ----------------------------------------------------------------

async function main() {
  console.log("→ Connecting to MongoDB…");
  await connectDb();
  console.log("✓ Connected\n");

  const cats = await seedProductCategories();
  const sols = await seedSolutions();
  const products = await seedProducts({ cats, sols });
  const industries = await seedIndustries();
  const blogs = await seedBlogs();
  const testimonials = await seedTestimonials(industries);
  const caseStudies = await seedCaseStudies({ industries, products, testimonials });
  const tutorials = await seedTutorials({ products, industries });
  await seedCareers();
  await seedTeamMembers();
  await seedPages();
  await linkCrossReferences({ industries, products, blogs, testimonials, caseStudies, tutorials });

  // Solutions → backfill products list (so the Solutions admin page shows them).
  await Solution.findByIdAndUpdate(sols.fabrication._id, {
    products: [products.cut._id, products.nester._id, products.punch._id, products.tube._id],
    industries: [industries.sheetMetal._id, industries.hvac._id, industries.heavy._id],
    blogs: [blogs.scrap._id, blogs.chooseCam._id],
    caseStudies: [caseStudies.cs2._id, caseStudies.cs3._id],
    testimonials: [testimonials.tb._id, testimonials.td._id],
  });
  await Solution.findByIdAndUpdate(sols.estimation._id, {
    products: [products.quote._id],
    industries: [industries.sheetMetal._id, industries.auto._id],
    blogs: [blogs.rfq._id],
    caseStudies: [caseStudies.cs1._id],
    testimonials: [testimonials.ta._id, testimonials.tc._id],
  });
  await Solution.findByIdAndUpdate(sols.production._id, {
    products: [products.scheduler._id],
    industries: [industries.sheetMetal._id, industries.hvac._id],
    caseStudies: [caseStudies.cs2._id],
  });
  console.log("  Solutions linked");

  console.log("\n✓ Seed complete. Re-run anytime to refresh content.");
  await mongoose.disconnect();
  console.log("✓ Disconnected");
}

main().catch(async (err) => {
  console.error("\n✗ Seed failed:");
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
