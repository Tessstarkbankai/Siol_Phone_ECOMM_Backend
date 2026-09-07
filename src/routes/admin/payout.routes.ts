import { Router, type Request, type Response } from "express";
import { requireAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Payout, type PayoutStatus } from "../../models/Payout";
import { Vendor } from "../../models/Vendor";
import { Order } from "../../models/Order";
import { ok } from "../../utils/envelope";
import { requireFound, requireNumber, requireText } from "../../utils/helpers";
import { AppError } from "../../utils/AppError";

export const adminPayoutRouter = Router();

adminPayoutRouter.use(requireAdmin);

// List all payouts and calculate vendor balances for the payout ledger
adminPayoutRouter.get(
  "/payouts",
  asyncHandler(async (req: Request, res: Response) => {
    const [payouts, vendors, orders] = await Promise.all([
      Payout.find()
        .populate("vendor", "storeName storeSlug bankDetails commissionRate")
        .sort({ createdAt: -1 }),
      Vendor.find({ status: { $in: ["approved", "suspended"] } }).select(
        "storeName storeSlug bankDetails commissionRate status",
      ),
      Order.find({ paymentStatus: "paid" }).select("subOrders"),
    ]);

    // Calculate earnings per vendor
    const earningsMap = new Map<string, number>();
    for (const order of orders) {
      for (const sub of order.subOrders) {
        if (!sub.vendor || sub.status === "cancelled") continue;
        const vId = String(sub.vendor);
        const current = earningsMap.get(vId) || 0;
        earningsMap.set(vId, current + sub.vendorPayoutAmount);
      }
    }

    // Calculate paid amount per vendor
    const paidMap = new Map<string, number>();
    for (const p of payouts) {
      if (p.status !== "paid" || !p.vendor) continue;
      const vId = String((p.vendor as any)._id || p.vendor);
      const current = paidMap.get(vId) || 0;
      paidMap.set(vId, current + p.amount);
    }

    // Combine vendor balances
    const vendorBalances = vendors.map((v) => {
      const vId = String(v._id);
      const totalEarned = earningsMap.get(vId) || 0;
      const totalPaid = paidMap.get(vId) || 0;
      const pendingBalance = Math.max(totalEarned - totalPaid, 0);

      return {
        vendorId: vId,
        storeName: v.storeName,
        storeSlug: v.storeSlug,
        status: v.status,
        bankDetails: v.bankDetails,
        totalEarned,
        totalPaid,
        pendingBalance,
      };
    });

    res.json(
      ok({
        payouts,
        vendorBalances,
      }),
    );
  }),
);

// Create / record a payout
adminPayoutRouter.post(
  "/payouts/create",
  asyncHandler(async (req: Request, res: Response) => {
    const vendorId = String(req.body.vendorId || "").trim();
    const amount = Number(req.body.amount);
    const transactionReference = String(
      req.body.transactionReference || "",
    ).trim();
    const note = String(req.body.note || "").trim();
    const status = (String(req.body.status || "paid").trim()) as PayoutStatus;

    requireText(vendorId, "Vendor ID is required");
    requireNumber(amount, "Payout amount is required");

    if (amount <= 0) {
      throw new AppError(400, "Payout amount must be greater than 0");
    }

    const vendor = await Vendor.findById(vendorId);
    requireFound(vendor, "Vendor not found", 404);

    const payout = await Payout.create({
      vendor: vendor._id,
      amount,
      status,
      transactionReference,
      note,
      paidAt: status === "paid" ? new Date() : null,
    });

    const populated = await Payout.findById(payout._id).populate(
      "vendor",
      "storeName storeSlug bankDetails commissionRate",
    );

    res.status(201).json(
      ok({
        message: "Payout recorded successfully",
        payout: populated,
      }),
    );
  }),
);

// Update payout status
adminPayoutRouter.patch(
  "/payouts/:id/status",
  asyncHandler(async (req: Request, res: Response) => {
    const payoutId = req.params.id as string;
    const status = String(req.body.status || "").trim() as PayoutStatus;
    const transactionReference = String(
      req.body.transactionReference || "",
    ).trim();
    const note = String(req.body.note || "").trim();

    if (!["pending", "processing", "paid", "failed"].includes(status)) {
      throw new AppError(400, "Invalid status");
    }

    const payout = await Payout.findById(payoutId);
    const found = requireFound(payout, "Payout not found", 404);

    found.status = status;
    if (transactionReference) {
      found.transactionReference = transactionReference;
    }
    if (note) {
      found.note = note;
    }
    if (status === "paid" && !found.paidAt) {
      found.paidAt = new Date();
    }

    await found.save();

    const populated = await Payout.findById(found._id).populate(
      "vendor",
      "storeName storeSlug bankDetails commissionRate",
    );

    res.json(
      ok({
        message: `Payout marked as ${status}`,
        payout: populated,
      }),
    );
  }),
);
