import { Router, type Request, type Response } from "express";
import { Types } from "mongoose";
import { Product, ProductSize } from "../../models/Product";
import { getDbUserFromReq, requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { User } from "../../models/User";
import { requireFound, requireText } from "../../utils/helpers";
import { ok } from "../../utils/envelope";
import { Cart } from "../../models/Cart";
import { AppError } from "../../utils/AppError";
import { Promo } from "../../models/Promo";
import { Order, type SubOrderItem } from "../../models/Order";
import { Vendor } from "../../models/Vendor";

type UserAddressRow = {
  _id: Types.ObjectId;
  fullName: string;
  address: string;
  state: string;
  postalCode: string;
};

type CheckoutUserRow = {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  points: number;
  addresses: UserAddressRow[];
};

type CartRow = {
  items: Array<{
    product: Types.ObjectId;
    quantity: number;
    color?: string;
    size?: ProductSize;
  }>;
};

type ProductRow = {
  _id: Types.ObjectId;
  title: string;
  price: number;
  salePercentage: number;
  stock: number;
  status: "active" | "inactive";
  vendor?: Types.ObjectId | null;
};

type PromoRow = {
  code: string;
  percentage: number;
  count: number;
  minimumOrderValue: number;
  startsAt: Date;
  endsAt: Date;
};

export const customerCheckoutWithPointsRouter = Router();

customerCheckoutWithPointsRouter.use(requireAuth);

customerCheckoutWithPointsRouter.get(
  "/checkout/points",
  asyncHandler(async (req: Request, res: Response) => {
    const dbUser = await getDbUserFromReq(req);

    const user = await User.findById(dbUser._id)
      .select("points")
      .lean<{ points: number } | null>();

    const foundUser = requireFound(user, "User not found", 404);

    res.json(
      ok({
        points: foundUser.points || 0,
      }),
    );
  }),
);

customerCheckoutWithPointsRouter.post(
  "/checkout/pay-with-points",
  asyncHandler(async (req: Request, res: Response) => {
    const dbUser = await getDbUserFromReq(req);
    const addressId = String(req.body.addressId || "").trim();
    const promoCode = String(req.body.promoCode || "")
      .trim()
      .toUpperCase();

    requireText(addressId, "Address is required");

    //get user and cart info

    const [user, cart] = await Promise.all([
      User.findById(dbUser._id)
        .select("name email addresses")
        .lean<CheckoutUserRow | null>(),

      Cart.findOne({ user: dbUser._id }).select("items").lean<CartRow | null>(),
    ]);

    const foundUser = requireFound(user, "user not found", 404);
    const foundCart = requireFound(cart, "Cart not found", 404);

    if (!foundCart.items.length) {
      throw new AppError(400, "Cart is empty");
    }

    const selectedAddress = foundUser.addresses.find(
      (item) => String(item._id) === addressId,
    );

    if (!selectedAddress) {
      throw new AppError(404, "Address not found!!");
    }

    const products = await Product.find({
      _id: { $in: foundCart.items.map((item) => item.product) },
    })
      .select("title price salePercentage stock status vendor")
      .lean<ProductRow[]>();

    const productMap = new Map(
      products.map((item) => [String(item._id), item]),
    );

    let totalItems = 0;
    let subTotal = 0;

    const vendorMap = new Map<
      string,
      {
        vendorId: Types.ObjectId | null;
        items: SubOrderItem[];
        subtotal: number;
      }
    >();

    const items = foundCart.items.map((cartItem) => {
      const product = productMap.get(String(cartItem.product));

      if (!product || product.status !== "active") {
        throw new AppError(400, "One or more cart items are not avaibale");
      }

      if (product.stock < cartItem.quantity) {
        throw new AppError(400, "Cart items are out of stock");
      }

      const finalPrice = product.salePercentage
        ? Math.round(
            product.price - (product.price * product.salePercentage) / 100,
          )
        : product.price;

      totalItems += cartItem.quantity;
      subTotal += finalPrice * cartItem.quantity;

      const vKey = product.vendor ? String(product.vendor) : "platform";
      const existingVendorGroup = vendorMap.get(vKey) || {
        vendorId: product.vendor || null,
        items: [],
        subtotal: 0,
      };

      existingVendorGroup.items.push({
        product: product._id,
        title: product.title,
        quantity: cartItem.quantity,
        price: finalPrice,
        color: cartItem.color,
        size: cartItem.size,
      });
      existingVendorGroup.subtotal += finalPrice * cartItem.quantity;
      vendorMap.set(vKey, existingVendorGroup);

      return {
        product: cartItem.product,
        quantity: cartItem.quantity,
      };
    });

    const vendorIds = Array.from(vendorMap.values())
      .map((v) => v.vendorId)
      .filter((id): id is Types.ObjectId => Boolean(id));

    const vendorDocs = await Vendor.find({ _id: { $in: vendorIds } }).select(
      "commissionRate",
    );
    const vendorRateMap = new Map(
      vendorDocs.map((v) => [String(v._id), v.commissionRate ?? 10]),
    );

    const subOrders = Array.from(vendorMap.values()).map((entry) => {
      const rate = entry.vendorId
        ? (vendorRateMap.get(String(entry.vendorId)) ?? 10)
        : 0;
      const commissionAmount = Math.round((entry.subtotal * rate) / 100);
      const vendorPayoutAmount = Math.max(entry.subtotal - commissionAmount, 0);

      return {
        vendor: entry.vendorId,
        items: entry.items,
        subtotal: entry.subtotal,
        commissionRate: rate,
        commissionAmount,
        vendorPayoutAmount,
        status: "confirmed" as const, // Paid with points immediately confirmed
      };
    });

    let appliedPromoCode = "";
    let discountAmount = 0;

    if (promoCode) {
      const promo = await Promo.findOne({ code: promoCode })
        .select("code percentage count minimumOrderValue startsAt endsAt")
        .lean<PromoRow | null>();

      const foundPromo = requireFound(promo, "Promo not found", 404);
      const now = new Date();

      if (
        now < foundPromo.startsAt ||
        now > foundPromo.endsAt ||
        foundPromo.count < 1
      ) {
        throw new AppError(400, "promo code is not active");
      }

      if (subTotal < foundPromo.minimumOrderValue) {
        throw new AppError(
          400,
          "Minimum order value for this promo is not at the threesold",
        );
      }

      appliedPromoCode = foundPromo.code;
      discountAmount = Math.round((subTotal * foundPromo.percentage) / 100);
    }

    const totalAmount = Math.max(subTotal - discountAmount, 0);

    if (totalAmount > foundUser.points) {
      throw new AppError(400, "Not enough points for this order");
    }

    const deductedUserPoints = await User.updateOne(
      {
        _id: dbUser._id,
        points: { $gte: totalAmount },
      },
      {
        $inc: { points: -totalAmount },
      },
    );

    if (!deductedUserPoints.matchedCount) {
      throw new AppError(400, "Not enough points for this order");
    }

    try {
      for (const item of items) {
        const updated = await Product.updateOne(
          {
            _id: item.product,
            stock: { $gte: item.quantity },
          },
          {
            $inc: { stock: -item.quantity },
          },
        );

        if (!updated.matchedCount) {
          throw new AppError(400, "One or more cart items are out of stock");
        }
      }

      if (appliedPromoCode) {
        await Promo.updateOne(
          {
            code: appliedPromoCode,
            count: { $gt: 0 },
          },
          {
            $inc: { count: -1 },
          },
        );
      }

      await Cart.updateOne({ user: dbUser._id }, { $set: { items: [] } });

      const pointsPaymentId = `points_${Date.now()}`;

      const deliveryAddress = [
        selectedAddress.address,
        selectedAddress.state,
        selectedAddress.postalCode,
      ]
        .filter(Boolean)
        .join(", ");

      const order = await Order.create({
        user: dbUser._id,
        customerName: foundUser.name || selectedAddress.fullName,
        customerEmail: foundUser.email || "",
        items,
        subOrders,
        totalItems,
        deliveryName: selectedAddress.fullName,
        deliveryAddress,
        promoCode: appliedPromoCode,
        discountAmount,
        totalAmount,
        paymentStatus: "paid",
        orderStatus: "placed",
        razorpayOrderId: pointsPaymentId,
        paymentId: pointsPaymentId,
        paidAt: new Date(),
      });

      for (const sub of subOrders) {
        if (sub.vendor) {
          await Vendor.updateOne(
            { _id: sub.vendor },
            { $inc: { totalSales: sub.subtotal } },
          );
        }
      }

      const updatedUser = await User.findById(dbUser._id)
        .select("points")
        .lean<{ points: number } | null>();

      res.json(
        ok({
          _id: String(order._id),
          totalPoints: updatedUser?.points || 0,
        }),
      );
    } catch (error) {
      await User.updateOne(
        {
          _id: dbUser._id,
        },
        {
          $inc: { points: totalAmount },
        },
      );

      throw error;
    }
  }),
);
