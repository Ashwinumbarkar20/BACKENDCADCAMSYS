import { z } from "zod";
import mongoose from "mongoose";
import { User } from "../../models/User.js";
import { Role } from "../../models/Role.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok, created, fail } from "../../utils/apiResponse.js";

const objectIdString = z
  .string()
  .refine((v) => mongoose.Types.ObjectId.isValid(v), "Invalid id");

const createBody = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).optional(),
    isOwner: z.boolean().optional(),
    role: objectIdString.nullable().optional(),
  })
  .refine((v) => v.isOwner || v.role, {
    message: "Either isOwner must be true or a role must be assigned",
    path: ["role"],
  });

const updateBody = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).optional(),
  isOwner: z.boolean().optional(),
  role: objectIdString.nullable().optional(),
});

function shape(user) {
  return {
    _id: user._id,
    id: user._id,
    email: user.email,
    name: user.name,
    isOwner: !!user.isOwner,
    role: user.role || null,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function validateRoleId(id) {
  if (!id) return null;
  const role = await Role.findById(id).select("_id").lean();
  return role ? id : false;
}

export const listUsersAdmin = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find({})
      .select("-passwordHash")
      .populate({ path: "role", select: "name" })
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({}),
  ]);
  return ok(res, items.map(shape), { page, limit, total });
});

export const createUserAdmin = asyncHandler(async (req, res) => {
  const body = createBody.parse(req.body);

  // Anti-escalation: only owners can mint other owners.
  if (body.isOwner && !req.fullUser?.isOwner) {
    return fail(res, 403, "FORBIDDEN", "Only an owner can create another owner");
  }

  const email = body.email.toLowerCase();
  const exists = await User.findOne({ email }).select("_id").lean();
  if (exists) return fail(res, 409, "EMAIL_EXISTS", "Email already exists");

  if (body.role) {
    const valid = await validateRoleId(body.role);
    if (!valid) return fail(res, 400, "INVALID_ROLE", "Role not found");
  }

  const passwordHash = await User.hashPassword(body.password);
  const user = await User.create({
    email,
    passwordHash,
    name: body.name ?? "Team member",
    isOwner: !!body.isOwner,
    role: body.isOwner ? null : body.role ?? null,
  });
  return created(res, shape(user));
});

export const getUserAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("-passwordHash")
    .populate({ path: "role", select: "name" })
    .lean();
  if (!user) return fail(res, 404, "NOT_FOUND", "User not found");
  return ok(res, shape(user));
});

export const updateUserAdmin = asyncHandler(async (req, res) => {
  const body = updateBody.parse(req.body);
  const target = await User.findById(req.params.id);
  if (!target) return fail(res, 404, "NOT_FOUND", "User not found");

  // Anti-escalation: only owners can edit existing owner accounts or grant
  // owner status. This prevents a user with users:edit from giving themselves
  // (or anyone else) full access.
  if (!req.fullUser?.isOwner) {
    if (target.isOwner) {
      return fail(res, 403, "FORBIDDEN", "Only an owner can edit an owner account");
    }
    if (body.isOwner === true) {
      return fail(res, 403, "FORBIDDEN", "Only an owner can grant owner status");
    }
  }

  // Last-owner protection: prevent demoting the only remaining owner.
  if (target.isOwner && body.isOwner === false) {
    const ownerCount = await User.countDocuments({ isOwner: true });
    if (ownerCount <= 1) {
      return fail(res, 400, "LAST_OWNER", "Cannot remove owner status from the last owner");
    }
  }

  if (body.role !== undefined && body.role !== null) {
    const valid = await validateRoleId(body.role);
    if (!valid) return fail(res, 400, "INVALID_ROLE", "Role not found");
  }

  if (body.email) target.email = body.email.toLowerCase();
  if (body.name !== undefined) target.name = body.name;
  if (body.isOwner !== undefined) target.isOwner = body.isOwner;
  if (body.role !== undefined) target.role = body.isOwner ? null : body.role;
  if (body.password) target.passwordHash = await User.hashPassword(body.password);

  await target.save();
  const populated = await target.populate({ path: "role", select: "name" });
  return ok(res, shape(populated.toObject()));
});

export const deleteUserAdmin = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id).select("isOwner").lean();
  if (!target) return fail(res, 404, "NOT_FOUND", "User not found");

  // Anti-escalation: non-owners cannot delete owner accounts.
  if (target.isOwner && !req.fullUser?.isOwner) {
    return fail(res, 403, "FORBIDDEN", "Only an owner can delete an owner account");
  }

  if (target.isOwner) {
    const count = await User.countDocuments({ isOwner: true });
    if (count <= 1) {
      return fail(res, 400, "LAST_OWNER", "Cannot delete the last owner account");
    }
  }
  if (String(target._id) === req.fullUser?._id) {
    return fail(res, 400, "SELF_DELETE", "You cannot delete your own account");
  }
  await User.findByIdAndDelete(req.params.id);
  return ok(res, { deleted: true });
});
