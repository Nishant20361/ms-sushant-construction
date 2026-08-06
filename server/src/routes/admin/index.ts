import { Router } from "express";
import authRoutes from "./auth.js";
import dashboardRoutes from "./dashboard.js";
import productRoutes from "./products.js";
import categoryRoutes from "./categories.js";
import orderRoutes from "./orders.js";
import settingsRoutes from "./settings.js";
import uploadRoutes from "./uploads.js";
import notificationRoutes from "./notifications.js";
import billRoutes from "./bills.js";
import reportRoutes from "./reports.js";
import analyticsRoutes from "./analytics.js";

const router = Router();

// authRoutes already declare /auth/... paths
router.use("/", authRoutes);
router.use("/", dashboardRoutes);
router.use("/", productRoutes);
router.use("/", categoryRoutes);
router.use("/", orderRoutes);
router.use("/", settingsRoutes);
router.use("/", uploadRoutes);
router.use("/", notificationRoutes);
router.use("/", billRoutes);
router.use("/", reportRoutes);
router.use("/", analyticsRoutes);

export default router;

