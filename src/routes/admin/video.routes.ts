import { Router, type Request, type Response } from "express";
import multer from "multer";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { requireFound, requireText } from "../../utils/helpers";
import { getDbUserFromReq } from "../../middleware/auth";
import { uploadVideoBufferToCloudinary } from "../../utils/cloudinary";
import { Video } from "../../models/Video";
import { ok } from "../../utils/envelope";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // Up to 100MB video file
});

export const adminVideoRouter = Router();

// GET all videos
adminVideoRouter.get(
  "/videos",
  asyncHandler(async (_req: Request, res: Response) => {
    const videos = await Video.find({}).sort({ createdAt: -1 });
    res.json(ok(videos));
  }),
);

// POST upload new video
adminVideoRouter.post(
  "/videos",
  upload.single("video"),
  asyncHandler(async (req: Request, res: Response) => {
    const title = String(req.body.title || "").trim();
    const caption = String(req.body.caption || "").trim();
    const productLink = String(req.body.productLink || "").trim();
    const directVideoUrl = String(req.body.videoUrl || "").trim();

    requireText(title, "Video title is required");

    let videoUrl = directVideoUrl;
    let videoPublicId = `vid_${Date.now()}`;

    if (req.file) {
      const uploadResult = await uploadVideoBufferToCloudinary(req.file.buffer);
      videoUrl = uploadResult.url;
      videoPublicId = uploadResult.publicId;
    } else if (!directVideoUrl) {
      throw new AppError(400, "Please provide a video file or video URL");
    }

    const user = await getDbUserFromReq(req);

    const video = await Video.create({
      title,
      caption,
      productLink,
      videoUrl,
      videoPublicId,
      status: "active",
      createdBy: user._id,
    });

    res.status(201).json(ok(video));
  }),
);

// DELETE video
adminVideoRouter.delete(
  "/videos/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const videoId = req.params.id as string;
    const videoDoc = await Video.findById(videoId);
    const video = requireFound(videoDoc, "Video not found", 404);

    await Video.findByIdAndDelete(video._id);
    res.json(ok({ message: "Video deleted successfully" }));
  }),
);
