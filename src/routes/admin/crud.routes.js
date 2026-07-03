import { Router } from "express";
import { createCrudControllers } from "../../controllers/crud.controller.js";
import { validate } from "../../middlewares/validate.js";
import { objectIdParam } from "../../validations/common.js";
import {
  Page,
  Solution,
  ProductCategory,
  Product,
  Industry,
  Blog,
  CaseStudy,
  Testimonial,
  Tutorial,
  TeamMember,
  Career,
  News,
  ContactSubmission,
  ConsultationBooking,
  SupportRequest,
  NewsletterSubscriber,
  ROIRequest,
  JobApplication,
  PdfDownloadRequest,
} from "../../models/index.js";
import {
  syncProductSolutionLink,
  syncSolutionProductsLink,
  syncProductToSolution,
} from "../../services/productSolutionSync.js";
import {
  createUserAdmin,
  listUsersAdmin,
  getUserAdmin,
  updateUserAdmin,
  deleteUserAdmin,
} from "../../controllers/admin/users.controller.js";
import {
  listVisitors,
  getVisitor,
  updateVisitor,
  deleteVisitor,
  visitorStats,
} from "../../controllers/admin/visitors.controller.js";
import {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  permissionsMeta,
} from "../../controllers/admin/roles.controller.js";
import {
  requireOwner,
  requirePermission,
  requirePublishIfStatusChanging,
} from "../../middlewares/permissions.js";

function mountCrud(router, resource, Model, options = {}) {
  const ctl = createCrudControllers(Model, options);
  const base = `/${resource}`;
  const idValidator = validate({ params: objectIdParam });
  const permKey = options.permissionKey || resource;

  router.get(base, requirePermission(permKey, "view"), ctl.list);
  router.post(base, requirePermission(permKey, "create"), ctl.createOne);
  router.get(`${base}/:id`, requirePermission(permKey, "view"), idValidator, ctl.getOne);
  router.put(
    `${base}/:id`,
    requirePermission(permKey, "edit"),
    requirePublishIfStatusChanging(Model, permKey),
    idValidator,
    ctl.updateOne,
  );
  router.delete(
    `${base}/:id`,
    requirePermission(permKey, "delete"),
    idValidator,
    ctl.removeOne,
  );
}

export const adminCrudRouter = Router();

mountCrud(adminCrudRouter, "pages", Page);
mountCrud(adminCrudRouter, "solutions", Solution, {
  populate: [
    { path: "coverImage" },
    { path: "products" },
    { path: "industries" },
    { path: "blogs" },
    { path: "caseStudies" },
    { path: "testimonials" },
  ],
  afterCreate: async (doc) => syncSolutionProductsLink(doc._id, doc.products),
  afterUpdate: async (doc) => syncSolutionProductsLink(doc._id, doc.products),
});
mountCrud(adminCrudRouter, "product-categories", ProductCategory);
mountCrud(adminCrudRouter, "products", Product, {
  populate: [
    { path: "category" },
    { path: "solution" },
    { path: "keyFeatures.image" },
    { path: "supportingMachine.images" },
    { path: "relatedIndustries" },
    { path: "relatedBlogs" },
    { path: "relatedTestimonials" },
    { path: "relatedCaseStudies" },
    { path: "mediaSection.pdfs.file" },
  ],
  afterCreate: async (doc) => syncProductSolutionLink(doc._id, doc.solution),
  afterUpdate: async (doc) => syncProductSolutionLink(doc._id, doc.solution),
  beforeDelete: async (id) => syncProductToSolution(id, null),
});
mountCrud(adminCrudRouter, "industries", Industry, {
  populate: [{ path: "coverImage" }, { path: "pdfs.file" }],
});
mountCrud(adminCrudRouter, "blogs", Blog, {
  populate: [
    { path: "images" },
    { path: "sections.detailSections.images" },
  ],
});
mountCrud(adminCrudRouter, "case-studies", CaseStudy, { populate: [{ path: "customerLogo" }, { path: "industry" }] });
mountCrud(adminCrudRouter, "testimonials", Testimonial, { populate: [{ path: "photo" }, { path: "logo" }] });
mountCrud(adminCrudRouter, "tutorials", Tutorial, { populate: [{ path: "featuredImage" }] });
mountCrud(adminCrudRouter, "team-members", TeamMember, { populate: [{ path: "photo" }] });
mountCrud(adminCrudRouter, "careers", Career);
mountCrud(adminCrudRouter, "news", News, { populate: [{ path: "coverImage" }] });

// Visitors — gated as the single "visitors" resource. Explicit handlers
// because the controller is custom (notes-editable, full delete for GDPR).
const idValidator = validate({ params: objectIdParam });
adminCrudRouter.get("/leads/visitors/stats", requirePermission("visitors", "view"), visitorStats);
adminCrudRouter.get("/leads/visitors", requirePermission("visitors", "view"), listVisitors);
adminCrudRouter.get("/leads/visitors/:id", requirePermission("visitors", "view"), idValidator, getVisitor);
adminCrudRouter.put("/leads/visitors/:id", requirePermission("visitors", "edit"), idValidator, updateVisitor);
adminCrudRouter.delete("/leads/visitors/:id", requirePermission("visitors", "delete"), idValidator, deleteVisitor);

// Form submissions — all gated under the "leads" permission bucket.
mountCrud(adminCrudRouter, "leads/contact-submissions", ContactSubmission, { permissionKey: "leads" });
mountCrud(adminCrudRouter, "leads/consultation-bookings", ConsultationBooking, { permissionKey: "leads" });
mountCrud(adminCrudRouter, "leads/support-requests", SupportRequest, { permissionKey: "leads" });
mountCrud(adminCrudRouter, "leads/newsletter-subscribers", NewsletterSubscriber, { permissionKey: "leads" });
mountCrud(adminCrudRouter, "leads/roi-requests", ROIRequest, { permissionKey: "leads" });
mountCrud(adminCrudRouter, "leads/job-applications", JobApplication, { permissionKey: "leads" });
mountCrud(adminCrudRouter, "leads/pdf-downloads", PdfDownloadRequest, { permissionKey: "leads" });

// Users — assignable via role. The controller adds anti-escalation guards
// (non-owners cannot grant isOwner, cannot edit/delete existing owner accounts).
adminCrudRouter.get("/users", requirePermission("users", "view"), listUsersAdmin);
adminCrudRouter.post("/users", requirePermission("users", "create"), createUserAdmin);
adminCrudRouter.get("/users/:id", requirePermission("users", "view"), idValidator, getUserAdmin);
adminCrudRouter.put("/users/:id", requirePermission("users", "edit"), idValidator, updateUserAdmin);
adminCrudRouter.delete("/users/:id", requirePermission("users", "delete"), idValidator, deleteUserAdmin);

// Roles — owner only.
adminCrudRouter.get("/roles/permissions-meta", requireOwner, permissionsMeta);
adminCrudRouter.get("/roles", requireOwner, listRoles);
adminCrudRouter.post("/roles", requireOwner, createRole);
adminCrudRouter.get("/roles/:id", requireOwner, idValidator, getRole);
adminCrudRouter.put("/roles/:id", requireOwner, idValidator, updateRole);
adminCrudRouter.delete("/roles/:id", requireOwner, idValidator, deleteRole);
