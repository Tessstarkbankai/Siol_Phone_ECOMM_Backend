import "dotenv/config";
import express from "express";
import { connectDB } from "./db";
import cors from "cors";
import morgan from "morgan";
import { ok } from "./utils/envelope";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorhandler";
import { clerkMiddleware } from "@clerk/express";
import path from "path";
import { authRouter } from "./routes/auth/auth.routes";
import { adminProductRouter } from "./routes/admin/product.routes";
import { customerProductRouter } from "./routes/customer/product.routes";
import { customerAddressRouter } from "./routes/customer/address.routes";
import { adminPromoRouter } from "./routes/admin/promo.routes";
import { customerPromoRouter } from "./routes/customer/promo.routes";
import { customerCartWishlistRouter } from "./routes/customer/cart-wishlist.routes";
import { customerCheckoutRouter } from "./routes/customer/checkout.routes";
import { customerOrderRouter } from "./routes/customer/orders.routes";
import { customerCheckoutWithPointsRouter } from "./routes/customer/checkout-with-points.routes";
import { adminOrderRouter } from "./routes/admin/orders.routes";
import { adminSettingsRouter } from "./routes/admin/settings.routes";
import { adminDashboardRouter } from "./routes/admin/dashboard.routes";
import { adminVideoRouter } from "./routes/admin/video.routes";
import { customerHomeRouter } from "./routes/customer/home.routes";
import { customerVendorApplyRouter } from "./routes/customer/vendor-apply.routes";
import { customerStorefrontRouter } from "./routes/customer/storefront.routes";
import { customerReviewRouter } from "./routes/customer/review.routes";
import { adminVendorManageRouter } from "./routes/admin/vendor-manage.routes";
import { adminProductModerationRouter } from "./routes/admin/product-moderation.routes";
import { adminPayoutRouter } from "./routes/admin/payout.routes";
import { customerDistributorRouter } from "./routes/customer/distributor.routes";
import { adminDistributorRouter } from "./routes/admin/distributor-manage.routes";
import { vendorProductRouter } from "./routes/vendor/product.routes";
import { vendorOrderRouter } from "./routes/vendor/orders.routes";
import { vendorProfileRouter } from "./routes/vendor/profile.routes";
import { vendorDashboardRouter } from "./routes/vendor/dashboard.routes";
import { vendorPayoutRouter } from "./routes/vendor/payout.routes";

async function mainEntryFunction() {
  await connectDB();

  const app = express();

  const allowedOrigins = (
    process.env.CORS_ORIGINS ||
    "http://localhost:3000,http://localhost:5173,https://siol-phone-ecomm-backend.onrender.com,https://siol-phone-ecomm-frontend.vercel.app"
  )
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  if (!allowedOrigins.includes("https://siol-phone-ecomm-frontend.vercel.app")) {
    allowedOrigins.push("https://siol-phone-ecomm-frontend.vercel.app");
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const normalized = origin.replace(/\/+$/, "");

        // Allow explicitly listed origins or wildcard or frontend domain
        if (
          allowedOrigins.includes(normalized) ||
          allowedOrigins.includes("*") ||
          normalized.includes("siol-phone-ecomm-frontend")
        ) {
          return callback(null, true);
        }

        // Allow localhost and 127.0.0.1 on any port for local development
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
          return callback(null, true);
        }

        // Allow common hosted frontend environments
        if (
          normalized.endsWith(".vercel.app") ||
          normalized.endsWith(".netlify.app") ||
          normalized.endsWith(".onrender.com")
        ) {
          return callback(null, true);
        }

        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
      ],
    }),
  );

  app.use(express.json());
  app.use(morgan("dev"));
  app.use(clerkMiddleware());

  // Static uploads directory for media files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.get("/", (req, res) => {
    res.send("API is running 🚀");
  });
  app.get("/health", (_req, res) => {
    res.status(200).json(ok({ message: "Server is healthy/in running state" }));
  });

  // auth routes
  app.use("/auth", authRouter);

  // customer routes
  app.use("/customer", customerDistributorRouter);
  app.use("/customer/distributor", customerDistributorRouter);
  app.use("/customer", customerHomeRouter);
  app.use("/customer", customerProductRouter);
  app.use("/customer", customerStorefrontRouter);
  app.use("/customer", customerReviewRouter);
  app.use("/customer", customerAddressRouter);
  app.use("/customer", customerPromoRouter);
  app.use("/customer", customerCartWishlistRouter);
  app.use("/customer", customerCheckoutRouter);
  app.use("/customer", customerCheckoutWithPointsRouter);
  app.use("/customer", customerOrderRouter);
  app.use("/customer", customerVendorApplyRouter);

  // admin routes
  app.use("/admin", adminDistributorRouter);
  app.use("/admin/distributors", adminDistributorRouter);
  app.use("/admin", adminProductModerationRouter);
  app.use("/admin", adminVendorManageRouter);
  app.use("/admin", adminPayoutRouter);
  app.use("/admin", adminProductRouter);
  app.use("/admin", adminPromoRouter);
  app.use("/admin", adminOrderRouter);
  app.use("/admin", adminSettingsRouter);
  app.use("/admin", adminDashboardRouter);
  app.use("/admin", adminVideoRouter);

  // vendor routes
  app.use("/vendor", vendorProductRouter);
  app.use("/vendor", vendorOrderRouter);
  app.use("/vendor", vendorProfileRouter);
  app.use("/vendor", vendorDashboardRouter);
  app.use("/vendor", vendorPayoutRouter);

  app.use(notFound);
  app.use(errorHandler);

  const port = Number(process.env.PORT || 5000);

  app.listen(port, () => {
    console.log(`Server is now listening to port ${port}`);
  });
}

mainEntryFunction().catch((err) => {
  console.error("failed to start", err);
  process.exit(1);
});
