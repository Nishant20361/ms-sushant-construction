import { Router } from "express";
import { requireAdmin } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { buildSalesReport, ReportPeriod, ReportFilters } from "../../utils/report.js";
import { buildReportPdf } from "../../utils/reportPdf.js";
import { AuthenticatedRequest } from "../../types.js";

const router = Router();

/** Parse the period query params into a ReportPeriod. */
function parsePeriod(query: Record<string, unknown>): ReportPeriod {
  const type = String(query.type ?? "");
  if (type === "daily") {
    const date = String(query.date ?? "");
    if (!date) throw new HttpError(400, "A date is required for the daily report");
    return { type: "daily", date };
  }
  if (type === "weekly") {
    const from = String(query.from ?? "");
    const to = String(query.to ?? "");
    if (!from || !to) {
      throw new HttpError(400, "Start and end dates are required for the weekly report");
    }
    return { type: "weekly", from, to };
  }
  if (type === "monthly") {
    const month = Number(query.month);
    const year = Number(query.year);
    if (!Number.isInteger(month) || !Number.isInteger(year)) {
      throw new HttpError(400, "Month and year are required for the monthly report");
    }
    return { type: "monthly", month, year };
  }
  throw new HttpError(400, "Invalid report type");
}

/** Parse optional report filters. */
function parseFilters(query: Record<string, unknown>): ReportFilters {
  const filters: ReportFilters = {};
  if (query.customerName) filters.customerName = String(query.customerName);
  if (query.phone) filters.phone = String(query.phone);
  if (query.orderId) filters.orderId = String(query.orderId);
  if (query.paymentType) filters.paymentType = String(query.paymentType);
  if (query.status) filters.status = String(query.status);
  if (query.productName) filters.productName = String(query.productName);
  if (query.category) filters.category = String(query.category);
  return filters;
}

// GET /api/admin/reports/data?type=daily|weekly|monthly&...&filters
// Returns the full report as JSON (summary + detailed orders).
router.get(
  "/reports/data",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const period = parsePeriod(req.query as Record<string, unknown>);
    const filters = parseFilters(req.query as Record<string, unknown>);
    const generatedBy = req.admin?.username ?? "Admin";
    const report = await buildSalesReport(period, filters, generatedBy);
    res.json({ report });
  })
);

// GET /api/admin/reports/pdf?type=daily|weekly|monthly&...&filters
// Returns a professional multi-page PDF (no page limit).
router.get(
  "/reports/pdf",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const period = parsePeriod(req.query as Record<string, unknown>);
    const filters = parseFilters(req.query as Record<string, unknown>);
    const generatedBy = req.admin?.username ?? "Admin";
    const report = await buildSalesReport(period, filters, generatedBy);
    const pdf = await buildReportPdf(report);
    const filename = `${report.reportType}-sales-report-${Date.now()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.send(pdf);
  })
);

export default router;
