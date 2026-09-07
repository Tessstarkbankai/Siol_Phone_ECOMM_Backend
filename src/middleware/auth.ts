import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { User } from "../models/User";
import { Vendor } from "../models/Vendor";
import { asyncHandler } from "../utils/asyncHandler";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const { userId } = getAuth(req);

  if (!userId) {
    return next(
      new AppError(401, "User is not logged in. Means unauth user! !"),
    );
  }

  next();
}

export async function getDbUserFromReq(req: Request) {
  const { userId } = getAuth(req);

  if (!userId) {
    throw new AppError(401, "User is not logged in. Means unauth user! !");
  }

  const dbUser = await User.findOne({ clerkUserId: userId });
  if (!dbUser) {
    throw new AppError(404, "User is not found in the DB");
  }

  return dbUser;
}

// admin gate
//user logged in user + admin access

export const requireAdmin = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const extractCurrentDbUser = await getDbUserFromReq(req);

    if (extractCurrentDbUser.role !== "admin") {
      throw new AppError(403, "Admin access only");
    }

    next();
  },
);

// vendor gate
export async function getVendorFromReq(req: Request) {
  const dbUser = await getDbUserFromReq(req);
  const vendor = await Vendor.findOne({ user: dbUser._id });
  if (!vendor) {
    throw new AppError(404, "Vendor profile not found");
  }
  return vendor;
}

export const requireVendor = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const dbUser = await getDbUserFromReq(req);

    if (dbUser.role === "admin") {
      (req as any).dbUser = dbUser;
      const vendor = await Vendor.findOne({ user: dbUser._id });
      if (vendor) {
        (req as any).vendor = vendor;
      }
      return next();
    }

    if (dbUser.role !== "vendor") {
      throw new AppError(
        403,
        "Vendor access only. Please apply to become a seller.",
      );
    }

    const vendor = await Vendor.findOne({ user: dbUser._id });
    if (!vendor) {
      throw new AppError(404, "Vendor profile not found");
    }

    if (vendor.status !== "approved") {
      throw new AppError(
        403,
        `Vendor account is ${vendor.status}. Dashboard access is restricted until approved.`,
      );
    }

    (req as any).dbUser = dbUser;
    (req as any).vendor = vendor;
    next();
  },
);
