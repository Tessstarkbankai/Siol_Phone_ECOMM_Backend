import { Router, type Request, type Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { DistributorApplication } from "../../models/DistributorApplication";
import { getDbUserFromReq } from "../../middleware/auth";
import { ok } from "../../utils/envelope";
import { requireText } from "../../utils/helpers";
import { AppError } from "../../utils/AppError";

export const customerDistributorRouter = Router();

// Submit Distributor Application
customerDistributorRouter.post(
  ["/distributor/apply", "/apply"],
  asyncHandler(async (req: Request, res: Response) => {
    let dbUser = null;
    try {
      dbUser = await getDbUserFromReq(req);
    } catch {
      // Optional authentication: Guest applications also supported
    }

    const companyName = String(req.body.companyName || "").trim();
    const entityType = String(req.body.entityType || "").trim();
    const yearsInBusiness = Number(req.body.yearsInBusiness || 0);
    const contactPerson = String(req.body.contactPerson || "").trim();
    const designation = String(req.body.designation || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const alternatePhone = String(req.body.alternatePhone || "").trim();
    const gstNumber = String(req.body.gstNumber || "").trim().toUpperCase();
    const panNumber = String(req.body.panNumber || "").trim().toUpperCase();
    const address = String(req.body.address || "").trim();
    const city = String(req.body.city || "").trim();
    const state = String(req.body.state || "").trim();
    const pincode = String(req.body.pincode || "").trim();
    const warehouseArea = String(req.body.warehouseArea || "").trim();
    const logisticsFleet = String(req.body.logisticsFleet || "").trim();
    const annualTurnover = String(req.body.annualTurnover || "").trim();
    const expectedMonthlyVolume = String(
      req.body.expectedMonthlyVolume || "",
    ).trim();
    const proposalNote = String(req.body.proposalNote || "").trim();

    // Arrays
    const operatingTerritory = Array.isArray(req.body.operatingTerritory)
      ? req.body.operatingTerritory
      : typeof req.body.operatingTerritory === "string" &&
        req.body.operatingTerritory.trim()
      ? [req.body.operatingTerritory.trim()]
      : [];

    const preferredCategories = Array.isArray(req.body.preferredCategories)
      ? req.body.preferredCategories
      : typeof req.body.preferredCategories === "string" &&
        req.body.preferredCategories.trim()
      ? [req.body.preferredCategories.trim()]
      : [];

    // Validations
    requireText(companyName, "Company / Business Name is required");
    requireText(entityType, "Entity Type is required");
    requireText(contactPerson, "Primary Contact Person is required");
    requireText(email, "Business Email is required");
    requireText(phone, "Direct Phone Number is required");
    requireText(gstNumber, "GST Identification Number (GSTIN) is required");
    requireText(panNumber, "Permanent Account Number (PAN) is required");
    requireText(address, "Registered Address is required");
    requireText(city, "City is required");
    requireText(state, "State is required");
    requireText(pincode, "Postal Pincode is required");

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError(400, "Please provide a valid email address");
    }

    // Check if maximum rejection limit reached (3 times)
    const rejectionCount = await DistributorApplication.countDocuments({
      $or: [
        { email },
        { phone },
        ...(dbUser ? [{ user: dbUser._id }] : []),
      ],
      status: "disapproved",
    });

    if (rejectionCount >= 3) {
      throw new AppError(
        403,
        "Your distributor application has been rejected 3 times. You have reached the maximum allowed limit for submissions.",
      );
    }

    // Check if already approved
    const existingApproved = await DistributorApplication.findOne({
      $or: [
        { email },
        { phone },
        ...(dbUser ? [{ user: dbUser._id }] : []),
      ],
      status: "approved",
    });

    if (existingApproved) {
      throw new AppError(
        400,
        "Your organization is already an approved distributor partner.",
      );
    }

    // Check if duplicate pending application already exists
    const existingPending = await DistributorApplication.findOne({
      $or: [
        { email, status: "pending" },
        { phone, status: "pending" },
        ...(dbUser ? [{ user: dbUser._id, status: "pending" }] : []),
      ],
    });

    if (existingPending) {
      throw new AppError(
        400,
        "You already have a pending distributor application under review. You can withdraw your pending request if you wish to submit updated details.",
      );
    }

    const application = await DistributorApplication.create({
      user: dbUser ? dbUser._id : null,
      companyName,
      entityType,
      yearsInBusiness,
      contactPerson,
      designation,
      email,
      phone,
      alternatePhone,
      gstNumber,
      panNumber,
      address,
      city,
      state,
      pincode,
      operatingTerritory,
      warehouseArea,
      logisticsFleet,
      annualTurnover,
      expectedMonthlyVolume,
      preferredCategories,
      proposalNote,
      status: "pending",
      attemptNumber: rejectionCount + 1,
    });

    res.status(201).json(
      ok({
        message:
          "Your distributor application has been received successfully. Our corporate partnership division will review your credentials within 24-48 hours.",
        application,
      }),
    );
  }),
);

// Get current user's latest application with rejection count and permissions
customerDistributorRouter.get(
  ["/distributor/my-application", "/my-application"],
  asyncHandler(async (req: Request, res: Response) => {
    let dbUser = null;
    try {
      dbUser = await getDbUserFromReq(req);
    } catch {
      res.json(
        ok({
          application: null,
          rejectionCount: 0,
          remainingAttempts: 3,
          canReapply: true,
          canWithdraw: false,
        }),
      );
      return;
    }

    const application = await DistributorApplication.findOne({
      user: dbUser._id,
    }).sort({ createdAt: -1 });

    const rejectionCount = await DistributorApplication.countDocuments({
      $or: [
        { user: dbUser._id },
        ...(dbUser.email ? [{ email: dbUser.email }] : []),
        ...(dbUser.phone ? [{ phone: dbUser.phone }] : []),
      ],
      status: "disapproved",
    });

    const remainingAttempts = Math.max(0, 3 - rejectionCount);
    const canReapply =
      rejectionCount < 3 &&
      (!application ||
        application.status === "disapproved" ||
        application.status === "withdrawn");
    const canWithdraw = application?.status === "pending";

    res.json(
      ok({
        application,
        rejectionCount,
        remainingAttempts,
        canReapply,
        canWithdraw,
      }),
    );
  }),
);

// Withdraw Pending Application
customerDistributorRouter.patch(
  ["/distributor/withdraw", "/withdraw"],
  asyncHandler(async (req: Request, res: Response) => {
    const dbUser = await getDbUserFromReq(req);

    const application = await DistributorApplication.findOne({
      user: dbUser._id,
      status: "pending",
    }).sort({ createdAt: -1 });

    if (!application) {
      throw new AppError(
        400,
        "No active pending distributor application found to withdraw.",
      );
    }

    application.status = "withdrawn";
    application.withdrawnAt = new Date();
    await application.save();

    res.json(
      ok({
        message:
          "Your distributor application has been withdrawn successfully. You may submit a revised application when ready.",
        application,
      }),
    );
  }),
);
