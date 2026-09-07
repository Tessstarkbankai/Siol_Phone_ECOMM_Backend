import { Router, type Request, type Response } from "express";
import { requireVendor, getVendorFromReq } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Order, type SubOrderStatus } from "../../models/Order";
import { ok } from "../../utils/envelope";
import { requireFound, requireText } from "../../utils/helpers";
import { AppError } from "../../utils/AppError";

export const vendorOrderRouter = Router();

vendorOrderRouter.use(requireVendor);

const ALLOWED_SUB_ORDER_STATUSES: SubOrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

// List only this vendor's subOrders across all parent orders
vendorOrderRouter.get(
  "/orders",
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = (req as any).vendor || (await getVendorFromReq(req));
    const status = String(req.query.status || "").trim();

    const orders = await Order.find({
      "subOrders.vendor": vendor._id,
    })
      .select(
        "deliveryName deliveryAddress customerEmail paymentStatus createdAt subOrders",
      )
      .sort({ createdAt: -1 });

    // Filter and project: vendor ONLY receives their own subOrder data!
    const vendorSubOrders: any[] = [];

    for (const order of orders) {
      const mySubOrder = order.subOrders.find(
        (sub: any) => sub.vendor && sub.vendor.toString() === vendor._id.toString(),
      );

      if (!mySubOrder) continue;

      if (status && mySubOrder.status !== status) continue;

      vendorSubOrders.push({
        orderId: String(order._id),
        subOrderId: String(mySubOrder._id),
        orderCode: String(order._id).slice(-8).toUpperCase(),
        deliveryName: order.deliveryName,
        deliveryAddress: order.deliveryAddress,
        customerEmail: order.customerEmail,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        items: mySubOrder.items,
        subtotal: mySubOrder.subtotal,
        commissionRate: mySubOrder.commissionRate,
        commissionAmount: mySubOrder.commissionAmount,
        vendorPayoutAmount: mySubOrder.vendorPayoutAmount,
        status: mySubOrder.status,
        trackingInfo: mySubOrder.trackingInfo,
        shippedAt: mySubOrder.shippedAt,
        deliveredAt: mySubOrder.deliveredAt,
      });
    }

    res.json(ok(vendorSubOrders));
  }),
);

// Update a vendor subOrder status (with tracking information for shipping)
vendorOrderRouter.patch(
  "/orders/:subOrderId/status",
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = (req as any).vendor || (await getVendorFromReq(req));
    const subOrderId = req.params.subOrderId as string;
    const nextStatus = String(req.body.status || "").trim() as SubOrderStatus;
    const carrier = String(req.body.carrier || "").trim();
    const trackingNumber = String(req.body.trackingNumber || "").trim();
    const trackingUrl = String(req.body.trackingUrl || "").trim();

    requireText(subOrderId, "subOrderId is required");
    requireText(nextStatus, "Status is required");

    if (!ALLOWED_SUB_ORDER_STATUSES.includes(nextStatus)) {
      throw new AppError(
        400,
        `Invalid status. Allowed values: ${ALLOWED_SUB_ORDER_STATUSES.join(", ")}`,
      );
    }

    // Find the order that contains this subOrder
    const order = await Order.findOne({
      "subOrders._id": subOrderId,
    });

    const foundOrder = requireFound(order, "Order not found", 404);

    const subOrder = foundOrder.subOrders.find(
      (sub: any) => String(sub._id) === subOrderId,
    );

    const foundSubOrder = requireFound(subOrder, "Sub-order not found", 404);

    // Enforce server-side ownership: only the vendor who owns this subOrder can update it
    if (
      !foundSubOrder.vendor ||
      foundSubOrder.vendor.toString() !== vendor._id.toString()
    ) {
      throw new AppError(403, "Forbidden: You do not own this sub-order");
    }

    foundSubOrder.status = nextStatus;

    if (nextStatus === "shipped") {
      foundSubOrder.shippedAt = new Date();
      if (carrier || trackingNumber || trackingUrl) {
        foundSubOrder.trackingInfo = {
          carrier: carrier || foundSubOrder.trackingInfo?.carrier || "",
          trackingNumber:
            trackingNumber || foundSubOrder.trackingInfo?.trackingNumber || "",
          trackingUrl:
            trackingUrl || foundSubOrder.trackingInfo?.trackingUrl || "",
        };
      }
    } else if (nextStatus === "delivered") {
      if (!foundSubOrder.deliveredAt) {
        foundSubOrder.deliveredAt = new Date();
      }
    }

    // Rollup logic for parent order status:
    const allStatuses = foundOrder.subOrders.map((s: any) => s.status);
    const allDelivered = allStatuses.every((s: any) => s === "delivered");
    const anyShipped = allStatuses.some((s: any) => s === "shipped" || s === "delivered");

    if (allDelivered) {
      foundOrder.orderStatus = "delivered";
      if (!foundOrder.deliveredAt) foundOrder.deliveredAt = new Date();
    } else if (anyShipped && foundOrder.orderStatus === "placed") {
      foundOrder.orderStatus = "shipped";
    }

    await foundOrder.save();

    res.json(
      ok({
        message: `Sub-order status updated to ${nextStatus}`,
        subOrder: {
          subOrderId: String(foundSubOrder._id),
          status: foundSubOrder.status,
          trackingInfo: foundSubOrder.trackingInfo,
          shippedAt: foundSubOrder.shippedAt,
          deliveredAt: foundSubOrder.deliveredAt,
        },
      }),
    );
  }),
);
