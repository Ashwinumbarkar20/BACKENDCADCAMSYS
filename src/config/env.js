import dotenv from "dotenv";

dotenv.config();

const NODE_ENV = process.env.NODE_ENV ?? "development";
const isProd = NODE_ENV === "production";

function requireInProd(name, value) {
  if (isProd && (!value || value === "dev_change_me")) {
    throw new Error(`${name} must be set to a strong value in production`);
  }
  return value;
}

export const env = {
  NODE_ENV,
  PORT: Number(process.env.PORT ?? 4000),

  MONGODB_URI: process.env.MONGODB_URI ?? "",

  JWT_SECRET: requireInProd("JWT_SECRET", process.env.JWT_SECRET ?? "dev_change_me"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",

  PUBLIC_ORIGINS: (process.env.PUBLIC_ORIGINS ?? "http://localhost:3000,http://localhost:3001,http://localhost:5173,https://cadcamsys.com,https://www.cadcamsys.com,https://api.cadcamsys.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  ADMIN_ORIGINS: (process.env.ADMIN_ORIGINS ?? "http://localhost:3000,http://localhost:3001,http://localhost:5173,https://admin.cadcamsys.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  ALLOW_ANY_ORIGIN_IN_DEV: (process.env.ALLOW_ANY_ORIGIN_IN_DEV ?? "true") === "true",
  ENFORCE_ADMIN_ORIGIN_IN_PROD: (process.env.ENFORCE_ADMIN_ORIGIN_IN_PROD ?? "true") === "true",

  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN ?? "",
  COOKIE_SECURE: (process.env.COOKIE_SECURE ?? "false") === "true",

  OWNER_BOOTSTRAP_KEY: process.env.OWNER_BOOTSTRAP_KEY ?? "",

  UPLOAD_DIR: process.env.UPLOAD_DIR ?? "uploads",
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? `http://localhost:${Number(process.env.PORT ?? 4000)}`,

  MAX_UPLOAD_MB: Number(process.env.MAX_UPLOAD_MB ?? 10),

  TRACKING_SALT: requireInProd("TRACKING_SALT", process.env.TRACKING_SALT ?? "dev_change_me"),
  TRACKING_COOKIE_DAYS: Number(process.env.TRACKING_COOKIE_DAYS ?? 365),
};
