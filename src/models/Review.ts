import mongoose, { type HydratedDocument, type Types } from "mongoose";

export type Review = {
  product: Types.ObjectId;
  user: Types.ObjectId;
  userName: string;
  userEmail?: string;
  rating: number;
  title?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewDocument = HydratedDocument<Review>;

const ReviewSchema = new mongoose.Schema<Review>(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userEmail: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Compound index to quickly fetch product reviews sorted by date
ReviewSchema.index({ product: 1, createdAt: -1 });

export const Review =
  mongoose.models.Review || mongoose.model<Review>("Review", ReviewSchema);
