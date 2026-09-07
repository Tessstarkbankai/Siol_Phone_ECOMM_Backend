import { Router, type Request, type Response } from "express";
import { requireAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Product, type ProductApprovalStatus } from "../../models/Product";
import { ok } from "../../utils/envelope";
import { requireFound, requireText } from "../../utils/helpers";
import { AppError } from "../../utils/AppError";

export const adminProductModerationRouter = Router();

adminProductModerationRouter.use(requireAdmin);

// Get moderation queue (vendor submitted products)
adminProductModerationRouter.get(
  "/products/moderation",
  asyncHandler(async (req: Request, res: Response) => {
    const status = (String(req.query.status || "pending").trim()) as ProductApprovalStatus;
    const search = String(req.query.search || "").trim();

    const query: Record<string, unknown> = {
      vendor: { $ne: null },
    };

    if (["pending", "approved", "rejected"].includes(status)) {
      query.approvalStatus = status;
    }

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const [products, pendingCount, approvedCount, rejectedCount] =
      await Promise.all([
        Product.find(query)
          .populate("category", "name")
          .populate("vendor", "storeName storeSlug rating businessEmail")
          .sort({ createdAt: -1 }),
        Product.countDocuments({ vendor: { $ne: null }, approvalStatus: "pending" }),
        Product.countDocuments({ vendor: { $ne: null }, approvalStatus: "approved" }),
        Product.countDocuments({ vendor: { $ne: null }, approvalStatus: "rejected" }),
      ]);

    res.json(
      ok({
        products,
        counts: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
        },
      }),
    );
  }),
);

// Approve or reject a product
adminProductModerationRouter.patch(
  "/products/:id/moderation",
  asyncHandler(async (req: Request, res: Response) => {
    const productId = req.params.id as string;
    const approvalStatus = String(
      req.body.approvalStatus || "",
    ).trim() as ProductApprovalStatus;
    const rejectionReason = String(req.body.rejectionReason || "").trim();

    if (!["approved", "rejected"].includes(approvalStatus)) {
      throw new AppError(400, "Approval status must be 'approved' or 'rejected'");
    }

    if (approvalStatus === "rejected") {
      requireText(rejectionReason, "Rejection reason is required");
    }

    const product = await Product.findById(productId);
    const foundProduct = requireFound(product, "Product not found", 404);

    foundProduct.approvalStatus = approvalStatus;
    if (approvalStatus === "rejected") {
      foundProduct.rejectionReason = rejectionReason;
    } else {
      foundProduct.rejectionReason = "";
    }

    await foundProduct.save();

    const updatedProduct = await Product.findById(foundProduct._id)
      .populate("category", "name")
      .populate("vendor", "storeName storeSlug rating businessEmail");

    res.json(
      ok({
        message: `Product ${approvalStatus} successfully`,
        product: updatedProduct,
      }),
    );
  }),
);
