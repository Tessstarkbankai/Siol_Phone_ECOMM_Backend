import mongoose, { HydratedDocument, Schema, Types } from "mongoose";

export type DistributorStatus = "pending" | "approved" | "disapproved" | "withdrawn";

export type DistributorApplication = {
  user?: Types.ObjectId;
  companyName: string;
  entityType: string;
  yearsInBusiness: number;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  gstNumber: string;
  panNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  operatingTerritory: string[];
  warehouseArea: string;
  logisticsFleet?: string;
  annualTurnover: string;
  expectedMonthlyVolume: string;
  preferredCategories: string[];
  proposalNote?: string;
  status: DistributorStatus;
  attemptNumber: number;
  withdrawnAt?: Date | null;
  adminNotes?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type DistributorApplicationDocument = HydratedDocument<DistributorApplication>;

const DistributorApplicationSchema = new Schema<DistributorApplication>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
    },
    yearsInBusiness: {
      type: Number,
      default: 0,
      min: 0,
    },
    contactPerson: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      default: "Proprietor / Director",
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    alternatePhone: {
      type: String,
      default: "",
      trim: true,
    },
    gstNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    panNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
    operatingTerritory: {
      type: [String],
      default: [],
    },
    warehouseArea: {
      type: String,
      default: "Under 1,000 sq.ft.",
      trim: true,
    },
    logisticsFleet: {
      type: String,
      default: "",
      trim: true,
    },
    annualTurnover: {
      type: String,
      default: "",
      trim: true,
    },
    expectedMonthlyVolume: {
      type: String,
      default: "",
      trim: true,
    },
    preferredCategories: {
      type: [String],
      default: [],
    },
    proposalNote: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "disapproved", "withdrawn"],
      default: "pending",
      index: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    withdrawnAt: {
      type: Date,
      default: null,
    },
    adminNotes: {
      type: String,
      default: "",
      trim: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

DistributorApplicationSchema.index({ status: 1, createdAt: -1 });

export const DistributorApplication =
  mongoose.models.DistributorApplication ||
  mongoose.model<DistributorApplication>(
    "DistributorApplication",
    DistributorApplicationSchema,
  );
