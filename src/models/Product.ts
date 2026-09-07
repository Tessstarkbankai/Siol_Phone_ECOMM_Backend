import mongoose, { HydratedDocument, Schema, Types } from "mongoose";

export type ProductImage = {
  url: string;
  publicId: string;
  isCover: boolean;
};

export type ProductSize =
  | "64GB"
  | "128GB"
  | "256GB"
  | "512GB"
  | "1TB"
  | "2TB"
  | "S"
  | "M"
  | "L"
  | "XL"
  | string;
export type ProductStatus = "active" | "inactive";
export type ProductApprovalStatus = "pending" | "approved" | "rejected";

export type Product = {
  title: string;
  description: string;
  category: Types.ObjectId;
  brand: string;
  stock: number;
  images: ProductImage[];
  colors: string[];
  sizes: ProductSize[];
  price: number;
  salePercentage: number;
  isSpotlight: boolean;
  status: ProductStatus;
  approvalStatus: ProductApprovalStatus;
  rejectionReason?: string;
  vendor?: Types.ObjectId; // null or undefined = platform/first-party product
  showcaseBanners?: Array<{ url: string; publicId: string }>;
  rating?: number;
  reviewCount?: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductDocument = HydratedDocument<Product>;

const productImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    isCover: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    images: {
      type: [productImageSchema],
      default: [],
    },
    colors: {
      type: [String],
      default: [],
    },
    sizes: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      required: true,
    },
    salePercentage: {
      type: Number,
      default: 0,
    },
    isSpotlight: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // default approved so existing first-party products remain active
      index: true,
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },
    showcaseBanners: {
      type: [
        {
          url: { type: String, required: true, trim: true },
          publicId: { type: String, required: true, trim: true },
        },
      ],
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

ProductSchema.index({ vendor: 1, approvalStatus: 1, status: 1 });

export const Product =
  mongoose.models.Product || mongoose.model<Product>("Product", ProductSchema);
