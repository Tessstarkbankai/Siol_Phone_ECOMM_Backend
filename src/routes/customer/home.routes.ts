import { Router, type Request, type Response } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler";
import { Banner } from "../../models/Banner";
import { Category } from "../../models/Category";
import { Product, ProductSize } from "../../models/Product";
import { Promo } from "../../models/Promo";
import { Video } from "../../models/Video";
import { CommunityImage } from "../../models/CommunityImage";
import { ok } from "../../utils/envelope";

type BannerRow = {
  _id: Types.ObjectId;
  mediaType?: "image" | "video";
  imageUrl?: string;
  videoUrl?: string;
  title?: string;
  tagline?: string;
  link?: string;
  order?: number;
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

type CommunityImageRow = {
  _id: Types.ObjectId;
  imageUrl: string;
  title?: string;
  hashtag?: string;
  link?: string;
  order?: number;
  createdAt: Date;
};

export const customerHomeRouter = Router();

customerHomeRouter.get(
  "/home",
  asyncHandler(async (_req: Request, res: Response) => {
    const now = new Date();

    const [banners, categories, recentProducts, spotlightProducts, promos, videos, communityImages] =
      await Promise.all([
        Banner.find().sort({ order: 1, createdAt: -1 }).limit(20).lean<BannerRow[]>(),
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
        CommunityImage.find()
          .sort({ order: 1, createdAt: -1 })
          .limit(20)
          .lean<CommunityImageRow[]>(),
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
          mediaType: bannerItem.mediaType || "image",
          imageUrl: bannerItem.imageUrl || "",
          videoUrl: bannerItem.videoUrl || "",
          title: bannerItem.title || "",
          tagline: bannerItem.tagline || "",
          link: bannerItem.link || "",
          order: typeof bannerItem.order === "number" ? bannerItem.order : 0,
          createdAt: bannerItem.createdAt ? bannerItem.createdAt.toISOString() : new Date().toISOString(),
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
        communityImages:
          communityImages.length > 0
            ? communityImages.map((c) => ({
                _id: String(c._id),
                imageUrl: c.imageUrl,
                title: c.title || "SiOL Community",
                hashtag: c.hashtag || "#SiOLCommunity",
                link: c.link || "",
              }))
            : banners
                .filter((b) => Boolean(b.imageUrl))
                .map((b) => ({
                  _id: String(b._id),
                  imageUrl: b.imageUrl || "",
                  title: b.title || "SiOL Flagship Experience",
                  hashtag: "#SiOLCommunity",
                  link: b.link || "",
                })),
      }),
    );
  }),
);
