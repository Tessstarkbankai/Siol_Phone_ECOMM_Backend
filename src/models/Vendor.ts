import mongoose, { HydratedDocument, Schema, Types } from "mongoose";

export type VendorStatus = "pending" | "approved" | "rejected" | "suspended";

export type VendorMedia = {
  url: string;
  publicId: string;
};

export type VendorBankDetails = {
  accountHolderName: string;
  accountNumberMasked: string;
  accountNumberEncrypted: string;
  ifsc: string;
  upiId?: string;
};

export type Vendor = {
  user: Types.ObjectId;
  storeName: string;
  storeSlug: string;
  storeLogo?: VendorMedia;
  storeBanner?: VendorMedia;
  description?: string;
  businessEmail?: string;
  businessPhone?: string;
  gstNumber?: string;
  bankDetails?: VendorBankDetails;
  status: VendorStatus;
  rejectionReason?: string;
  commissionRate: number;
  rating: number;
  totalSales: number;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type VendorDocument = HydratedDocument<Vendor>;

const VendorMediaSchema = new Schema<VendorMedia>(
  {
    url: { type: String, default: "", trim: true },
    publicId: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const VendorBankDetailsSchema = new Schema<VendorBankDetails>(
  {
    accountHolderName: { type: String, default: "", trim: true },
    accountNumberMasked: { type: String, default: "", trim: true },
    accountNumberEncrypted: { type: String, default: "", select: false }, // exclude by default for security
    ifsc: { type: String, default: "", trim: true, uppercase: true },
    upiId: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const VendorSchema = new Schema<Vendor>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    storeName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    storeSlug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    storeLogo: {
      type: VendorMediaSchema,
      default: () => ({ url: "", publicId: "" }),
    },
    storeBanner: {
      type: VendorMediaSchema,
      default: () => ({ url: "", publicId: "" }),
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    businessEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    businessPhone: {
      type: String,
      default: "",
      trim: true,
    },
    gstNumber: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    bankDetails: {
      type: VendorBankDetailsSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      index: true,
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
    commissionRate: {
      type: Number,
      default: 10, // 10% default platform fee
      min: 0,
      max: 100,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const Vendor =
  mongoose.models.Vendor || mongoose.model<Vendor>("Vendor", VendorSchema);
