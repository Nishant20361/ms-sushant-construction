import { Router } from "express";
import authRoutes from "./auth.js";
import dashboardRoutes from "./dashboard.js";
import productRoutes from "./products.js";
import categoryRoutes from "./categories.js";
import orderRoutes from "./orders.js";
import settingsRoutes from "./settings.js";
import uploadRoutes from "./uploads.js";

const router = Router();

// authRoutes already declare /auth/... paths
router.use("/", authRoutes);
router.use("/", dashboardRoutes);
router.use("/", productRoutes);
router.use("/", categoryRoutes);
router.use("/", orderRoutes);
router.use("/", settingsRoutes);
router.use("/", uploadRoutes);

export default router;

