import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { created, ok, fail } from "../utils/apiResponse.js";
import { signToken } from "../services/auth.service.js";
import { env } from "../config/env.js";
import { computePermissionsFromRole } from "../config/permissions.js";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.COOKIE_SECURE, // set true behind HTTPS
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  path: "/",
};

// Standardized user payload for /login, /register, /me. Includes resolved
// permissions so the frontend can gate UI without an extra round trip.
async function buildUserPayload(userId) {
  const user = await User.findById(userId).populate("role").lean();
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    isOwner: !!user.isOwner,
    role: user.role
      ? { id: String(user.role._id), name: user.role.name }
      : null,
    permissions: user.isOwner ? null : computePermissionsFromRole(user.role),
  };
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user) return fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");

  const okPass = await user.verifyPassword(password);
  if (!okPass) return fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user);
  res.cookie("token", token, cookieOptions);
  const payload = await buildUserPayload(user._id);
  return created(res, { token, user: payload });
});

export const registerOwner = asyncHandler(async (req, res) => {
  // Safety: only allow if there are no users yet, OR a bootstrap key matches.
  const hasAnyUser = await User.exists({});
  const keyOk = !!env.OWNER_BOOTSTRAP_KEY && req.body.bootstrapKey === env.OWNER_BOOTSTRAP_KEY;

  if (hasAnyUser && !keyOk) {
    return fail(res, 403, "REGISTRATION_DISABLED", "Owner registration is disabled");
  }

  const email = req.body.email.toLowerCase();
  const exists = await User.findOne({ email }).select("_id").lean();
  if (exists) return fail(res, 409, "EMAIL_EXISTS", "Email already exists");

  const passwordHash = await User.hashPassword(req.body.password);
  const user = await User.create({
    email,
    passwordHash,
    name: req.body.name ?? "Owner",
    isOwner: true,
  });

  const token = signToken(user);
  res.cookie("token", token, cookieOptions);
  const payload = await buildUserPayload(user._id);
  return created(res, { token, user: payload });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie("token", cookieOptions);
  return ok(res, { loggedOut: true });
});

export const me = asyncHandler(async (req, res) => {
  const payload = await buildUserPayload(req.user.sub);
  if (!payload) return fail(res, 401, "UNAUTHORIZED", "User not found");
  return ok(res, { user: payload });
});
