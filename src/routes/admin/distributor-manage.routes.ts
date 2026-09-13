import { Router, type Request, type Response } from "express";
import { requireAdmin, getDbUserFromReq } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  DistributorApplication,
  type DistributorStatus,
} from "../../models/DistributorApplication";
import { ok } from "../../utils/envelope";
import { requireFound } from "../../utils/helpers";
import { AppError } from "../../utils/AppError";

export const adminDistributorRouter = Router();

adminDistributorRouter.use(requireAdmin);

const VALID_STATUSES: DistributorStatus[] = [
  "pending",
  "approved",
  "disapproved",
  "withdrawn",
];

// List distributor applications with search & status filters
adminDistributorRouter.get(
  ["/distributors", "/"],
  asyncHandler(async (req: Request, res: Response) => {
    const status = String(req.query.status || "").trim() as DistributorStatus;
    const search = String(req.query.search || "").trim();

    const query: Record<string, unknown> = {};

    if (status && VALID_STATUSES.includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { gstNumber: { $regex: search, $options: "i" } },
        { panNumber: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
      ];
    }

    const applications = await DistributorApplication.find(query)
      .populate("user", "name email role")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });

    const totalCount = await DistributorApplication.countDocuments();
    const pendingCount = await DistributorApplication.countDocuments({
      status: "pending",
    });
    const approvedCount = await DistributorApplication.countDocuments({
      status: "approved",
    });
    const disapprovedCount = await DistributorApplication.countDocuments({
      status: "disapproved",
    });
    const withdrawnCount = await DistributorApplication.countDocuments({
      status: "withdrawn",
    });

    res.json(
      ok({
        applications,
        counts: {
          total: totalCount,
          pending: pendingCount,
          approved: approvedCount,
          disapproved: disapprovedCount,
          withdrawn: withdrawnCount,
        },
      }),
    );
  }),
);

// Get single application details
adminDistributorRouter.get(
  ["/distributors/:id", "/:id"],
  asyncHandler(async (req: Request, res: Response) => {
    const application = await DistributorApplication.findById(req.params.id)
      .populate("user", "name email role")
      .populate("reviewedBy", "name email");

    const found = requireFound(application, "Distributor application not found");
    res.json(ok(found));
  }),
);

// Update status (Approve or Disapprove)
adminDistributorRouter.patch(
  ["/distributors/:id/status", "/:id/status"],
  asyncHandler(async (req: Request, res: Response) => {
    const { status, adminNotes } = req.body;
    const adminUser = await getDbUserFromReq(req);

    if (!VALID_STATUSES.includes(status)) {
      throw new AppError(
        400,
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      );
    }

    const application = await DistributorApplication.findById(req.params.id);
    requireFound(application, "Distributor application not found");

    application.status = status;
    if (adminNotes !== undefined) {
      application.adminNotes = String(adminNotes).trim();
    }
    application.reviewedBy = adminUser._id;
    application.reviewedAt = new Date();

    await application.save();

    const updated = await DistributorApplication.findById(application._id)
      .populate("user", "name email role")
      .populate("reviewedBy", "name email");

    res.json(
      ok({
        message: `Distributor request marked as ${status.toUpperCase()} successfully.`,
        application: updated,
      }),
    );
  }),
);
