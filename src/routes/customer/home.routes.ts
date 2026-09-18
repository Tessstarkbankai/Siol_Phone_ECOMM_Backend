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
  spotlightCategory?: "smartphone" | "feature_phone" | "none";
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

    const [
      banners,
      categories,
      recentProducts,
      spotlightSmartphoneProducts,
      spotlightFeaturePhoneProducts,
      promos,
      videos,
      communityImages,
    ] = await Promise.all([
      Banner.find().sort({ order: 1, createdAt: -1 }).limit(20).lean<BannerRow[]>(),
      Category.find().sort({ name: 1 }).lean<CategoryRow[]>(),
      Product.find({ status: "active" })
        .select("title description brand price salePercentage stock colors sizes images createdAt")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean<ProductRow[]>(),
      Product.find({
        status: "active",
        $or: [
          { spotlightCategory: "smartphone" },
          { isSpotlight: true, spotlightCategory: { $ne: "feature_phone" } },
        ],
      })
        .select("title description brand price salePercentage stock colors sizes images createdAt")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean<ProductRow[]>(),
      Product.find({
        status: "active",
        spotlightCategory: "feature_phone",
      })
        .select("title description brand price salePercentage stock colors sizes images createdAt")
        .sort({ createdAt: -1 })
        .limit(8)
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

    const activeSmartphoneSpotlight =
      spotlightSmartphoneProducts.length > 0
        ? spotlightSmartphoneProducts
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

    const FALLBACK_FEATURE_PHONES = [
      {
        _id: "fp_siol_classic",
        title: "SiOL Classic 4G VoLTE Keypad Phone",
        description: "Legendary 28-day standby battery, crystal-clear VoLTE calling, wireless FM radio, and high-intensity LED torch.",
        brand: "SiOL",
        image: "/categories/feature-phone.png",
        price: 2499,
        finalPrice: 1999,
        salePercentage: 20,
        stock: 50,
        colors: ["#1e293b", "#0284c7"],
        sizes: ["VoLTE Edition"],
        createdAt: new Date().toISOString(),
      },
      {
        _id: "fp_nokia_3210",
        title: "Nokia 3210 4G Heritage Retro Edition",
        description: "Iconic Y2K design reimagined with 4G connectivity, Bluetooth 5.0, 1450mAh battery, and classic Snake game.",
        brand: "Nokia",
        image: "/Frame 1984079653.png",
        price: 4499,
        finalPrice: 3999,
        salePercentage: 11,
        stock: 40,
        colors: ["#eab308", "#0f172a"],
        sizes: ["Heritage Edition"],
        createdAt: new Date().toISOString(),
      },
      {
        _id: "fp_jiophone_prima",
        title: "JioPhone Prima 4G Smart Feature Phone",
        description: "KaiOS smart keypad phone with UPI digital payments, WhatsApp, YouTube, and front/rear cameras.",
        brand: "JioPhone",
        image: "/Frame 1984079647.png",
        price: 2999,
        finalPrice: 2599,
        salePercentage: 13,
        stock: 35,
        colors: ["#0284c7", "#e11d48"],
        sizes: ["4G Smart"],
        createdAt: new Date().toISOString(),
      },
      {
        _id: "fp_siol_power",
        title: "SiOL Power 1000 Marathon Keypad Phone",
        description: "Massive 3000mAh reverse-charging powerbank battery, dual SIM, ultra-loud 3D box speaker, and rugged drop-proof shell.",
        brand: "SiOL",
        image: "/categories/feature-phone.png",
        price: 2799,
        finalPrice: 2299,
        salePercentage: 17,
        stock: 45,
        colors: ["#15803d", "#0f172a"],
        sizes: ["Marathon 3000mAh"],
        createdAt: new Date().toISOString(),
      },
    ];

    const activeFeaturePhoneSpotlight =
      spotlightFeaturePhoneProducts.length > 0
        ? spotlightFeaturePhoneProducts.map(mapProduct)
        : FALLBACK_FEATURE_PHONES;

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
        spotlightProducts: activeSmartphoneSpotlight.map(mapProduct),
        spotlightSmartphoneProducts: activeSmartphoneSpotlight.map(mapProduct),
        spotlightFeaturePhoneProducts: activeFeaturePhoneSpotlight,
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
