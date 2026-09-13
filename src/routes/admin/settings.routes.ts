import { getDbUserFromReq, requireAdmin } from "../../middleware/auth";
import multer from "multer";
import { Banner, BannerDocument, BannerMediaType } from "../../models/Banner";
import { Router, type Request, type Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ok } from "../../utils/envelope";
import { AppError } from "../../utils/AppError";
import {
  uploadSingleBufferToCloudinary,
  uploadVideoBufferToCloudinary,
} from "../../utils/cloudinary";

type AdminBannerItem = {
  _id: string;
  mediaType: BannerMediaType;
  imageUrl?: string;
  imagePublicId?: string;
  videoUrl?: string;
  videoPublicId?: string;
  title?: string;
  tagline?: string;
  link?: string;
  order: number;
  createdAt: string;
};

function mapBanner(item: BannerDocument): AdminBannerItem {
  return {
    _id: String(item._id),
    mediaType: item.mediaType || "image",
    imageUrl: item.imageUrl || "",
    imagePublicId: item.imagePublicId || "",
    videoUrl: item.videoUrl || "",
    videoPublicId: item.videoPublicId || "",
    title: item.title || "",
    tagline: item.tagline || "",
    link: item.link || "",
    order: typeof item.order === "number" ? item.order : 0,
    createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
  };
}

const BANNER_FOLDER = "ecommerce-monster-video/banners";

// Allow image and video files up to 100MB for hero videos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 10,
  },
});

export const adminSettingsRouter = Router();

adminSettingsRouter.use(requireAdmin);

// Get all banners sorted by order ascending, then newest
adminSettingsRouter.get(
  "/settings/banners",
  asyncHandler(async (_req: Request, res: Response) => {
    const items = await Banner.find().sort({ order: 1, createdAt: -1 });

    res.json(
      ok({
        items: items.map(mapBanner),
      }),
    );
  }),
);

// Upload or create banners (supports multiple files: images or videos, or direct link)
adminSettingsRouter.post(
  "/settings/banners",
  upload.array("files", 10),
  asyncHandler(async (req: Request, res: Response) => {
    const dbUser = await getDbUserFromReq(req);
    const files = (req.files || []) as Express.Multer.File[];
    const {
      videoUrl,
      imageUrl,
      title = "",
      tagline = "",
      link = "",
      mediaType: directMediaType,
    } = req.body;

    // Get current max order so new banners are added at the end
    const lastBanner = await Banner.findOne().sort({ order: -1 });
    let nextOrder = (lastBanner?.order ?? -1) + 1;

    const createdBanners: BannerDocument[] = [];

    // 1. If files were uploaded
    if (files.length > 0) {
      for (const file of files) {
        const isVideo =
          file.mimetype.startsWith("video/") ||
          /\.(mp4|webm|mov|mkv|avi)$/i.test(file.originalname);

        if (isVideo) {
          const uploadRes = await uploadVideoBufferToCloudinary(
            file.buffer,
            BANNER_FOLDER,
          );
          const banner = await Banner.create({
            mediaType: "video",
            videoUrl: uploadRes.url,
            videoPublicId: uploadRes.publicId,
            title,
            tagline,
            link,
            order: nextOrder++,
            createdBy: dbUser._id,
          });
          createdBanners.push(banner);
        } else {
          const uploadRes = await uploadSingleBufferToCloudinary(
            file.buffer,
            BANNER_FOLDER,
          );
          const banner = await Banner.create({
            mediaType: "image",
            imageUrl: uploadRes.url,
            imagePublicId: uploadRes.publicId,
            title,
            tagline,
            link,
            order: nextOrder++,
            createdBy: dbUser._id,
          });
          createdBanners.push(banner);
        }
      }
    } else if (videoUrl || imageUrl) {
      // 2. Direct URL provided (e.g. YouTube URL or hosted media URL)
      const isVideo =
        directMediaType === "video" ||
        Boolean(videoUrl) ||
        (videoUrl && /(?:youtu\.be|youtube\.com|\.mp4|\.webm)/i.test(videoUrl));

      const banner = await Banner.create({
        mediaType: isVideo ? "video" : "image",
        videoUrl: isVideo ? (videoUrl || imageUrl) : "",
        imageUrl: !isVideo ? (imageUrl || videoUrl) : "",
        title,
        tagline,
        link,
        order: nextOrder++,
        createdBy: dbUser._id,
      });
      createdBanners.push(banner);
    } else {
      throw new AppError(400, "Please upload at least one image/video or provide a media URL");
    }

    // Return the updated full list sorted by order
    const allItems = await Banner.find().sort({ order: 1, createdAt: -1 });
    res.json(
      ok({
        items: allItems.map(mapBanner),
      }),
    );
  }),
);

// Delete banner
adminSettingsRouter.delete(
  "/settings/banners/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const banner = await Banner.findById(id);
    if (!banner) {
      throw new AppError(404, "Banner not found");
    }

    await Banner.findByIdAndDelete(id);

    // Return the updated list
    const items = await Banner.find().sort({ order: 1, createdAt: -1 });
    res.json(
      ok({
        message: "Banner deleted successfully",
        items: items.map(mapBanner),
      }),
    );
  }),
);

// Reorder banners
adminSettingsRouter.patch(
  "/settings/banners/reorder",
  asyncHandler(async (req: Request, res: Response) => {
    const { bannerIds } = req.body;

    if (!Array.isArray(bannerIds)) {
      throw new AppError(400, "bannerIds array is required");
    }

    await Promise.all(
      bannerIds.map((id: string, index: number) =>
        Banner.findByIdAndUpdate(id, { order: index }),
      ),
    );

    const items = await Banner.find().sort({ order: 1, createdAt: -1 });
    res.json(
      ok({
        items: items.map(mapBanner),
      }),
    );
  }),
);

