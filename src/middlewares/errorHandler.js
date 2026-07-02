import mongoose from "mongoose";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { fail } from "../utils/apiResponse.js";
import { firstMongooseErrorMessage } from "../utils/sanitizePayload.js";

export function notFound(req, res) {
  return fail(res, 404, "NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl}`);
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid request", err.flatten());
  }

  if (err?.name === "MulterError") {
    return fail(res, 400, "UPLOAD_ERROR", err.message);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const detailMsg = firstMongooseErrorMessage(err.errors) || "Invalid data";
    return fail(res, 400, "MONGOOSE_VALIDATION_ERROR", detailMsg, err.errors);
  }

  if (err instanceof mongoose.Error.CastError) {
    return fail(res, 400, "MONGOOSE_CAST_ERROR", "Invalid id", { path: err.path, value: err.value });
  }

  const status = Number(err?.statusCode ?? err?.status ?? 500);
  const code = err?.code ?? "INTERNAL_ERROR";
  const message =
    env.NODE_ENV === "production" ? "Something went wrong" : err?.message ?? "Unknown error";

  if (env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  return fail(res, status, code, message);
}

