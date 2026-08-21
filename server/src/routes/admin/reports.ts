import { Router } from "express";
import { requireAdmin } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { buildSalesReport, ReportPeriod, ReportFilters, SalesReportData } from "../../utils/report.js";
import { buildCsv, buildMultiSheetXlsx, ExportColumn } from "../../utils/export.js";
import { AuthenticatedRequest } from "../../types.js";

const router = Router();

// ---------------------------------------------------------------------------
// Sales report export (Excel / CSV)
// ---------------------------------------------------------------------------

export const SALES_EXPORT_COLUMNS: ExportColumn[] = [
  { header: "Section", key: "section" },
  { header: "Record Type", key: "recordType" },
  { header: "Date / Payment Date", key: "date" },
  { header: "Invoice Number", key: "invoiceNumber" },
  { header: "Customer Name", key: "customerName" },
  { header: "Mobile", key: "customerMobile" },
  { header: "Original Sale Date", key: "originalSaleDate" },
  { header: "Original Bill Amount", key: "originalBillAmount", format: "#,##0.00" },
  { header: "Paid Before Payment", key: "previouslyPaidBeforePayment", format: "#,##0.00" },
  { header: "Due Before Payment", key: "dueBeforePayment", format: "#,##0.00" },
  { header: "Payment Received During Period", key: "periodPayment", format: "#,##0.00" },
  { header: "Total Paid After Payment", key: "totalPaidAfterPayment", format: "#,##0.00" },
  { header: "Remaining Due", key: "dueAmount", format: "#,##0.00" },
  { header: "Payment Mode", key: "paymentMode" },
  { header: "Payment Status / Clearance", key: "paymentStatus" },
  { header: "Order Status", key: "orderStatus" },
  { header: "Products", key: "products" },
  { header: "Quantity", key: "quantity", format: "0.00" },
  { header: "Subtotal", key: "subtotal", format: "#,##0.00" },
  { header: "Discount", key: "discount", format: "#,##0.00" },
  { header: "Final Amount", key: "finalAmount", format: "#,##0.00" },
  { header: "Cash Paid Against Sale", key: "cashPaid", format: "#,##0.00" },
  { header: "Online Paid Against Sale", key: "onlinePaid", format: "#,##0.00" },
  { header: "Total Paid Against Sale", key: "totalPaid", format: "#,##0.00" },
  { header: "Due Cleared", key: "dueCleared" },
  { header: "Due Cleared Amount", key: "dueClearedAmount", format: "#,##0.00" },
  { header: "Due Cleared Date", key: "dueClearedDate" },
];

export const PERIOD_SALES_COLUMNS: ExportColumn[] = [
  { header: "Date", key: "date" },
  { header: "Invoice Number", key: "invoiceNumber" },
  { header: "Customer Name", key: "customerName" },
  { header: "Mobile", key: "customerMobile" },
  { header: "Products", key: "products" },
  { header: "Quantity", key: "quantity", format: "0.00" },
  { header: "Subtotal", key: "subtotal", format: "#,##0.00" },
  { header: "Discount", key: "discount", format: "#,##0.00" },
  { header: "Final Amount", key: "finalAmount", format: "#,##0.00" },
  { header: "Cash Paid", key: "cashPaid", format: "#,##0.00" },
  { header: "Online Paid", key: "onlinePaid", format: "#,##0.00" },
  { header: "Total Paid", key: "totalPaid", format: "#,##0.00" },
  { header: "Remaining Due", key: "dueAmount", format: "#,##0.00" },
  { header: "Payment Status", key: "paymentStatus" },
  { header: "Order Status", key: "orderStatus" },
];

export const PREVIOUS_DUES_COLUMNS: ExportColumn[] = [
  { header: "Payment Date", key: "date" },
  { header: "Invoice Number", key: "invoiceNumber" },
  { header: "Customer Name", key: "customerName" },
  { header: "Mobile", key: "customerMobile" },
  { header: "Original Sale Date", key: "originalSaleDate" },
  { header: "Original Bill Amount", key: "originalBillAmount", format: "#,##0.00" },
  { header: "Paid Before Payment", key: "previouslyPaidBeforePayment", format: "#,##0.00" },
  { header: "Due Before Payment", key: "dueBeforePayment", format: "#,##0.00" },
  { header: "Payment Received In Period", key: "periodPayment", format: "#,##0.00" },
  { header: "Total Paid After Payment", key: "totalPaidAfterPayment", format: "#,##0.00" },
  { header: "Remaining Due", key: "dueAmount", format: "#,##0.00" },
  { header: "Payment Mode", key: "paymentMode" },
  { header: "Status", key: "paymentStatus" },
  { header: "Due Cleared Date", key: "dueClearedDate" },
];

/** Map Section 1 orders to export rows. */
export function toPeriodSalesRows(report: SalesReportData): Record<string, any>[] {
  return report.orders.map((o) => ({
    section: "SALES_DURING_PERIOD",
    recordType: "SALE",
    date: new Date(o.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }),
    invoiceNumber: o.orderNumber,
    customerName: o.customerName,
    customerMobile: o.customerMobile,
    products: o.items.map((it) => it.productName).join(", "),
    quantity: Math.round(o.items.reduce((s, it) => s + it.quantity, 0) * 100) / 100,
    subtotal: o.subtotal,
    discount: o.discount,
    finalAmount: o.finalAmount,
    totalPaid: o.totalPaid,
    cashPaid: o.cashPaid,
    onlinePaid: o.onlinePaid,
    dueAmount: o.remainingDue,
    paymentStatus: o.paymentStatus === "PARTIALLY_PAID" ? "PARTIALLY PAID" : o.paymentStatus,
    orderStatus: o.status,
  }));
}

/** Map Section 2 old-due payments to export rows. */
export function toPreviousDuesRows(report: SalesReportData): Record<string, any>[] {
  const oldPayments = report.previousDuePayments ?? report.payments.filter((p) => !p.saleCreatedInPeriod);
  return oldPayments.map((payment) => {
    const statusText = payment.dueCleared
      ? "DUE CLEARED"
      : payment.remainingBalanceAfterPayment <= 0
      ? "PAID"
      : "PARTIAL / DUE REMAINING";
    return {
      section: "PREVIOUS_DUES_PAID",
      recordType: "PREVIOUS_DUE_PAYMENT",
      date: new Date(payment.paymentDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }),
      originalSaleDate: new Date(payment.orderCreatedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }),
      invoiceNumber: payment.orderNumber,
      customerName: payment.customerName,
      customerMobile: payment.customerMobile,
      subtotal: payment.subtotal,
      originalBillAmount: payment.originalBillAmount,
      previouslyPaidBeforePeriod: payment.previouslyPaidBeforePeriod,
      previouslyPaidBeforePayment: payment.previouslyPaidBeforePayment,
      dueBeforePayment: payment.dueBeforePayment,
      periodPayment: payment.amount,
      totalPaidAfterPayment: payment.totalPaidAfterPayment,
      dueAmount: payment.remainingBalanceAfterPayment,
      paymentStatus: statusText,
      paymentMode: payment.paymentMode,
      balanceAfterPayment: payment.remainingBalanceAfterPayment,
      saleCreatedInPeriod: "OLDER SALE / PREVIOUS DUE",
      dueCleared: payment.dueCleared ? "YES" : "NO",
      dueClearedAmount: payment.dueClearedAmount ?? "",
      dueClearedDate: payment.dueClearedAt
        ? new Date(payment.dueClearedAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Kolkata",
          })
        : "",
    };
  });
}

/** Map a report to the flat rows used by both CSV and Excel exporters. */
export function toSalesExportRows(report: SalesReportData): Record<string, any>[] {
  const orderRows = toPeriodSalesRows(report);
  const paymentRows = toPreviousDuesRows(report);
  return [...orderRows, ...paymentRows];
}

function salesExportFilename(report: SalesReportData, ext: "csv" | "xlsx"): string {
  const safe = report.periodLabel.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `sales-report-${report.reportType}-${safe || Date.now()}.${ext}`;
}

function isSalesPeriod(v: string): v is "daily" | "weekly" | "monthly" {
  return v === "daily" || v === "weekly" || v === "monthly";
}

function isSalesFormat(v: string): v is "excel" | "csv" {
  return v === "excel" || v === "csv";
}

/**
 * Build the export for a sales report and send it as a file download.
 * Sends CSV or XLSX with proper Content-Type / Content-Disposition headers.
 */
async function sendSalesExport(
  req: AuthenticatedRequest,
  res: import("express").Response,
  periodType: "daily" | "weekly" | "monthly",
  format: "excel" | "csv"
): Promise<void> {
  const query = { ...req.query, type: periodType } as Record<string, unknown>;
  const period = parsePeriod(query);
  const filters = parseFilters(query);
  const generatedBy = req.admin?.username ?? "Admin";
  const report = await buildSalesReport(period, filters, generatedBy);

  const rows = toSalesExportRows(report);

  if (format === "csv") {
    const csv = buildCsv(SALES_EXPORT_COLUMNS, rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${salesExportFilename(report, "csv")}"`
    );
    res.send(Buffer.from("\uFEFF" + csv, "utf-8"));
    return;
  }

  const orderRows = toPeriodSalesRows(report);
  const previousDuesRows = toPreviousDuesRows(report);
  const buf = await buildMultiSheetXlsx([
    { name: "Sales During Period", columns: PERIOD_SALES_COLUMNS, rows: orderRows },
    { name: "Previous Dues Paid", columns: PREVIOUS_DUES_COLUMNS, rows: previousDuesRows },
  ]);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${salesExportFilename(report, "xlsx")}"`
  );
  res.send(buf);
}

// GET /api/admin/reports/sales/export/excel
// GET /api/admin/reports/sales/export/csv
// Sales report export (Excel / CSV) for the current period.
// Query params mirror /reports/data: type, date, from, to, month, year + filters.
router.get(
  "/reports/sales/export/excel",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const periodType = String(req.query.type);
    if (!isSalesPeriod(periodType)) throw new HttpError(400, "Invalid sales report period");
    await sendSalesExport(req, res, periodType, "excel");
  })
);

router.get(
  "/reports/sales/export/csv",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const periodType = String(req.query.type);
    if (!isSalesPeriod(periodType)) throw new HttpError(400, "Invalid sales report period");
    await sendSalesExport(req, res, periodType, "csv");
  })
);

// GET /api/admin/reports/sales/:period/:format
// period ∈ daily | weekly | monthly
// format ∈ excel | csv
// Query params mirror /reports/data: date, from, to, month, year + filters.
router.get(
  "/reports/sales/:period/:format",
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const periodType = String(req.params.period);
    const format = String(req.params.format);
    if (!isSalesPeriod(periodType)) throw new HttpError(400, "Invalid sales report period");
    if (!isSalesFormat(format)) throw new HttpError(400, "Invalid export format");
    await sendSalesExport(req, res, periodType, format);
  })
);

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

export default router;
