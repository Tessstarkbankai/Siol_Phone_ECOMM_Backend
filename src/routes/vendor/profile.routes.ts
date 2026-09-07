import { Router, type Request, type Response } from "express";
import multer from "multer";
import { requireVendor, getVendorFromReq } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { Vendor } from "../../models/Vendor";
import { ok } from "../../utils/envelope";
import { requireFound, requireText } from "../../utils/helpers";
import { uploadSingleBufferToCloudinary } from "../../utils/cloudinary";

export const vendorProfileRouter = Router();

vendorProfileRouter.use(requireVendor);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// Get vendor storefront profile
vendorProfileRouter.get(
  "/profile",
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = (req as any).vendor || (await getVendorFromReq(req));
    const fullVendor = await Vendor.findById(vendor._id);
    const found = requireFound(fullVendor, "Vendor not found", 404);

    res.json(ok(found));
  }),
);

// Update vendor storefront profile
vendorProfileRouter.put(
  "/profile",
  upload.fields([
    { name: "storeLogo", maxCount: 1 },
    { name: "storeBanner", maxCount: 1 },
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const vendor = (req as any).vendor || (await getVendorFromReq(req));
    const fullVendor = await Vendor.findById(vendor._id);
    const foundVendor = requireFound(fullVendor, "Vendor not found", 404);

    const description = String(req.body.description ?? foundVendor.description).trim();
    const businessPhone = String(req.body.businessPhone ?? foundVendor.businessPhone).trim();
    const businessEmail = String(req.body.businessEmail ?? foundVendor.businessEmail).trim();

    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;

    const folderPrefix = `marketplace/vendors/${String(foundVendor._id)}/profile`;

    if (files?.storeLogo && files.storeLogo[0]) {
      const uploadRes = await uploadSingleBufferToCloudinary(
        files.storeLogo[0].buffer,
        `${folderPrefix}/logo`,
      );
      foundVendor.storeLogo = {
        url: uploadRes.url,
        publicId: uploadRes.publicId,
      };
    }

    if (files?.storeBanner && files.storeBanner[0]) {
      const uploadRes = await uploadSingleBufferToCloudinary(
        files.storeBanner[0].buffer,
        `${folderPrefix}/banner`,
      );
      foundVendor.storeBanner = {
        url: uploadRes.url,
        publicId: uploadRes.publicId,
      };
    }

    foundVendor.description = description;
    foundVendor.businessPhone = businessPhone;
    foundVendor.businessEmail = businessEmail;

    await foundVendor.save();

    res.json(
      ok({
        message: "Storefront profile updated successfully",
        vendor: foundVendor,
      }),
    );
  }),
);
