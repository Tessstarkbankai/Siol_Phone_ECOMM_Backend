import mongoose, { HydratedDocument, Schema, Types } from "mongoose";

export type PayoutStatus = "pending" | "processing" | "paid" | "failed";

export type PayoutPeriod = {
  from: Date;
  to: Date;
};

export type Payout = {
  vendor: Types.ObjectId;
  amount: number;
  period?: PayoutPeriod;
  status: PayoutStatus;
  subOrdersIncluded: Types.ObjectId[];
  paidAt?: Date | null;
  transactionReference?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PayoutDocument = HydratedDocument<Payout>;

const PayoutPeriodSchema = new Schema<PayoutPeriod>(
  {
    from: { type: Date, required: true },
    to: { type: Date, required: true },
  },
  { _id: false },
);

const PayoutSchema = new Schema<Payout>(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    period: {
      type: PayoutPeriodSchema,
      required: false,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "failed"],
      default: "pending",
      index: true,
    },
    subOrdersIncluded: {
      type: [Schema.Types.ObjectId],
      default: [],
    },
    paidAt: {
      type: Date,
      default: null,
    },
    transactionReference: {
      type: String,
      default: "",
      trim: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

PayoutSchema.index({ vendor: 1, createdAt: -1 });

export const Payout =
  mongoose.models.Payout || mongoose.model<Payout>("Payout", PayoutSchema);
