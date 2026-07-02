import cors from "cors";
import { env } from "../config/env.js";

function isAllowed(origin, allowlist) {
  if (!origin) return true; // non-browser clients (curl, server-to-server)
  return allowlist.includes(origin);
}

export function publicCors() {
  return cors({
    origin(origin, cb) {
      if (env.NODE_ENV !== "production" && env.ALLOW_ANY_ORIGIN_IN_DEV) return cb(null, true);
      return cb(null, isAllowed(origin, env.PUBLIC_ORIGINS));
    },
    credentials: true,
  });
}

export function adminCors() {
  return cors({
    origin(origin, cb) {
      if (env.NODE_ENV !== "production" && env.ALLOW_ANY_ORIGIN_IN_DEV) return cb(null, true);
      return cb(null, isAllowed(origin, env.ADMIN_ORIGINS));
    },
    credentials: true,
  });
}

