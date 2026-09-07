import { Router, type Request, type Response } from "express";
import { requireAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Vendor, type VendorStatus } from "../../models/Vendor";
import { User } from "../../models/User";
import { Product } from "../../models/Product";
import { ok } from "../../utils/envelope";
import { requireFound, requireNumber, requireText } from "../../utils/helpers";
import { AppError } from "../../utils/AppError";
import { decryptText } from "../../utils/crypto";

export const adminVendorManageRouter = Router();

adminVendorManageRouter.use(requireAdmin);

const ALLOWED_STATUSES: VendorStatus[] = [
  "pending",
  "approved",
  "rejected",
  "suspended",
];

// List all vendors with status filter and search
adminVendorManageRouter.get(
  "/vendors",
  asyncHandler(async (req: Request, res: Response) => {
    const status = String(req.query.status || "").trim() as VendorStatus;
    const search = String(req.query.search || "").trim();

    const query: Record<string, unknown> = {};

    if (status && ALLOWED_STATUSES.includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { storeName: { $regex: search, $options: "i" } },
        { businessEmail: { $regex: search, $options: "i" } },
        { businessPhone: { $regex: search, $options: "i" } },
      ];
    }

    const vendors = await Vendor.find(query)
      .populate("user", "name email role points")
      .sort({ createdAt: -1 });

    const totalCount = await Vendor.countDocuments(query);
    const pendingCount = await Vendor.countDocuments({ status: "pending" });
    const approvedCount = await Vendor.countDocuments({ status: "approved" });
    const suspendedCount = await Vendor.countDocuments({ status: "suspended" });

    res.json(
      ok({
        vendors,
        counts: {
          total: totalCount,
          pending: pendingCount,
          approved: approvedCount,
          suspended: suspendedCount,
        },
      }),
    );
  }),
);

// Get single vendor details
adminVendorManageRouter.get(
  "/vendors/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.params.id as string;
    const vendor = await Vendor.findById(vendorId)
      .select("+bankDetails.accountNumberEncrypted")
      .populate("user", "name email role points");

    const foundVendor = requireFound(vendor, "Vendor not found", 404);

    let decryptedAccountNumber: string | undefined;
    if (
      req.query.revealBank === "true" &&
      foundVendor.bankDetails?.accountNumberEncrypted
    ) {
      decryptedAccountNumber = decryptText(
        foundVendor.bankDetails.accountNumberEncrypted,
      );
    }

    // Product count and sales summary
    const [productCount, pendingProductCount] = await Promise.all([
      Product.countDocuments({ vendor: foundVendor._id }),
      Product.countDocuments({
        vendor: foundVendor._id,
        approvalStatus: "pending",
      }),
    ]);

    res.json(
      ok({
        vendor: foundVendor,
        productCount,
        pendingProductCount,
        ...(decryptedAccountNumber
          ? { decryptedAccountNumber }
          : {}),
      }),
    );
  }),
);

// Approve, reject, or suspend a vendor
adminVendorManageRouter.patch(
  "/vendors/:id/status",
  asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.params.id as string;
    const nextStatus = String(req.body.status || "").trim() as VendorStatus;
    const rejectionReason = String(req.body.rejectionReason || "").trim();

    if (!ALLOWED_STATUSES.includes(nextStatus)) {
      throw new AppError(
        400,
        `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
      );
    }

    if (nextStatus === "rejected") {
      requireText(rejectionReason, "Rejection reason is required");
    }

    const vendor = await Vendor.findById(vendorId);
    const foundVendor = requireFound(vendor, "Vendor not found", 404);

    foundVendor.status = nextStatus;
    if (nextStatus === "rejected") {
      foundVendor.rejectionReason = rejectionReason;
    } else {
      foundVendor.rejectionReason = "";
    }

    await foundVendor.save();

    // Sync the linked User document's role
    const linkedUser = await User.findById(foundVendor.user);
    if (linkedUser && linkedUser.role !== "admin") {
      if (nextStatus === "approved") {
        linkedUser.role = "vendor";
        await linkedUser.save();
      } else if (
        (nextStatus === "suspended" || nextStatus === "rejected") &&
        linkedUser.role === "vendor"
      ) {
        linkedUser.role = "user";
        await linkedUser.save();
      }
    }

    res.json(
      ok({
        message: `Vendor status successfully updated to ${nextStatus}`,
        vendor: foundVendor,
      }),
    );
  }),
);

// Update commission rate for a specific vendor
adminVendorManageRouter.patch(
  "/vendors/:id/commission",
  asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.params.id as string;
    const commissionRate = Number(req.body.commissionRate);

    requireNumber(commissionRate, "Commission rate is required");

    if (commissionRate < 0 || commissionRate > 100) {
      throw new AppError(400, "Commission rate must be between 0 and 100%");
    }

    const vendor = await Vendor.findById(vendorId);
    const foundVendor = requireFound(vendor, "Vendor not found", 404);

    foundVendor.commissionRate = commissionRate;
    await foundVendor.save();

    res.json(
      ok({
        message: `Commission rate updated to ${commissionRate}%`,
        vendor: foundVendor,
      }),
    );
  }),
);
