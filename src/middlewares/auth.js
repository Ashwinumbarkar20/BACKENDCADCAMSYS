import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { fail } from "../utils/apiResponse.js";

export function requireAuth(req, res, next) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice("Bearer ".length)
    : undefined;
  const token = req.cookies?.token ?? bearer;

  if (!token) return fail(res, 401, "UNAUTHORIZED", "Missing auth token");

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return fail(res, 401, "UNAUTHORIZED", "Invalid or expired token");
  }
}

