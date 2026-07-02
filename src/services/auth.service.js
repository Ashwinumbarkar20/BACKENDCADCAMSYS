import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email, isOwner: !!user.isOwner },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

