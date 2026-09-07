import mongoose, { HydratedDocument, model, Schema, Types } from "mongoose";

export type PaymentStatus = "pending" | "paid" | "failed";
export type OrderStatus = "placed" | "shipped" | "delivered" | "returned";

export type SubOrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type SubOrderItem = {
  product: Types.ObjectId;
  title: string;
  quantity: number;
  price: number;
  color?: string;
  size?: string;
};

export type TrackingInfo = {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
};

export type SubOrder = {
  _id?: Types.ObjectId;
  vendor?: Types.ObjectId | null;
  items: SubOrderItem[];
  subtotal: number;
  commissionRate: number;
  commissionAmount: number;
  vendorPayoutAmount: number;
  status: SubOrderStatus;
  trackingInfo?: TrackingInfo;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
};

export type OrderItem = {
  product: Types.ObjectId;
  quantity: number;
};

export type Order = {
  user: Types.ObjectId;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subOrders: SubOrder[];
  totalItems: number;
  deliveryName: string;
  deliveryAddress: string;
  promoCode?: string;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  razorpayOrderId: string;
  paymentId?: string;
  paidAt?: Date | null;
  deliveredAt?: Date | null;
  returnedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderDocument = HydratedDocument<Order>;

const OrderItemsSchema = new Schema<OrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false },
);

const SubOrderItemSchema = new Schema<SubOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    title: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    color: { type: String, default: "" },
    size: { type: String, default: "" },
  },
  { _id: false },
);

const SubOrderSchema = new Schema<SubOrder>(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },
    items: {
      type: [SubOrderItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    commissionRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    commissionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    vendorPayoutAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "packed",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "pending",
      index: true,
    },
    trackingInfo: {
      carrier: { type: String, default: "" },
      trackingNumber: { type: String, default: "" },
      trackingUrl: { type: String, default: "" },
    },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const OrderSchema = new Schema<Order>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerName: {
      type: String,
      default: "",
      trim: true,
    },
    customerEmail: {
      type: String,
      default: "",
      trim: true,
    },
    items: {
      type: [OrderItemsSchema],
      default: [],
    },
    subOrders: {
      type: [SubOrderSchema],
      default: [],
    },
    totalItems: {
      type: Number,
      required: true,
      min: 1,
    },
    deliveryName: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
      trim: true,
    },
    promoCode: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    orderStatus: {
      type: String,
      enum: ["placed", "shipped", "delivered", "returned"],
      default: "placed",
    },
    razorpayOrderId: {
      type: String,
      required: true,
      trim: true,
    },
    paymentId: {
      type: String,
      default: "",
      trim: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ "subOrders.vendor": 1, createdAt: -1 });

export const Order =
  mongoose.models.Order || model<Order>("Order", OrderSchema);
