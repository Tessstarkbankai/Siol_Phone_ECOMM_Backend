import { Router, type Request, type Response } from "express";
import mongoose from "mongoose";
import { getDbUserFromReq, requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Review } from "../../models/Review";
import { Product } from "../../models/Product";
import { Order } from "../../models/Order";
import { Vendor } from "../../models/Vendor";
import { ok } from "../../utils/envelope";
import { requireFound, requireNumber, requireText } from "../../utils/helpers";
import { AppError } from "../../utils/AppError";

export const customerReviewRouter = Router();

// GET reviews and rating breakdown for a product (public)
customerReviewRouter.get(
  "/products/:productId/reviews",
  asyncHandler(async (req: Request, res: Response) => {
    const productId = req.params.productId;

    if (!mongoose.isValidObjectId(productId)) {
      throw new AppError(400, "Invalid product id");
    }

    const reviews = await Review.find({ product: productId })
      .sort({ createdAt: -1 })
      .lean();

    const totalReviews = reviews.length;
    let averageRating = 0;
    const breakdown = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    if (totalReviews > 0) {
      let sum = 0;
      for (const rev of reviews) {
        sum += rev.rating;
        const rounded = Math.min(5, Math.max(1, Math.round(rev.rating))) as 1 | 2 | 3 | 4 | 5;
        breakdown[rounded] = (breakdown[rounded] || 0) + 1;
      }
      averageRating = Number((sum / totalReviews).toFixed(1));
    }

    res.json(
      ok({
        reviews,
        stats: {
          averageRating,
          totalReviews,
          breakdown,
        },
      }),
    );
  }),
);

// POST create or update a review (authenticated)
customerReviewRouter.post(
  "/products/:productId/reviews",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const productId = req.params.productId;

    if (!mongoose.isValidObjectId(productId)) {
      throw new AppError(400, "Invalid product id");
    }

    const product = await Product.findById(productId);
    const foundProduct = requireFound(product, "Product not found", 404);

    const dbUser = await getDbUserFromReq(req);
    const rating = Number(req.body.rating);
    requireNumber(rating, "Rating is required and must be between 1 and 5");
    if (rating < 1 || rating > 5) {
      throw new AppError(400, "Rating must be between 1 and 5 stars");
    }

    const comment = String(req.body.comment || "").trim();
    requireText(comment, "Review comment is required");

    const title = String(req.body.title || "").trim();

    // Check if user has purchased this product
    const pastOrder = await Order.findOne({
      user: dbUser._id,
      "items.product": foundProduct._id,
    });
    const isVerifiedPurchase = Boolean(pastOrder);

    // Save or update review
    const review = await Review.findOneAndUpdate(
      {
        product: foundProduct._id,
        user: dbUser._id,
      },
      {
        product: foundProduct._id,
        user: dbUser._id,
        userName: dbUser.name || "Customer",
        userEmail: dbUser.email,
        rating,
        title,
        comment,
        isVerifiedPurchase,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Recalculate product rating
    const allProductReviews = await Review.find({ product: foundProduct._id });
    const count = allProductReviews.length;
    const avg =
      count > 0
        ? Number(
            (
              allProductReviews.reduce((sum, r) => sum + r.rating, 0) / count
            ).toFixed(1),
          )
        : 0;

    foundProduct.rating = avg;
    foundProduct.reviewCount = count;
    await foundProduct.save();

    // If product belongs to a vendor, update vendor rating
    if (foundProduct.vendor) {
      const vendorProducts = await Product.find({ vendor: foundProduct.vendor }).select("_id");
      const vendorProdIds = vendorProducts.map((p) => p._id);
      const allVendorReviews = await Review.find({ product: { $in: vendorProdIds } });
      if (allVendorReviews.length > 0) {
        const vendorAvg = Number(
          (
            allVendorReviews.reduce((sum, r) => sum + r.rating, 0) /
            allVendorReviews.length
          ).toFixed(1),
        );
        await Vendor.findByIdAndUpdate(foundProduct.vendor, { rating: vendorAvg });
      }
    }

    res.json(
      ok({
        message: "Review submitted successfully! Thank you for your feedback.",
        review,
      }),
    );
  }),
);
