import { Router, type Request, type Response } from "express";
import { requireVendor, getVendorFromReq } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Payout } from "../../models/Payout";
import { Order } from "../../models/Order";
import { ok } from "../../utils/envelope";

export const vendorPayoutRouter = Router();

vendorPayoutRouter.use(requireVendor);

// List vendor's payout history and running balance
vendorPayoutRouter.get(
  "/payouts",
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = (req as any).vendor || (await getVendorFromReq(req));

    const [orders, payouts] = await Promise.all([
      Order.find({
        "subOrders.vendor": vendor._id,
        paymentStatus: "paid",
      }).select("subOrders createdAt"),
      Payout.find({ vendor: vendor._id }).sort({ createdAt: -1 }),
    ]);

    let totalEarnings = 0;
    let totalSales = 0;

    for (const order of orders) {
      const mySubOrder = order.subOrders.find(
        (sub: any) => sub.vendor && sub.vendor.toString() === vendor._id.toString(),
      );
      if (mySubOrder && mySubOrder.status !== "cancelled") {
        totalSales += mySubOrder.subtotal;
        totalEarnings += mySubOrder.vendorPayoutAmount;
      }
    }

    const totalPaid = payouts
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingBalance = Math.max(totalEarnings - totalPaid, 0);

    res.json(
      ok({
        totalSales,
        totalEarnings,
        totalPaid,
        pendingBalance,
        payouts,
      }),
    );
  }),
);
