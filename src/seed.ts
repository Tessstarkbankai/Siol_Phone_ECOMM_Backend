import "dotenv/config";
import mongoose from "mongoose";
import { User } from "./models/User";
import { Banner } from "./models/Banner";
import { Category } from "./models/Category";
import { Product } from "./models/Product";
import { Promo } from "./models/Promo";
import { Video } from "./models/Video";

async function seedDatabase() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI environment variable is not defined");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully.");

  // Clear existing collections
  console.log("Cleaning old data...");
  await Promise.all([
    Banner.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Promo.deleteMany({}),
    Video.deleteMany({}),
  ]);

  // Create or find a seed admin user
  let adminUser = await User.findOne({ role: "admin" });
  if (!adminUser) {
    adminUser = await User.create({
      clerkUserId: "seed_admin_user",
      name: "Store Admin",
      email: process.env.ADMIN_EMAILS || "sangammukherjee2022@gmail.com",
      role: "admin",
      points: 5000,
    });
  }

  console.log("Seeding Smartphone Categories...");
  const categories = await Category.insertMany([
    { name: "Flagship Smartphones" },
    { name: "Foldables & Flips" },
    { name: "Pro Camera Phones" },
    { name: "Ultra Gaming Phones" },
    { name: "5G Performance" },
    { name: "Budget 5G" },
    { name: "Smart Watches & Bands" },
    { name: "TWS Audio & Buds" },
    { name: "MagSafe & Power Banks" },
    { name: "GaN Fast Chargers" },
    { name: "Cases & Screen Protectors" },
    { name: "Tablets & iPads" },
  ]);

  const [
    flagshipCat,
    foldablesCat,
    cameraCat,
    gamingCat,
    perfCat,
    budgetCat,
    watchesCat,
    audioCat,
    magsafeCat,
    chargersCat,
    casesCat,
    tabletsCat,
  ] = categories;

  console.log("Seeding Banners...");
  await Banner.insertMany([
    {
      imageUrl:
        "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1600&q=80",
      imagePublicId: "seed_banner_1",
      createdBy: adminUser._id,
    },
    {
      imageUrl:
        "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1600&q=80",
      imagePublicId: "seed_banner_2",
      createdBy: adminUser._id,
    },
    {
      imageUrl:
        "https://unsplash.com/photos/black-iphone-7-on-macbook-pro-Imc_FwGf92U",
      imagePublicId: "seed_banner_3",
      createdBy: adminUser._id,
    },
  ]);

  console.log("Seeding Promos / Coupons...");
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await Promo.insertMany([
    {
      code: "NEXUS20",
      percentage: 20,
      count: 500,
      minimumOrderValue: 999,
      startsAt: yesterday,
      endsAt: thirtyDaysFromNow,
    },
    {
      code: "FLAGSHIP10",
      percentage: 10,
      count: 300,
      minimumOrderValue: 4999,
      startsAt: yesterday,
      endsAt: thirtyDaysFromNow,
    },
    {
      code: "EXCHANGE5K",
      percentage: 15,
      count: 200,
      minimumOrderValue: 19999,
      startsAt: yesterday,
      endsAt: thirtyDaysFromNow,
    },
    {
      code: "PROMOSMART",
      percentage: 25,
      count: 100,
      minimumOrderValue: 2999,
      startsAt: yesterday,
      endsAt: thirtyDaysFromNow,
    },
  ]);

  console.log("Seeding Video Reels...");
  await Video.insertMany([
    {
      title: "iPhone 16 Pro Max 4K 120fps Cinematic Test",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      videoPublicId: "reel_1",
      caption: "A18 Pro Camera Review",
      status: "active",
      createdBy: adminUser._id,
    },
    {
      title: "Galaxy S25 Ultra 100x Space Zoom & AI Astrophotography",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      videoPublicId: "reel_2",
      caption: "Galaxy AI Zoom Test",
      status: "active",
      createdBy: adminUser._id,
    },
    {
      title: "Galaxy Z Fold6 Multitasking & S-Pen Experience",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
      videoPublicId: "reel_3",
      caption: "Dual Display Productivity",
      status: "active",
      createdBy: adminUser._id,
    },
    {
      title: "Pixel 9 Pro XL Gemini Live & Magic Audio Eraser",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
      videoPublicId: "reel_4",
      caption: "Google Tensor G4 AI",
      status: "active",
      createdBy: adminUser._id,
    },
    {
      title: "OnePlus 13 120Hz Ray Tracing Gaming Benchmark",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
      videoPublicId: "reel_5",
      caption: "Snapdragon 8 Elite 6000mAh",
      status: "active",
      createdBy: adminUser._id,
    },
  ]);

  console.log("Seeding Products with 4 Spotlight Innovations...");
  await Product.insertMany([
    // Spotlight 1: Apple iPhone 16 Pro Max
    {
      title: "Apple iPhone 16 Pro Max Titanium 5G",
      description:
        "Titanium. So strong. So light. So Pro. Featuring the groundbreaking A18 Pro chip, 48MP Fusion Camera with Camera Control button, and 4K 120 fps Dolby Vision recording.",
      category: flagshipCat._id,
      brand: "Apple",
      price: 144900,
      salePercentage: 10,
      isSpotlight: true,
      stock: 35,
      status: "active",
      colors: ["#504B43", "#1C1C1E", "#E3E4E5", "#D4C7B8"],
      sizes: ["256GB", "512GB", "1TB"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_iphone16promax_1",
          isCover: true,
        },
        {
          url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_iphone16promax_2",
          isCover: false,
        },
      ],
      createdBy: adminUser._id,
    },
    // Spotlight 2: Samsung Galaxy S25 Ultra
    {
      title: "Samsung Galaxy S25 Ultra 5G AI Flagship",
      description:
        "Galaxy AI is here. Powered by Snapdragon 8 Elite for Galaxy, 200MP Quad Telephoto camera with 100x Space Zoom, built-in S-Pen, and Grade 5 Titanium frame with Corning Gorilla Armor.",
      category: flagshipCat._id,
      brand: "Samsung",
      price: 129999,
      salePercentage: 12,
      isSpotlight: true,
      stock: 40,
      status: "active",
      colors: ["#717378", "#1E2024", "#4B4453", "#F2EBD9"],
      sizes: ["256GB", "512GB", "1TB"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_s25ultra_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    // Spotlight 3: Samsung Galaxy Z Fold6
    {
      title: "Samsung Galaxy Z Fold6 5G AI Dual Screen",
      description:
        "Ultra-slim foldable with 7.6-inch Dynamic AMOLED 2X main display, ray-tracing gaming performance, Circle to Search with Google, and Armor Aluminum hinge durability.",
      category: foldablesCat._id,
      brand: "Samsung",
      price: 164999,
      salePercentage: 15,
      isSpotlight: true,
      stock: 25,
      status: "active",
      colors: ["#B8C0C8", "#1C2430", "#E8D4D8"],
      sizes: ["256GB", "512GB", "1TB"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_zfold6_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    // Spotlight 4: Google Pixel 9 Pro XL
    {
      title: "Google Pixel 9 Pro XL 5G AI Studio",
      description:
        "Engineered by Google, designed for Gemini AI. Google Tensor G4 processor, pro triple camera system with Super Res Zoom 30x, Magic Editor, and 7 years of OS & security updates.",
      category: cameraCat._id,
      brand: "Google",
      price: 124999,
      salePercentage: 14,
      isSpotlight: true,
      stock: 30,
      status: "active",
      colors: ["#1F2022", "#F0EDE6", "#7D837F", "#E9D5DA"],
      sizes: ["128GB", "256GB", "512GB"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1511707171634-5f897ff02560?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_pixel9pro_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    // Catalogue Products
    {
      title: "OnePlus 13 5G Flagship Killer Snapdragon 8 Elite",
      description:
        "Extreme performance with Snapdragon 8 Elite, 6000mAh Glacier Battery, 100W SUPERVOOC + 50W AIRVOOC, Hasselblad 50MP Triple Master Camera, and 2K 120Hz ProXDR display.",
      category: perfCat._id,
      brand: "OnePlus",
      price: 69999,
      salePercentage: 10,
      isSpotlight: false,
      stock: 45,
      status: "active",
      colors: ["#1A1A1A", "#2E473B", "#F5F5F7"],
      sizes: ["256GB", "512GB"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_op13_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Nothing Phone (2a) Plus 5G Transparent Edition",
      description:
        "Iconic Glyph Interface with custom LED glyph patterns, MediaTek Dimensity 7350 Pro 5G processor, dual 50MP studio cameras, and clean Nothing OS 2.6.",
      category: perfCat._id,
      brand: "Nothing",
      price: 27999,
      salePercentage: 18,
      isSpotlight: false,
      stock: 60,
      status: "active",
      colors: ["#75787B", "#111111", "#F8F8F8"],
      sizes: ["128GB", "256GB"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_nothing2a_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Xiaomi 15 Ultra 5G Leica Quad Camera Co-Engineered",
      description:
        "1-inch Sony LYT-900 primary sensor with 200MP periscope telephoto, Snapdragon 8 Elite, 90W wired + 80W wireless hyper-charging, and Quad-curved WQHD+ AMOLED.",
      category: cameraCat._id,
      brand: "Xiaomi",
      price: 99999,
      salePercentage: 15,
      isSpotlight: false,
      stock: 35,
      status: "active",
      colors: ["#141416", "#E5E7EB"],
      sizes: ["256GB", "512GB", "1TB"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_xiaomi15_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "ASUS ROG Phone 9 Pro 185Hz Esports Gaming Phone",
      description:
        "The ultimate gaming weapon: 185Hz LTPO AMOLED, Snapdragon 8 Elite with GameCool 9 active cooling, programmable AniMe Vision LED back matrix, and AirTrigger ultrasonic controls.",
      category: gamingCat._id,
      brand: "ASUS",
      price: 109999,
      salePercentage: 8,
      isSpotlight: false,
      stock: 20,
      status: "active",
      colors: ["#0B0C10"],
      sizes: ["512GB", "1TB"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_rog9_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Apple AirPods Pro (2nd Gen) with MagSafe Case (USB-C)",
      description:
        "Up to 2x more Active Noise Cancellation, Adaptive Audio, Transparency mode, Personalized Spatial Audio with dynamic head tracking, and IP54 dust, sweat, and water resistance.",
      category: audioCat._id,
      brand: "Apple",
      price: 24900,
      salePercentage: 12,
      isSpotlight: false,
      stock: 50,
      status: "active",
      colors: ["#FFFFFF"],
      sizes: ["S", "M", "L"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_airpodspro_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Samsung Galaxy Watch Ultra 47mm LTE Titanium",
      description:
        "Grade 4 Titanium cushion design, 100-hour battery life in power save mode, Dual-Frequency GPS (L1+L5), Siren alarm, water resistance up to 10 ATM / 100m, and AI Energy Score.",
      category: watchesCat._id,
      brand: "Samsung",
      price: 59999,
      salePercentage: 17,
      isSpotlight: false,
      stock: 25,
      status: "active",
      colors: ["#48494B", "#F5F5F7", "#D97706"],
      sizes: ["L"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_watchultra_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Anker MagGo 3-in-1 Qi2 15W Fast Wireless Charging Station",
      description:
        "Officially certified Qi2 15W ultra-fast wireless charging stand for iPhone 16/15/14, Apple Watch Series 10/Ultra, and AirPods. Foldable travel-ready aerospace aluminum construction.",
      category: magsafeCat._id,
      brand: "Anker",
      price: 8999,
      salePercentage: 20,
      isSpotlight: false,
      stock: 45,
      status: "active",
      colors: ["#1F2937", "#FFFFFF"],
      sizes: ["M"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_anker3in1_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Baseus 140W GaN Pro 4-Port Multi-Device Turbo Fast Charger",
      description:
        "Next-generation Gallium Nitride (GaN 5) technology with 3x USB-C and 1x USB-A ports. Powers MacBook Pro, iPhone 16 Pro, Galaxy S25 Ultra, and iPad simultaneously at full speeds.",
      category: chargersCat._id,
      brand: "Baseus",
      price: 5499,
      salePercentage: 25,
      isSpotlight: false,
      stock: 65,
      status: "active",
      colors: ["#111827"],
      sizes: ["M"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_baseus140w_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
  ]);

  console.log("Database seeded successfully with authentic Apple & Samsung inspired flagship mobile phone inventory! 🚀");
  await mongoose.disconnect();
}

seedDatabase().catch((err) => {
  console.error("Failed to seed database:", err);
  process.exit(1);
});
