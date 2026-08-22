import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import fs from "fs";
import path from "path";

type CloudinaryUploadResult = {
  url: string;
  publicId: string;
};

const isCloudinaryConfigured =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  process.env.CLOUDINARY_CLOUD_NAME !== "dummy" &&
  process.env.CLOUDINARY_CLOUD_NAME !== "new" &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  process.env.CLOUDINARY_API_KEY !== "dummy" &&
  Boolean(process.env.CLOUDINARY_API_SECRET) &&
  process.env.CLOUDINARY_API_SECRET !== "dummy";

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function detectMimeType(buffer: Buffer): { mime: string; ext: string } {
  if (buffer.length >= 4) {
    // PNG: 89 50 4E 47
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { mime: "image/png", ext: "png" };
    }
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { mime: "image/jpeg", ext: "jpg" };
    }
    // GIF: 47 49 46 38
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return { mime: "image/gif", ext: "gif" };
    }
    // WEBP: 52 49 46 46
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46
    ) {
      return { mime: "image/webp", ext: "webp" };
    }
  }
  return { mime: "image/jpeg", ext: "jpg" };
}

function saveBufferToLocalDisk(
  fileBuffer: Buffer,
  subfolder: "videos" | "images",
  ext = "mp4",
): CloudinaryUploadResult {
  const uploadDir = path.join(process.cwd(), "uploads", subfolder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const publicId = `${subfolder}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const filename = `${publicId}.${ext}`;
  const filepath = path.join(uploadDir, filename);

  fs.writeFileSync(filepath, fileBuffer);

  const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
  return {
    url: `${baseUrl}/uploads/${subfolder}/${filename}`,
    publicId,
  };
}

export function uploadSingleBufferToCloudinary(
  fileBuffer: Buffer,
  folder = "ecommerce-monster-video/products",
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured) {
    const { ext } = detectMimeType(fileBuffer);
    return Promise.resolve(saveBufferToLocalDisk(fileBuffer, "images", ext));
  }

  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          console.warn(
            "[Cloudinary] Image upload failed, saving to local disk:",
            error?.message || error,
          );
          const { ext } = detectMimeType(fileBuffer);
          return resolve(saveBufferToLocalDisk(fileBuffer, "images", ext));
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}

export async function uploadManyBuffersToCloudinary(
  files: Buffer[],
  folder = "ecommerce-monster-video/products",
): Promise<CloudinaryUploadResult[]> {
  return Promise.all(
    files.map((file) => uploadSingleBufferToCloudinary(file, folder)),
  );
}

export function uploadVideoBufferToCloudinary(
  fileBuffer: Buffer,
  folder = "ecommerce-monster-video/videos",
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured) {
    console.log(
      "[Storage] Cloudinary not configured with valid cloud_name. Saving video directly to local disk.",
    );
    return Promise.resolve(saveBufferToLocalDisk(fileBuffer, "videos", "mp4"));
  }

  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "video",
      },
      (error, result) => {
        if (error || !result) {
          console.warn(
            "[Cloudinary] Video upload failed, falling back to local disk storage:",
            error?.message || error,
          );
          return resolve(saveBufferToLocalDisk(fileBuffer, "videos", "mp4"));
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}
