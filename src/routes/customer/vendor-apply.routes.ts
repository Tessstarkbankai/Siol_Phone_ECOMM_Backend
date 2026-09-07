import { Router, type Request, type Response } from "express";
import multer from "multer";
import { getDbUserFromReq, requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Vendor } from "../../models/Vendor";
import { User } from "../../models/User";
import { ok } from "../../utils/envelope";
import { requireFound, requireText } from "../../utils/helpers";
import { AppError } from "../../utils/AppError";
import { uploadSingleBufferToCloudinary } from "../../utils/cloudinary";
import { encryptText, maskAccountNumber } from "../../utils/crypto";

export const customerVendorApplyRouter = Router();

customerVendorApplyRouter.use("/vendor", requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Check current vendor status of logged-in customer
customerVendorApplyRouter.get(
  "/vendor/status",
  asyncHandler(async (req: Request, res: Response) => {
    const dbUser = await getDbUserFromReq(req);
    const vendor = await Vendor.findOne({ user: dbUser._id });

    if (!vendor) {
      res.json(
        ok({
          hasApplied: false,
          status: null,
          role: dbUser.role,
        }),
      );
      return;
    }

    res.json(
      ok({
        hasApplied: true,
        vendorId: String(vendor._id),
        status: vendor.status,
        storeName: vendor.storeName,
        storeSlug: vendor.storeSlug,
        rejectionReason: vendor.rejectionReason || undefined,
        commissionRate: vendor.commissionRate,
        role: dbUser.role,
      }),
    );
  }),
);

// Submit or re-submit vendor application
customerVendorApplyRouter.post(
  "/vendor/apply",
  upload.fields([
    { name: "storeLogo", maxCount: 1 },
    { name: "storeBanner", maxCount: 1 },
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const dbUser = await getDbUserFromReq(req);

    const existingVendor = await Vendor.findOne({ user: dbUser._id });
    if (existingVendor && existingVendor.status === "approved") {
      throw new AppError(400, "You are already an approved seller!");
    }
    if (existingVendor && existingVendor.status === "pending") {
      throw new AppError(
        400,
        "Your seller application is already under review.",
      );
    }

    const storeName = String(req.body.storeName || "").trim();
    const description = String(req.body.description || "").trim();
    const businessEmail = String(
      req.body.businessEmail || dbUser.email || "",
    ).trim();
    const businessPhone = String(req.body.businessPhone || "").trim();
    const gstNumber = String(req.body.gstNumber || "").trim();

    // Bank Details
    const accountHolderName = String(
      req.body.accountHolderName || dbUser.name || "",
    ).trim();
    const accountNumber = String(req.body.accountNumber || "").trim();
    const ifsc = String(req.body.ifsc || "").trim().toUpperCase();
    const upiId = String(req.body.upiId || "").trim();

    requireText(storeName, "Store name is required");
    requireText(description, "Store description is required");
    requireText(businessEmail, "Business email is required");
    requireText(businessPhone, "Business phone is required");
    requireText(accountHolderName, "Bank account holder name is required");
    requireText(accountNumber, "Bank account number is required");
    requireText(ifsc, "Bank IFSC code is required");

    // Ensure unique storeName across vendors
    const duplicateName = await Vendor.findOne({
      storeName: { $regex: new RegExp(`^${storeName}$`, "i") },
      ...(existingVendor ? { _id: { $ne: existingVendor._id } } : {}),
    });

    if (duplicateName) {
      throw new AppError(
        400,
        "A store with this name already exists. Please choose a different name.",
      );
    }

    let baseSlug = generateSlug(storeName) || "store";
    let storeSlug = baseSlug;
    let collision = await Vendor.findOne({
      storeSlug,
      ...(existingVendor ? { _id: { $ne: existingVendor._id } } : {}),
    });

    if (collision) {
      storeSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;

    let storeLogo = existingVendor?.storeLogo || { url: "", publicId: "" };
    let storeBanner = existingVendor?.storeBanner || { url: "", publicId: "" };

    const folderPrefix = `marketplace/vendors/${String(dbUser._id)}/profile`;

    if (files?.storeLogo && files.storeLogo[0]) {
      const uploadRes = await uploadSingleBufferToCloudinary(
        files.storeLogo[0].buffer,
        `${folderPrefix}/logo`,
      );
      storeLogo = { url: uploadRes.url, publicId: uploadRes.publicId };
    }

    if (files?.storeBanner && files.storeBanner[0]) {
      const uploadRes = await uploadSingleBufferToCloudinary(
        files.storeBanner[0].buffer,
        `${folderPrefix}/banner`,
      );
      storeBanner = { url: uploadRes.url, publicId: uploadRes.publicId };
    }

    const accountNumberMasked = maskAccountNumber(accountNumber);
    const accountNumberEncrypted = encryptText(accountNumber);

    const bankDetails = {
      accountHolderName,
      accountNumberMasked,
      accountNumberEncrypted,
      ifsc,
      upiId,
    };

    let vendorDoc;
    if (existingVendor) {
      // Re-applying after rejection
      existingVendor.storeName = storeName;
      existingVendor.storeSlug = storeSlug;
      existingVendor.description = description;
      existingVendor.businessEmail = businessEmail;
      existingVendor.businessPhone = businessPhone;
      existingVendor.gstNumber = gstNumber;
      existingVendor.bankDetails = bankDetails;
      existingVendor.storeLogo = storeLogo;
      existingVendor.storeBanner = storeBanner;
      existingVendor.status = "pending";
      existingVendor.rejectionReason = "";
      vendorDoc = await existingVendor.save();
    } else {
      vendorDoc = await Vendor.create({
        user: dbUser._id,
        storeName,
        storeSlug,
        description,
        businessEmail,
        businessPhone,
        gstNumber,
        bankDetails,
        storeLogo,
        storeBanner,
        status: "pending",
      });
    }

    res.status(201).json(
      ok({
        message:
          "Your application to become a seller has been submitted and is under review.",
        vendor: {
          id: String(vendorDoc._id),
          storeName: vendorDoc.storeName,
          storeSlug: vendorDoc.storeSlug,
          status: vendorDoc.status,
        },
      }),
    );
  }),
);
