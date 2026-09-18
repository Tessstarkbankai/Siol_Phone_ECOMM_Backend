import { Router, type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { getDbUserFromReq, requireAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Category } from "../../models/Category";
import { ok } from "../../utils/envelope";
import { requireFound, requireNumber, requireText } from "../../utils/helpers";
import { Product } from "../../models/Product";
import { AppError } from "../../utils/AppError";
import { uploadManyBuffersToCloudinary } from "../../utils/cloudinary";

type UploadedImage = {
  url: string;
  publicId: string;
  isCover: boolean;
};

function parseBanners(input: any): Array<{ url: string; publicId: string }> {
  if (!input) return [];
  try {
    let parsed = typeof input === "string" ? JSON.parse(input) : input;
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }
    const items = parsed.flatMap((item: any) => {
      if (typeof item === "string") {
        try {
          const inner = JSON.parse(item);
          return Array.isArray(inner) ? inner : [inner];
        } catch {
          return [];
        }
      }
      return Array.isArray(item) ? item : [item];
    });

    return items
      .filter(
        (b: any) =>
          b &&
          typeof b === "object" &&
          typeof b.url === "string" &&
          b.url.trim() &&
          typeof b.publicId === "string" &&
          b.publicId.trim(),
      )
      .map((b: any) => ({
        url: b.url.trim(),
        publicId: b.publicId.trim(),
      }));
  } catch {
    return [];
  }
}

function parseExistingImages(
  input: any,
  fallback: UploadedImage[],
): UploadedImage[] {
  if (!input) return fallback;
  try {
    let parsed = typeof input === "string" ? JSON.parse(input) : input;
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }
    const items = parsed.flatMap((item: any) => {
      if (typeof item === "string") {
        try {
          const inner = JSON.parse(item);
          return Array.isArray(inner) ? inner : [inner];
        } catch {
          return [];
        }
      }
      return Array.isArray(item) ? item : [item];
    });

    const valid = items
      .filter(
        (img: any) =>
          img &&
          typeof img === "object" &&
          typeof img.url === "string" &&
          img.url.trim() &&
          typeof img.publicId === "string" &&
          img.publicId.trim(),
      )
      .map((img: any) => ({
        url: img.url.trim(),
        publicId: img.publicId.trim(),
        isCover: Boolean(img.isCover),
      }));

    return valid.length > 0 ? valid : fallback;
  } catch {
    return fallback;
  }
}

export const adminProductRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 5 * 1024 * 1024,
    files: 10,
  },
});

adminProductRouter.use(requireAdmin);

// categories

adminProductRouter.get(
  "/categories",
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = await Category.find({}).sort({
      name: 1,
    });

    res.json(ok(categories));
  }),
);

adminProductRouter.post(
  "/categories",
  asyncHandler(async (req: Request, res: Response) => {
    const name = String(req.body.name || "").trim();

    requireText(name, "Category name is needed");

    const category = await Category.create({ name });

    res.status(201).json(ok(category));
  }),
);

adminProductRouter.put(
  "/categories/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const name = String(req.body.name || "").trim();
    const extractCategoryId = req.params.id as string;

    requireText(name, "Category name is needed");

    const existingCategory = await Category.findById(extractCategoryId);
    const category = requireFound(existingCategory, "Category not found");

    category.name = name;

    await category.save();
    res.json(ok(category));
  }),
);

// products
adminProductRouter.get(
  "/products",
  asyncHandler(async (req: Request, res: Response) => {
    const search = String(req.query.search || "").trim();

    const query: Record<string, unknown> = {};

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const products = await Product.find(query)
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json(ok(products));
  }),
);

adminProductRouter.get(
  "/products/:id",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id as string;

    if (!mongoose.isValidObjectId(productId)) {
      return next();
    }

    const product = await Product.findById(productId).populate(
      "category",
      "name",
    );

    requireFound(product, "Product not found", 404);

    res.json(ok(product));
  }),
);

adminProductRouter.post(
  "/products",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "bannerImages", maxCount: 10 },
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const category = String(req.body.category || "").trim();
    const brand = String(req.body.brand || "").trim();
    const price = Number(req.body.price);
    const salePercentage = Number(req.body.salePercentage || 0);
    const stock = Number(req.body.stock);
    const status = String(req.body.status || "active").trim();
    const rawSpotlightCat = String(req.body.spotlightCategory || "").trim();
    let spotlightCategory: "smartphone" | "feature_phone" | "none" = "none";
    if (rawSpotlightCat === "smartphone" || rawSpotlightCat === "feature_phone") {
      spotlightCategory = rawSpotlightCat;
    } else if (req.body.isSpotlight === true || req.body.isSpotlight === "true") {
      spotlightCategory = "smartphone";
    }
    const isSpotlight = spotlightCategory !== "none";
    const rawColors = req.body.colors;
    const colors = Array.isArray(rawColors)
      ? rawColors
      : typeof rawColors === "string" && rawColors.trim()
        ? [rawColors.trim()]
        : [];

    const rawSizes = req.body.sizes;
    const sizes = Array.isArray(rawSizes)
      ? rawSizes
      : typeof rawSizes === "string" && rawSizes.trim()
        ? [rawSizes.trim()]
        : [];

    requireText(title, "Title is required");
    requireText(description, "Description is required");
    requireText(category, "Category is required");
    requireText(brand, "Brand is required");

    requireNumber(price, "Price is required");
    requireNumber(salePercentage, "Sale Percentage is required");
    requireNumber(stock, "Stock is required");

    const existingCategory = await Category.findById(category);

    requireFound(existingCategory, "Category not found", 404);

    const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const files = filesObj?.images || (Array.isArray(req.files) ? req.files : []);
    const bannerFiles = filesObj?.bannerImages || [];

    if (!files.length) {
      throw new AppError(400, "Atleast one image is needed");
    }

    const uploadedImages = await uploadManyBuffersToCloudinary(
      files.map((file) => file.buffer),
    );

    const images = uploadedImages.map((img, index) => ({
      url: img.url,
      publicId: img.publicId,
      isCover: index === 0,
    }));

    let showcaseBanners: Array<{ url: string; publicId: string }> = [];
    if (bannerFiles.length > 0) {
      const uploadedBanners = await uploadManyBuffersToCloudinary(
        bannerFiles.map((file) => file.buffer),
      );
      showcaseBanners = uploadedBanners.map((img) => ({
        url: img.url,
        publicId: img.publicId,
      }));
    }

    const user = await getDbUserFromReq(req);

    const product = await Product.create({
      title,
      description,
      category,
      brand,
      images,
      showcaseBanners,
      colors,
      sizes,
      price,
      salePercentage,
      isSpotlight,
      spotlightCategory,
      stock,
      status,
      approvalStatus: "approved",
      createdBy: user._id,
    });

    const createdProduct = await Product.findById(product._id).populate(
      "category",
      "name",
    );

    res.status(201).json(ok(createdProduct));
  }),
);

adminProductRouter.put(
  "/products/:id",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "bannerImages", maxCount: 10 },
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const productId = req.params.id as string;
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const category = String(req.body.category || "").trim();
    const brand = String(req.body.brand || "").trim();
    const price = Number(req.body.price);
    const salePercentage = Number(req.body.salePercentage || 0);
    const stock = Number(req.body.stock);
    const status = String(req.body.status || "active").trim() as
      | "active"
      | "inactive";
    const rawSpotlightCat = String(req.body.spotlightCategory || "").trim();
    let spotlightCategory: "smartphone" | "feature_phone" | "none" = "none";
    if (rawSpotlightCat === "smartphone" || rawSpotlightCat === "feature_phone") {
      spotlightCategory = rawSpotlightCat;
    } else if (req.body.isSpotlight === true || req.body.isSpotlight === "true") {
      spotlightCategory = "smartphone";
    }
    const isSpotlight = spotlightCategory !== "none";
    const rawColors = req.body.colors;
    const colors = Array.isArray(rawColors)
      ? rawColors
      : typeof rawColors === "string" && rawColors.trim()
        ? [rawColors.trim()]
        : [];

    const rawSizes = req.body.sizes;
    const sizes = Array.isArray(rawSizes)
      ? rawSizes
      : typeof rawSizes === "string" && rawSizes.trim()
        ? [rawSizes.trim()]
        : [];
    const coverImagePublicId = String(req.body.coverImagePublicId || "").trim();

    requireText(title, "Title is required");
    requireText(description, "Description is required");
    requireText(category, "Category is required");
    requireText(brand, "Brand is required");

    requireNumber(price, "Price is required");
    requireNumber(salePercentage, "Sale Percentage is required");
    requireNumber(stock, "Stock is required");

    const existingCategoryDoc = await Category.findById(category);
    const existingCategory = requireFound(
      existingCategoryDoc,
      "Category not found",
    );

    const productDoc = await Product.findById(productId);
    const product = requireFound(productDoc, "Product not found");

    const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const files = filesObj?.images || (Array.isArray(req.files) ? req.files : []);
    const bannerFiles = filesObj?.bannerImages || [];

    const uploadNewImages = await uploadManyBuffersToCloudinary(
      files.map((file) => file.buffer),
    );

    const newlyAddedImages = uploadNewImages.map((image) => ({
      url: image.url,
      publicId: image.publicId,
      isCover: false,
    }));

    const fallbackExistingImages: UploadedImage[] = product.images.map(
      (img: UploadedImage) => ({
        url: img.url,
        publicId: img.publicId,
        isCover: img.isCover,
      }),
    );

    const existingImages = parseExistingImages(
      req.body.existingImages,
      fallbackExistingImages,
    );

    const mergedImages: UploadedImage[] = [
      ...existingImages,
      ...newlyAddedImages,
    ];

    if (!mergedImages.length) {
      throw new AppError(400, "Atleast one img is needed");
    }

    const finalImages: UploadedImage[] = mergedImages.map(
      (image: UploadedImage, index) => ({
        url: image.url,
        publicId: image.publicId,
        isCover: coverImagePublicId
          ? image.publicId === coverImagePublicId
          : index === 0,
      }),
    );

    // Handle showcase banners
    let existingBanners: Array<{ url: string; publicId: string }> = [];
    if (req.body.existingBanners !== undefined) {
      existingBanners = parseBanners(req.body.existingBanners);
    } else {
      existingBanners = product.showcaseBanners || [];
    }

    let newlyAddedBanners: Array<{ url: string; publicId: string }> = [];
    if (bannerFiles.length > 0) {
      const uploadedBanners = await uploadManyBuffersToCloudinary(
        bannerFiles.map((file) => file.buffer),
      );
      newlyAddedBanners = uploadedBanners.map((img) => ({
        url: img.url,
        publicId: img.publicId,
      }));
    }

    const finalBanners = [...existingBanners, ...newlyAddedBanners];

    product.title = title;
    product.description = description;
    product.category = existingCategory._id;
    product.brand = brand;
    product.colors = colors;
    product.sizes = sizes;
    product.price = price;
    product.salePercentage = salePercentage;
    product.isSpotlight = isSpotlight;
    product.spotlightCategory = spotlightCategory;
    product.stock = stock;
    product.status = status;
    product.set("images", finalImages);
    product.set("showcaseBanners", finalBanners);

    await product.save();

    const updatedProduct = await Product.findById(product._id).populate(
      "category",
      "name",
    );

    res.json(ok(updatedProduct));
  }),
);
