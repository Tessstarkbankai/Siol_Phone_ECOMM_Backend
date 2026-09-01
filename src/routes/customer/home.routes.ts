import { Router, type Request, type Response } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler";
import { Banner } from "../../models/Banner";
import { Category } from "../../models/Category";
import { Product, ProductSize } from "../../models/Product";
import { Promo } from "../../models/Promo";
import { Video } from "../../models/Video";
import { ok } from "../../utils/envelope";

type BannerRow = {
  _id: Types.ObjectId;
  imageUrl: string;
  createdAt: Date;
};

type CategoryRow = {
  _id: Types.ObjectId;
  name: string;
};

type ProductRow = {
  _id: Types.ObjectId;
  title: string;
  description: string;
  brand: string;
  price: number;
  salePercentage: number;
  stock?: number;
  colors?: string[];
  sizes?: ProductSize[];
  images: Array<{
    url: string;
    isCover?: boolean;
  }>;
  isSpotlight?: boolean;
  createdAt: Date;
};

type PromoRow = {
  _id: Types.ObjectId;
  code: string;
  percentage: number;
  count: number;
  minimumOrderValue: number;
  endsAt: Date;
};

type VideoRow = {
  _id: Types.ObjectId;
  title: string;
  videoUrl: string;
  caption?: string;
  productLink?: string;
  createdAt: Date;
};

export const customerHomeRouter = Router();

customerHomeRouter.get(
  "/home",
  asyncHandler(async (_req: Request, res: Response) => {
    const now = new Date();

    const [banners, categories, recentProducts, spotlightProducts, promos, videos] =
      await Promise.all([
        Banner.find().sort({ createdAt: -1 }).limit(6).lean<BannerRow[]>(),
        Category.find().sort({ name: 1 }).lean<CategoryRow[]>(),
        Product.find({ status: "active" })
          .select("title description brand price salePercentage stock colors sizes images createdAt")
          .sort({ createdAt: -1 })
          .limit(8)
          .lean<ProductRow[]>(),
        Product.find({ status: "active", isSpotlight: true })
          .select("title description brand price salePercentage stock colors sizes images createdAt")
          .sort({ createdAt: -1 })
          .limit(6)
          .lean<ProductRow[]>(),
        Promo.find({
          startsAt: { $lte: now },
          endsAt: { $gte: now },
          count: { $gt: 0 },
        })
          .sort({ createdAt: -1 })
          .limit(4)
          .lean<PromoRow[]>(),
        Video.find({ status: "active" })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean<VideoRow[]>(),
      ]);

    const activeSpotlight =
      spotlightProducts.length > 0
        ? spotlightProducts
        : recentProducts.slice(0, 4);

    const mapProduct = (item: ProductRow) => {
      const image =
        item.images.find((img) => img.isCover)?.url ||
        item.images[0]?.url ||
        "";

      const finalPrice = item.salePercentage
        ? Math.round(item.price - (item.price * item.salePercentage) / 100)
        : item.price;

      return {
        _id: String(item._id),
        title: item.title,
        description: item.description || "",
        brand: item.brand,
        image,
        price: item.price,
        finalPrice,
        salePercentage: item.salePercentage,
        stock: item.stock ?? 20,
        colors: item.colors ?? [],
        sizes: item.sizes ?? ["M"],
        createdAt: item.createdAt.toISOString(),
      };
    };

    res.json(
      ok({
        banners: banners.map((bannerItem) => ({
          _id: String(bannerItem._id),
          imageUrl: bannerItem.imageUrl,
          createdAt: bannerItem.createdAt.toISOString(),
        })),
        categories: categories.map((categoryItem) => ({
          _id: String(categoryItem._id),
          name: categoryItem.name,
        })),
        recentProducts: recentProducts.map(mapProduct),
        spotlightProducts: activeSpotlight.map(mapProduct),
        coupons: promos.map((promoItem) => ({
          _id: String(promoItem._id),
          code: promoItem.code,
          percentage: promoItem.percentage,
          count: promoItem.count,
          minimumOrderValue: promoItem.minimumOrderValue,
          endsAt: promoItem.endsAt.toISOString(),
        })),
        videos: (videos || []).map((v) => ({
          _id: String(v._id),
          title: v.title,
          videoUrl: v.videoUrl,
          caption: v.caption || "",
          productLink: v.productLink || "",
          createdAt: v.createdAt.toISOString(),
        })),
      }),
    );
  }),
);
