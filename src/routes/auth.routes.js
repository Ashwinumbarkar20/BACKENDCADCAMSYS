import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { login, logout, me, registerOwner } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { loginBody, registerBody } from "../validations/auth.validation.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip in dev — 10/15min is too tight when you're testing role/permission
  // flows with multiple logins.
  skip: () => env.NODE_ENV !== "production",
  message: { success: false, error: { code: "TOO_MANY_LOGINS", message: "Too many login attempts. Try again later." } },
});

authRouter.post("/register", validate({ body: registerBody }), registerOwner);
authRouter.post("/login", loginLimiter, validate({ body: loginBody }), login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
