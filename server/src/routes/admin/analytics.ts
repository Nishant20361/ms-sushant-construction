import { Router } from "express";
import { prisma } from "../../db.js";
import { requireAdmin } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { parseIntegerParam } from "../../utils/request.js";
import {
  getSalesAnalytics,
  getPaymentAnalytics,
  getTopCustomers,
  getTopProducts,
  getCategoryReport,
  getPaymentModeReport,
  getChartData,
  getCustomerDueReport,
  getCustomerStatement,
  getProductHistory,
} from "../../utils/analytics.js";
import { buildCsv, buildXlsx, ExportColumn } from "../../utils/export.js";

const router = Router();

function parseDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// GET /api/admin/analytics/overview
// Sales analytics (today/yesterday/week/month/year/lifetime) + payment
// analytics (cash/online/due). Both loaded in parallel.
router.get(
  "/analytics/overview",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const [sales, payments] = await Promise.all([
      getSalesAnalytics(),
      getPaymentAnalytics(),
    ]);
    res.json({ sales, payments });
  })
);

// GET /api/admin/analytics/top-customers?limit=
router.get(
  "/analytics/top-customers",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const data = await getTopCustomers(limit);
    res.json(data);
  })
);

// GET /api/admin/analytics/top-products
router.get(
  "/analytics/top-products",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json(await getTopProducts());
  })
);

// GET /api/admin/analytics/categories
router.get(
  "/analytics/categories",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json(await getCategoryReport());
  })
);

// GET /api/admin/analytics/payment-modes
router.get(
  "/analytics/payment-modes",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json(await getPaymentModeReport());
  })
);

// GET /api/admin/analytics/charts?kind=dailySales&from=&to=
router.get(
  "/analytics/charts",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const kind = String(req.query.kind ?? "dailySales");
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const data = await getChartData(kind, from, to);
    res.json(data);
  })
);

// GET /api/admin/analytics/customer-due-report?search=&from=&to=&page=&limit=&export=csv|xlsx|pdf
router.get(
  "/analytics/customer-due-report",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { export: exportType } = req.query as Record<string, string>;
    const params = {
      search: (req.query.search as string) || undefined,
      from: parseDate(req.query.from),
      to: parseDate(req.query.to),
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
    };

    // For exports, fetch ALL filtered records (unlimited).
    const report = await getCustomerDueReport({
      ...params,
      limit: exportType ? 100000 : params.limit,
    });

    if (exportType === "csv" || exportType === "xlsx") {
      const cols: ExportColumn[] = [
        { header: "Customer Name", key: "customerName" },
        { header: "Phone", key: "customerMobile" },
        { header: "Address", key: "address" },
        { header: "Total Orders", key: "totalOrders", format: "0" },
        { header: "Total Purchase", key: "totalPurchase", format: "#,##0.00" },
        { header: "Total Paid", key: "totalPaid", format: "#,##0.00" },
        { header: "Remaining Due", key: "remainingDue", format: "#,##0.00" },
        { header: "Last Payment Date", key: "lastPaymentDate" },
        { header: "Oldest Due Date", key: "oldestDueDate" },
        { header: "Newest Due Date", key: "newestDueDate" },
      ];
      const rows = report.customers.map((c: any) => ({
        ...c,
        lastPaymentDate: c.lastPaymentDate ? new Date(c.lastPaymentDate).toLocaleDateString("en-IN") : "",
        oldestDueDate: c.oldestDueDate ? new Date(c.oldestDueDate).toLocaleDateString("en-IN") : "",
        newestDueDate: c.newestDueDate ? new Date(c.newestDueDate).toLocaleDateString("en-IN") : "",
      }));
      if (exportType === "csv") {
        const csv = buildCsv(cols, rows);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="customer-due-report-${Date.now()}.csv"`);
        res.send(Buffer.from("\uFEFF" + csv, "utf-8"));
        return;
      }
      const buf = await buildXlsx(cols, rows);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="customer-due-report-${Date.now()}.xlsx"`);
      res.send(buf);
      return;
    }

    res.json(report);
  })
);

// GET /api/admin/analytics/customer-statement/:mobile
router.get(
  "/analytics/customer-statement/:mobile",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const mobile = req.params.mobile;
    if (!mobile) throw new HttpError(400, "Customer mobile is required");
    const statement = await getCustomerStatement(mobile);
    if (!statement) throw new HttpError(404, "Customer not found or has no orders");
    res.json(statement);
  })
);

// GET /api/admin/analytics/product-history/:id
router.get(
  "/analytics/product-history/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseIntegerParam(req.params.id, "product id");
    const data = await getProductHistory(id);
    if (!data) throw new HttpError(404, "Product not found");
    res.json(data);
  })
);

// GET /api/admin/analytics/products (for product-history picker)
router.get(
  "/analytics/products",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, unit: true, category: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ products });
  })
);

export default router;
