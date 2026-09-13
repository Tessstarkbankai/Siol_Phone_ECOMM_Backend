import mongoose, { HydratedDocument, model, Schema, Types } from "mongoose";

export type BannerMediaType = "image" | "video";

export type BannerItem = {
  mediaType: BannerMediaType;
  imageUrl?: string;
  imagePublicId?: string;
  videoUrl?: string;
  videoPublicId?: string;
  title?: string;
  tagline?: string;
  link?: string;
  order: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type BannerDocument = HydratedDocument<BannerItem>;

const bannerSchema = new Schema<BannerItem>(
  {
    mediaType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    imagePublicId: {
      type: String,
      default: "",
      trim: true,
    },
    videoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    videoPublicId: {
      type: String,
      default: "",
      trim: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    tagline: {
      type: String,
      default: "",
      trim: true,
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

bannerSchema.index({ order: 1, createdAt: -1 });

export const Banner =
  mongoose.models.Banner || model<BannerItem>("Banner", bannerSchema);
