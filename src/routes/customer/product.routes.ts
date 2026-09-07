import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler";
import { Category } from "../../models/Category";
import { ok } from "../../utils/envelope";
import { Product } from "../../models/Product";
import { Vendor } from "../../models/Vendor";
import { requireFound } from "../../utils/helpers";
import { AppError } from "../../utils/AppError";

export const customerProductRouter = Router();

type ProductSort = "recent" | "price-low" | "price-high";

type ProductAppliedFilterListQuery = {
  category?: string;
  brand?: string;
  color?: string;
  size?: string;
  sort?: ProductSort;
  search?: string;
  vendor?: string;
};

customerProductRouter.get(
  "/categories",

  asyncHandler(async (_req: Request, res: Response) => {
    const categories = await Category.find({}).sort({ name: 1 });

    res.json(ok(categories));
  }),
);

customerProductRouter.get(
  "/products",

  asyncHandler(
    async (
      req: Request<{}, {}, {}, ProductAppliedFilterListQuery>,
      res: Response,
    ) => {
      const category = (req.query.category || "").trim();
      const brand = (req.query.brand || "").trim();
      const color = (req.query.color || "").trim();
      const size = (req.query.size || "").trim();
      const search = (req.query.search || "").trim();
      const vendorSlugOrId = (req.query.vendor || "").trim();
      const sort: ProductSort = req.query.sort || "recent";

      // Query only approved vendors
      const approvedVendors = await Vendor.find({ status: "approved" }).select(
        "_id storeSlug",
      );
      const approvedVendorIds = approvedVendors.map((v) => v._id);

      const query: Record<string, unknown> = {
        status: "active",
      };

      if (vendorSlugOrId) {
        const specificVendor = approvedVendors.find(
          (v) =>
            String(v._id) === vendorSlugOrId || v.storeSlug === vendorSlugOrId,
        );
        if (specificVendor) {
          query.vendor = specificVendor._id;
          query.approvalStatus = "approved";
        } else {
          // If requested vendor is not approved or not found, return empty
          res.json(ok([]));
          return;
        }
      } else {
        // Products must either be platform-owned (vendor: null) OR from an approved vendor
        query.$or = [
          { vendor: null },
          { vendor: { $exists: false } },
          { vendor: { $in: approvedVendorIds }, approvalStatus: "approved" },
          { approvalStatus: { $exists: false } },
        ];
      }

      if (category) {
        query.category = category;
      }
      if (brand) {
        query.brand = brand;
      }
      if (color) {
        query.colors = color;
      }
      if (size) {
        query.sizes = size;
      }
      if (search) {
        const searchConditions = [
          { title: { $regex: search, $options: "i" } },
          { brand: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: searchConditions }];
          delete query.$or;
        } else {
          query.$or = searchConditions;
        }
      }

      let sortOption: Record<string, 1 | -1> = { createdAt: -1 };

      if (sort === "price-low") {
        sortOption = { price: 1 };
      }

      if (sort === "price-high") {
        sortOption = { price: -1 };
      }

      const products = await Product.find(query)
        .populate("category", "name")
        .populate("vendor", "storeName storeSlug rating")
        .sort(sortOption);

      res.json(ok(products));
    },
  ),
);

customerProductRouter.get(
  "/products/:id",

  asyncHandler(async (req: Request, res: Response) => {
    const productId = req.params.id;

    if (!mongoose.isValidObjectId(productId)) {
      throw new AppError(404, "Product not found");
    }

    const product = await Product.findOne({
      _id: productId,
      status: "active",
      $or: [
        { approvalStatus: "approved" },
        { approvalStatus: { $exists: false } },
        { vendor: null },
        { vendor: { $exists: false } },
      ],
    })
      .populate("category", "name")
      .populate("vendor", "storeName storeSlug rating description status");

    const foundProduct = requireFound(product, "Product not found", 404);

    // If product has a vendor, verify vendor is approved
    if (foundProduct.vendor && (foundProduct.vendor as any).status && (foundProduct.vendor as any).status !== "approved") {
      throw new AppError(404, "Product is currently unavailable");
    }

    const relatedProducts = await Product.find({
      _id: { $ne: foundProduct._id },
      category: foundProduct.category,
      status: "active",
      $or: [
        { approvalStatus: "approved" },
        { approvalStatus: { $exists: false } },
        { vendor: null },
        { vendor: { $exists: false } },
      ],
    })
      .populate("category", "name")
      .populate("vendor", "storeName storeSlug rating")
      .sort({ createdAt: -1 })
      .limit(4);

    res.json(
      ok({
        product: foundProduct,
        relatedProducts,
      }),
    );
  }),
);
