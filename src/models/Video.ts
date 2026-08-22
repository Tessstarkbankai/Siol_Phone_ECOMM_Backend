import mongoose, { HydratedDocument, Schema, Types } from "mongoose";

export type Video = {
  title: string;
  videoUrl: string;
  videoPublicId: string;
  caption?: string;
  productLink?: string;
  status: "active" | "inactive";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type VideoDocument = HydratedDocument<Video>;

const VideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    videoPublicId: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
      default: "",
    },
    productLink: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export const Video =
  mongoose.models.Video || mongoose.model<Video>("Video", VideoSchema);
