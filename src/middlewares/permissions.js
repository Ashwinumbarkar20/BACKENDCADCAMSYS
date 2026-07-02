import { User } from "../models/User.js";
import { hasPermission, computePermissionsFromRole } from "../config/permissions.js";
import { fail } from "../utils/apiResponse.js";

// Hydrates req.fullUser with { isOwner, role, permissions } from the database.
// Must run after `requireAuth` (which populates req.user from the JWT).
// Subsequent permission middleware reads req.fullUser without re-querying.
export async function loadUserPermissions(req, res, next) {
  if (!req.user?.sub) return fail(res, 401, "UNAUTHORIZED", "Missing user");
  try {
    const user = await User.findById(req.user.sub).populate("role").lean();
    if (!user) return fail(res, 401, "UNAUTHORIZED", "User not found");
    req.fullUser = {
      _id: String(user._id),
      email: user.email,
      name: user.name,
      isOwner: !!user.isOwner,
      role: user.role
        ? { _id: String(user.role._id), name: user.role.name }
        : null,
      permissions: user.isOwner ? null : computePermissionsFromRole(user.role),
    };
    return next();
  } catch (e) {
    return fail(res, 500, "INTERNAL", e.message);
  }
}

export function requireOwner(req, res, next) {
  if (!req.fullUser?.isOwner) {
    return fail(res, 403, "FORBIDDEN", "Owner access required");
  }
  return next();
}

export function requirePermission(resource, action) {
  return (req, res, next) => {
    if (!hasPermission(req.fullUser, resource, action)) {
      return fail(res, 403, "FORBIDDEN", `Missing permission: ${action} on ${resource}`);
    }
    return next();
  };
}

// For PUT routes where a `status` change requires the `publish` action while
// other field edits only need `edit`. Loads the existing document's status and
// gates on the diff.
export function requirePublishIfStatusChanging(Model, resource) {
  return async (req, res, next) => {
    if (!req.body || typeof req.body.status === "undefined") return next();
    if (req.fullUser?.isOwner) return next();
    try {
      const existing = await Model.findById(req.params.id).select("status").lean();
      if (!existing) return next(); // 404 will surface in the handler
      if (existing.status === req.body.status) return next();
      if (!hasPermission(req.fullUser, resource, "publish")) {
        return fail(res, 403, "FORBIDDEN", `Missing permission: publish on ${resource}`);
      }
      return next();
    } catch (e) {
      return fail(res, 500, "INTERNAL", e.message);
    }
  };
}
