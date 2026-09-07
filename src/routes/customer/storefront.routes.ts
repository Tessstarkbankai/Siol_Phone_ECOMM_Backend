import { Router, type Request, type Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { Vendor } from "../../models/Vendor";
import { Product } from "../../models/Product";
import { ok } from "../../utils/envelope";
import { requireFound } from "../../utils/helpers";

export const customerStorefrontRouter = Router();

// Public storefront page by storeSlug
customerStorefrontRouter.get(
  "/store/:slug",
  asyncHandler(async (req: Request, res: Response) => {
    const slug = String(req.params.slug || "").trim().toLowerCase();

    const vendor = await Vendor.findOne({
      storeSlug: slug,
      status: "approved", // Only approved vendors have public storefronts
    }).select(
      "storeName storeSlug storeLogo storeBanner description rating totalSales isFeatured",
    );

    const foundVendor = requireFound(
      vendor,
      "Store not found or currently unavailable",
      404,
    );

    const products = await Product.find({
      vendor: foundVendor._id,
      status: "active",
      approvalStatus: "approved",
    })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json(
      ok({
        vendor: foundVendor,
        products,
      }),
    );
  }),
);
