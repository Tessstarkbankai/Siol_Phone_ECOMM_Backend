import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { fail } from "../utils/envelope";
import mongoose from "mongoose";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(fail(err.message, "APP_ERROR"));
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    const message = `Invalid ${err.path}: ${err.value}`;
    console.error("CastError:", message);
    return res.status(400).json(fail(message, "VALIDATION_ERROR"));
  }

  // Handle Mongoose ValidationError
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    const message = messages.join(", ");
    console.error("ValidationError:", message);
    return res.status(400).json(fail(message, "VALIDATION_ERROR"));
  }

  // Handle MongoDB duplicate key error
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: number }).code === 11000
  ) {
    console.error("DuplicateKeyError:", err);
    return res
      .status(409)
      .json(fail("Duplicate entry, resource already exists", "DUPLICATE_KEY"));
  }

  console.error("Unhandled error:", err);

  return res.status(500).json(fail("Internal server error", "INTERNAL"));
}
