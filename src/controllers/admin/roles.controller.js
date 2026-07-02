import { z } from "zod";
import { Role } from "../../models/Role.js";
import { User } from "../../models/User.js";
import { ASSIGNABLE_RESOURCES, ACTIONS } from "../../config/permissions.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, created, fail } from "../../utils/apiResponse.js";

const RESOURCE_KEYS = new Set(ASSIGNABLE_RESOURCES.map((r) => r.key));

const permissionEntry = z.object({
  resource: z.string().refine((v) => RESOURCE_KEYS.has(v), "Unknown resource"),
  actions: z
    .object({
      view: z.boolean().optional(),
      create: z.boolean().optional(),
      edit: z.boolean().optional(),
      delete: z.boolean().optional(),
      publish: z.boolean().optional(),
    })
    .optional(),
});

const createBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(permissionEntry).optional(),
});

const updateBody = createBody.partial();

export const listRoles = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Role.find({}).sort("name").skip(skip).limit(limit).lean(),
    Role.countDocuments({}),
  ]);
  return ok(res, items, { page, limit, total });
});

export const getRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id).lean();
  if (!role) return fail(res, 404, "NOT_FOUND", "Role not found");
  return ok(res, role);
});

export const createRole = asyncHandler(async (req, res) => {
  const body = createBody.parse(req.body);
  const exists = await Role.findOne({ name: body.name }).select("_id").lean();
  if (exists) return fail(res, 409, "NAME_EXISTS", "A role with this name already exists");
  const role = await Role.create(body);
  return created(res, role);
});

export const updateRole = asyncHandler(async (req, res) => {
  const body = updateBody.parse(req.body);
  if (body.name) {
    const dup = await Role.findOne({ name: body.name, _id: { $ne: req.params.id } })
      .select("_id")
      .lean();
    if (dup) return fail(res, 409, "NAME_EXISTS", "A role with this name already exists");
  }
  const role = await Role.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  }).lean();
  if (!role) return fail(res, 404, "NOT_FOUND", "Role not found");
  return ok(res, role);
});

export const deleteRole = asyncHandler(async (req, res) => {
  const usedBy = await User.countDocuments({ role: req.params.id });
  if (usedBy > 0) {
    return fail(
      res,
      400,
      "ROLE_IN_USE",
      `Role is assigned to ${usedBy} user(s). Reassign them first.`,
    );
  }
  const result = await Role.findByIdAndDelete(req.params.id);
  if (!result) return fail(res, 404, "NOT_FOUND", "Role not found");
  return ok(res, { deleted: true });
});

// Meta endpoint so the frontend can render the permission matrix UI without
// hardcoding the resource list.
export const permissionsMeta = asyncHandler(async (_req, res) => {
  return ok(res, { resources: ASSIGNABLE_RESOURCES, actions: ACTIONS });
});
