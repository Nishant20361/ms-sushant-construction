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
import khatabookAuthRoutes from "./khatabookAuth.js";
import assistedOrderRoutes from "./assistedOrder.js";

const router = Router();

router.use("/", authRoutes);
router.use("/", dashboardRoutes);
router.use("/", productRoutes);
router.use("/", categoryRoutes);
router.use("/", assistedOrderRoutes);
router.use("/", orderRoutes);
router.use("/", settingsRoutes);
router.use("/", uploadRoutes);
router.use("/", notificationRoutes);
router.use("/", billRoutes);
router.use("/", reportRoutes);
router.use("/", analyticsRoutes);
router.use("/", khatabookAuthRoutes);

export default router;
