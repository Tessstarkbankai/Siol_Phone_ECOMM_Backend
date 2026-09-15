import mongoose, { HydratedDocument, model, Schema, Types } from "mongoose";

export type CommunityImageItem = {
  imageUrl: string;
  imagePublicId?: string;
  title: string;
  hashtag?: string;
  link?: string;
  order: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type CommunityImageDocument = HydratedDocument<CommunityImageItem>;

const communityImageSchema = new Schema<CommunityImageItem>(
  {
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    imagePublicId: {
      type: String,
      default: "",
      trim: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    hashtag: {
      type: String,
      default: "#SiOLCommunity",
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

communityImageSchema.index({ order: 1, createdAt: -1 });

export const CommunityImage =
  mongoose.models.CommunityImage ||
  model<CommunityImageItem>("CommunityImage", communityImageSchema);
