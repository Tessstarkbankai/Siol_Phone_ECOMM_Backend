import "dotenv/config";
import mongoose from "mongoose";
import { User } from "./models/User";
import { Banner } from "./models/Banner";
import { Category } from "./models/Category";
import { Product } from "./models/Product";
import { Promo } from "./models/Promo";

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
  ]);

  // Create or find a seed admin user
  let adminUser = await User.findOne({ role: "admin" });
  if (!adminUser) {
    adminUser = await User.create({
      clerkUserId: "seed_admin_user",
      name: "Store Admin",
      email: process.env.ADMIN_EMAILS || "sangammukherjee2022@gmail.com",
      role: "admin",
      points: 2500,
    });
  }

  console.log("Seeding Categories...");
  const categories = await Category.insertMany([
    { name: "Air Fryer" },
    { name: "Cookware" },
    { name: "Smart Appliances" },
    { name: "Induction Cooktops" },
    { name: "Nutri-blend" },
    { name: "Cooktops" },
    { name: "Coffee Machines" },
    { name: "Mixer Grinders" },
    { name: "Chimney" },
    { name: "Kitchen Tools" },
    { name: "Cookers" },
    { name: "OTGs" },
  ]);

  const [
    airFryerCat,
    cookwareCat,
    smartAppCat,
    inductionCat,
    nutriblendCat,
    cooktopsCat,
    coffeeCat,
    mixerCat,
    chimneyCat,
    toolsCat,
    cookersCat,
    otgCat,
  ] = categories;

  console.log("Seeding Banners...");
  await Banner.insertMany([
    {
      imageUrl:
        "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1600&q=80",
      imagePublicId: "seed_banner_1",
      createdBy: adminUser._id,
    },
    {
      imageUrl:
        "https://images.unsplash.com/photo-1584990347449-399a9a3b0485?auto=format&fit=crop&w=1600&q=80",
      imagePublicId: "seed_banner_2",
      createdBy: adminUser._id,
    },
    {
      imageUrl:
        "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=1600&q=80",
      imagePublicId: "seed_banner_3",
      createdBy: adminUser._id,
    },
  ]);

  console.log("Seeding Promos / Coupons...");
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await Promo.insertMany([
    {
      code: "WELCOME20",
      percentage: 20,
      count: 500,
      minimumOrderValue: 999,
      startsAt: yesterday,
      endsAt: thirtyDaysFromNow,
    },
    {
      code: "CHEF30",
      percentage: 30,
      count: 200,
      minimumOrderValue: 2499,
      startsAt: yesterday,
      endsAt: thirtyDaysFromNow,
    },
    {
      code: "FESTIVE15",
      percentage: 15,
      count: 1000,
      minimumOrderValue: 499,
      startsAt: yesterday,
      endsAt: thirtyDaysFromNow,
    },
    {
      code: "VIP50",
      percentage: 50,
      count: 50,
      minimumOrderValue: 4999,
      startsAt: yesterday,
      endsAt: thirtyDaysFromNow,
    },
  ]);

  console.log("Seeding Products with 4 Spotlight Innovations...");
  await Product.insertMany([
    // Spotlight 1: Roti Magic 2.0
    {
      title: "Roti Magic 2.0 Automatic Roti Maker",
      description:
        "Soft Rotis. Zero Effort. Pre-book for ₹ 9,999 today. ₹ 60,000 due before dispatch! Fresh piping hot rotis in 90 seconds.",
      category: smartAppCat._id,
      brand: "Wonderchef",
      price: 99000,
      salePercentage: 90,
      isSpotlight: true,
      stock: 30,
      status: "active",
      colors: ["#000000", "#FFFFFF"],
      sizes: ["M", "L"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_rm_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    // Spotlight 2: Chai Magic
    {
      title: "Chai Magic Automatic Tea Maker & Brewer",
      description:
        "Brewed to Perfection. 6+ Tea Presets, Fast Boil Technology, and One-Touch Authentic Indian Masala Chai Brewing.",
      category: coffeeCat._id,
      brand: "Wonderchef",
      price: 8500,
      salePercentage: 41,
      isSpotlight: true,
      stock: 45,
      status: "active",
      colors: ["#F6EEE3", "#D97706"],
      sizes: ["S", "M"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_chai_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    // Spotlight 3: Chef Magic
    {
      title: "Chef Magic Smart Automatic Cooking Robot",
      description:
        "Wi-Fi connected smart cooking robot with 200+ guided Indian and continental recipes, built-in precision scale, and automatic multi-stage cooking.",
      category: smartAppCat._id,
      brand: "Wonderchef",
      price: 59999,
      salePercentage: 17,
      isSpotlight: true,
      stock: 20,
      status: "active",
      colors: ["#0F172A"],
      sizes: ["L"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_sa_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    // Spotlight 4: Air Magic / OTG
    {
      title: "Crimson Edge Oven Toaster Griller 30L & Air Fryer",
      description:
        "Bake artisan pizzas, roast whole chicken, and 360° crispy air fry with 30L capacity, dual heating elements, and motorized rotisserie.",
      category: otgCat._id,
      brand: "Wonderchef",
      price: 14999,
      salePercentage: 40,
      isSpotlight: true,
      stock: 25,
      status: "active",
      colors: ["#DC2626", "#0F172A"],
      sizes: ["L"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_otg_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    // Regular Catalogue Products
    {
      title: "Crimson Edge 4.5L Digital Touch Air Fryer",
      description:
        "Rapid 360° air circulation technology delivers 90% less oil cooking with 8 pre-set smart touch programs and non-stick basket.",
      category: airFryerCat._id,
      brand: "Wonderchef",
      price: 6999,
      salePercentage: 35,
      isSpotlight: false,
      stock: 45,
      status: "active",
      colors: ["#111827", "#DC2626"],
      sizes: ["S", "M", "L"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_af_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Royal Velvet 4-Piece Non-Stick Cookware Set with Glass Lids",
      description:
        "Virgin grade aluminum with 5-layer MetaTuff non-stick coating, soft-touch ergonomic handles, and induction compatible base.",
      category: cookwareCat._id,
      brand: "Wonderchef",
      price: 5499,
      salePercentage: 40,
      isSpotlight: false,
      stock: 60,
      status: "active",
      colors: ["#7C2D12", "#1E293B", "#991B1B"],
      sizes: ["M", "L"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1584990347449-399a9a3b0485?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_cw_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Nutri-blend 500W High Speed Blender & Smoothie Maker",
      description:
        "India's best-selling compact all-in-one blender with 22,000 RPM high-torque motor, surgical stainless steel blades, and 2 unbreakable jars.",
      category: nutriblendCat._id,
      brand: "Wonderchef",
      price: 3999,
      salePercentage: 30,
      isSpotlight: false,
      stock: 55,
      status: "active",
      colors: ["#DC2626", "#000000", "#FFFFFF"],
      sizes: ["S", "M"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_nb_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Regalia 15 Bar Espresso & Cappuccino Coffee Machine",
      description:
        "Commercial-grade 15 bar high-pressure Italian pump creates rich crema espresso with integrated milk frothing wand for lattes and cappuccinos.",
      category: coffeeCat._id,
      brand: "Wonderchef",
      price: 12999,
      salePercentage: 30,
      isSpotlight: false,
      stock: 20,
      status: "active",
      colors: ["#1F2937", "#9CA3AF"],
      sizes: ["M"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_cm_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Power Induction Cooktop 2000W Smart Push Button",
      description:
        "Feather-touch controls with 7 Indian cooking presets, dual heat sensor, automatic voltage regulator, and crystal glass top surface.",
      category: inductionCat._id,
      brand: "Wonderchef",
      price: 3499,
      salePercentage: 25,
      isSpotlight: false,
      stock: 35,
      status: "active",
      colors: ["#111827"],
      sizes: ["M"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_ind_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Sumo Heavy Duty 1000W Mixer Grinder with 4 Jars",
      description:
        "Heavy copper armature motor with Flow Breaker jars and razor-sharp blades for tough Indian grinding like idli batter and whole spices.",
      category: mixerCat._id,
      brand: "Wonderchef",
      price: 7999,
      salePercentage: 35,
      isSpotlight: false,
      stock: 28,
      status: "active",
      colors: ["#DC2626", "#1E293B"],
      sizes: ["L"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_mg_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Taurus Hard Anodized 5L Pressure Cooker",
      description:
        "Heavy gauge hard anodized body with 60-micron thickness, anti-bulge induction base, and multi-tier safety valve system.",
      category: cookersCat._id,
      brand: "Wonderchef",
      price: 2999,
      salePercentage: 20,
      isSpotlight: false,
      stock: 50,
      status: "active",
      colors: ["#18181B"],
      sizes: ["M", "L"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1584990347449-399a9a3b0485?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_ck_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Gas Stove 3-Burner Forged Brass Glass Top Cooktop",
      description:
        "Shatter-proof 8mm toughened glass top, high-efficiency heavy forged brass burners, powder-coated pan supports, and 360° swivel gas inlet.",
      category: cooktopsCat._id,
      brand: "Wonderchef",
      price: 6499,
      salePercentage: 25,
      isSpotlight: false,
      stock: 30,
      status: "active",
      colors: ["#000000"],
      sizes: ["L"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_ct_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Filterless Auto-Clean Curved Glass Kitchen Chimney 60cm",
      description:
        "1200 m3/hr suction power with motion sensor gesture control, auto-clean thermal heating, and bright LED task lights.",
      category: chimneyCat._id,
      brand: "Wonderchef",
      price: 14999,
      salePercentage: 35,
      isSpotlight: false,
      stock: 15,
      status: "active",
      colors: ["#111827"],
      sizes: ["M"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_ch_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
    {
      title: "Turbo Dual-Speed String Chopper XL",
      description:
        "Japanese 6-blade stainless steel mechanism with 900ml transparent bowl for chopping vegetables, fruits, nuts, and herbs in seconds.",
      category: toolsCat._id,
      brand: "Wonderchef",
      price: 999,
      salePercentage: 20,
      isSpotlight: false,
      stock: 100,
      status: "active",
      colors: ["#DC2626", "#16A34A"],
      sizes: ["S", "M"],
      images: [
        {
          url: "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=800&q=80",
          publicId: "prod_tl_1",
          isCover: true,
        },
      ],
      createdBy: adminUser._id,
    },
  ]);

  console.log("Database seeded successfully with authentic spotlight & catalogue products! 🎉");
  await mongoose.disconnect();
}

seedDatabase().catch((err) => {
  console.error("Failed to seed database:", err);
  process.exit(1);
});
