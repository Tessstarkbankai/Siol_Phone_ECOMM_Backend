import { Router, type Request, type Response } from "express";
import multer from "multer";
import { requireVendor, getVendorFromReq, getDbUserFromReq } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Product, type ProductStatus } from "../../models/Product";
import { Category } from "../../models/Category";
import { ok } from "../../utils/envelope";
import { requireFound, requireNumber, requireText } from "../../utils/helpers";
import { AppError } from "../../utils/AppError";
import { uploadManyBuffersToCloudinary } from "../../utils/cloudinary";

export const vendorProductRouter = Router();

vendorProductRouter.use(requireVendor);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 5 * 1024 * 1024,
    files: 10,
  },
});

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

// Get all categories for vendors
vendorProductRouter.get(
  "/categories",
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = await Category.find({}).sort({ name: 1 });
    res.json(ok(categories));
  }),
);

// Create new category by vendor
vendorProductRouter.post(
  "/categories",
  asyncHandler(async (req: Request, res: Response) => {
    requireText(req.body.name, "Category name is required");
    const name = String(req.body.name).trim();

    let category = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (!category) {
      category = await Category.create({ name });
    }

    res.json(ok(category));
  }),
);

// Get all distinct brands for vendors
vendorProductRouter.get(
  "/brands",
  asyncHandler(async (_req: Request, res: Response) => {
    const distinctBrands = await Product.distinct("brand");
    const defaultBrands = [
      "Apple",
      "Samsung",
      "Google",
      "OnePlus",
      "Xiaomi",
      "Nothing",
      "ASUS",
      "Anker",
      "Baseus",
      "Sony",
      "Motorola",
      "Vivo",
      "Realme",
      "Dell",
      "HP",
      "Lenovo",
      "Boat",
      "Noise",
      "Bose",
      "JBL",
      "Logitech",
    ];
    const combined = Array.from(
      new Set([...defaultBrands, ...distinctBrands.filter(Boolean)]),
    ).sort((a, b) => a.localeCompare(b));

    res.json(ok(combined));
  }),
);

// List all products belonging to this vendor
vendorProductRouter.get(
  "/products",
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = (req as any).vendor || (await getVendorFromReq(req));
    const search = String(req.query.search || "").trim();
    const approvalStatus = String(req.query.approvalStatus || "").trim();

    const query: Record<string, unknown> = {
      vendor: vendor._id,
    };

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    if (approvalStatus) {
      query.approvalStatus = approvalStatus;
    }

    const products = await Product.find(query)
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json(ok(products));
  }),
);

// Get single product belonging to this vendor
vendorProductRouter.get(
  "/products/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = (req as any).vendor || (await getVendorFromReq(req));
    const productId = req.params.id as string;

    const product = await Product.findOne({
      _id: productId,
      vendor: vendor._id,
    }).populate("category", "name");

    const found = requireFound(
      product,
      "Product not found or unauthorized",
      404,
    );
    res.json(ok(found));
  }),
);

// Create a new vendor product (defaults to approvalStatus: "pending")
vendorProductRouter.post(
  "/products",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "bannerImages", maxCount: 10 },
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = (req as any).vendor || (await getVendorFromReq(req));
    const dbUser = (req as any).dbUser || (await getDbUserFromReq(req));

    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const category = String(req.body.category || "").trim();
    const brand = String(req.body.brand || "").trim();
    const price = Number(req.body.price);
    const salePercentage = Number(req.body.salePercentage || 0);
    const stock = Number(req.body.stock);
    const status = (String(req.body.status || "active").trim()) as ProductStatus;
    const isSpotlight =
      req.body.isSpotlight === true || req.body.isSpotlight === "true";

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
      throw new AppError(400, "At least one image is required");
    }

    const folder = `marketplace/vendors/${String(vendor._id)}/products`;
    const uploadedImages = await uploadManyBuffersToCloudinary(
      files.map((file) => file.buffer),
      folder,
    );

    const images = uploadedImages.map((img, index) => ({
      url: img.url,
      publicId: img.publicId,
      isCover: index === 0,
    }));

    let showcaseBanners: Array<{ url: string; publicId: string }> = [];
    if (bannerFiles.length > 0) {
      const bannerFolder = `marketplace/vendors/${String(vendor._id)}/banners`;
      const uploadedBanners = await uploadManyBuffersToCloudinary(
        bannerFiles.map((file) => file.buffer),
        bannerFolder,
      );
      showcaseBanners = uploadedBanners.map((img) => ({
        url: img.url,
        publicId: img.publicId,
      }));
    }

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
      stock,
      status,
      approvalStatus: "pending", // Vendor products require admin approval
      vendor: vendor._id,
      createdBy: dbUser._id,
    });

    const createdProduct = await Product.findById(product._id).populate(
      "category",
      "name",
    );

    res.status(201).json(ok(createdProduct));
  }),
);

// Update a vendor product (ensures vendor ownership!)
vendorProductRouter.put(
  "/products/:id",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "bannerImages", maxCount: 10 },
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = (req as any).vendor || (await getVendorFromReq(req));
    const productId = req.params.id as string;

    const product = await Product.findOne({
      _id: productId,
      vendor: vendor._id,
    });
    const foundProduct = requireFound(
      product,
      "Product not found or access denied",
      404,
    );

    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const category = String(req.body.category || "").trim();
    const brand = String(req.body.brand || "").trim();
    const price = Number(req.body.price);
    const salePercentage = Number(req.body.salePercentage || 0);
    const stock = Number(req.body.stock);
    const status = String(req.body.status || "active").trim() as ProductStatus;
    const isSpotlight =
      req.body.isSpotlight === true || req.body.isSpotlight === "true";

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
    requireNumber(salePercentage, "Sale percentage is required");
    requireNumber(stock, "Stock is required");

    const existingCategory = await Category.findById(category);
    requireFound(existingCategory, "Category not found", 404);

    const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const files = filesObj?.images || (Array.isArray(req.files) ? req.files : []);
    const bannerFiles = filesObj?.bannerImages || [];
    const folder = `marketplace/vendors/${String(vendor._id)}/products/${productId}`;

    const uploadNewImages = await uploadManyBuffersToCloudinary(
      files.map((file) => file.buffer),
      folder,
    );

    const newlyAddedImages = uploadNewImages.map((image) => ({
      url: image.url,
      publicId: image.publicId,
      isCover: false,
    }));

    const fallbackExistingImages: UploadedImage[] = foundProduct.images.map(
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
      throw new AppError(400, "At least one image is required");
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
      existingBanners = foundProduct.showcaseBanners || [];
    }

    let newlyAddedBanners: Array<{ url: string; publicId: string }> = [];
    if (bannerFiles.length > 0) {
      const bannerFolder = `marketplace/vendors/${String(vendor._id)}/banners/${productId}`;
      const uploadedBanners = await uploadManyBuffersToCloudinary(
        bannerFiles.map((file) => file.buffer),
        bannerFolder,
      );
      newlyAddedBanners = uploadedBanners.map((img) => ({
        url: img.url,
        publicId: img.publicId,
      }));
    }

    const finalBanners = [...existingBanners, ...newlyAddedBanners];

    foundProduct.title = title;
    foundProduct.description = description;
    foundProduct.category = existingCategory._id;
    foundProduct.brand = brand;
    foundProduct.colors = colors;
    foundProduct.sizes = sizes;
    foundProduct.price = price;
    foundProduct.salePercentage = salePercentage;
    foundProduct.isSpotlight = isSpotlight;
    foundProduct.stock = stock;
    foundProduct.status = status;
    foundProduct.set("images", finalImages);
    foundProduct.set("showcaseBanners", finalBanners);

    // If previously rejected, editing moves it back to pending
    if (foundProduct.approvalStatus === "rejected") {
      foundProduct.approvalStatus = "pending";
      foundProduct.rejectionReason = "";
    }

    await foundProduct.save();

    const updatedProduct = await Product.findById(foundProduct._id).populate(
      "category",
      "name",
    );

    res.json(ok(updatedProduct));
  }),
);

// Delete product belonging to this vendor
vendorProductRouter.delete(
  "/products/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = (req as any).vendor || (await getVendorFromReq(req));
    const productId = req.params.id as string;

    const product = await Product.findOneAndDelete({
      _id: productId,
      vendor: vendor._id,
    });

    requireFound(product, "Product not found or access denied", 404);

    res.json(ok({ message: "Product successfully deleted", id: productId }));
  }),
);
