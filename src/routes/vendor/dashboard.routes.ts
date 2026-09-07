import { Router, type Request, type Response } from "express";
import { requireVendor, getVendorFromReq } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Order } from "../../models/Order";
import { Product } from "../../models/Product";
import { Payout } from "../../models/Payout";
import { ok } from "../../utils/envelope";

export const vendorDashboardRouter = Router();

vendorDashboardRouter.use(requireVendor);

vendorDashboardRouter.get(
  "/dashboard/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = (req as any).vendor || (await getVendorFromReq(req));

    const [orders, products, payouts] = await Promise.all([
      Order.find({
        "subOrders.vendor": vendor._id,
      }).select("paymentStatus subOrders createdAt"),
      Product.find({
        vendor: vendor._id,
      }).select("stock approvalStatus status"),
      Payout.find({
        vendor: vendor._id,
      }),
    ]);

    let totalSales = 0;
    let totalEarnings = 0;
    let totalSubOrders = 0;
    let pendingFulfillmentCount = 0;

    for (const order of orders) {
      const mySubOrder = order.subOrders.find(
        (sub: any) => sub.vendor && sub.vendor.toString() === vendor._id.toString(),
      );
      if (!mySubOrder) continue;

      totalSubOrders += 1;

      if (order.paymentStatus === "paid" && mySubOrder.status !== "cancelled") {
        totalSales += mySubOrder.subtotal;
        totalEarnings += mySubOrder.vendorPayoutAmount;
      }

      if (
        ["pending", "confirmed", "packed"].includes(mySubOrder.status) &&
        order.paymentStatus === "paid"
      ) {
        pendingFulfillmentCount += 1;
      }
    }

    const totalPaidPayouts = payouts
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayoutBalance = Math.max(totalEarnings - totalPaidPayouts, 0);

    const lowStockCount = products.filter((p) => p.stock <= 5).length;
    const pendingProductsCount = products.filter(
      (p) => p.approvalStatus === "pending",
    ).length;

    res.json(
      ok({
        totalSales,
        totalEarnings,
        totalOrders: totalSubOrders,
        pendingOrders: pendingFulfillmentCount,
        totalProducts: products.length,
        lowStockCount,
        pendingProductsCount,
        totalPaidPayouts,
        pendingPayoutBalance,
        commissionRate: vendor.commissionRate,
      }),
    );
  }),
);
