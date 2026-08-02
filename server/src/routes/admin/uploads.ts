import { Router } from "express";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { upload, UPLOAD_DIR } from "../../middleware/upload.js";
import { requireAdmin } from "../../middleware/auth.js";
import { writeAudit } from "../../middleware/audit.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { HttpError } from "../../utils/httpError.js";
import { AuthenticatedRequest } from "../../types.js";
import cloudinary from "../../utils/cloudinary.js";

const router = Router();

// POST /api/admin/uploads  (multipart field name: "file")
router.post(
  "/uploads",
  requireAdmin,
  upload.single("file"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.file) throw new HttpError(400, "No file uploaded");
    const originalPath = req.file.path;
    const ext = path.extname(req.file.filename).toLowerCase();
    let outPath = originalPath;
    try {
      // Re-encode safely with Sharp (always to WebP when possible).
      const webpPath = path.join(UPLOAD_DIR, `${path.basename(originalPath, ext)}.webp`);
      await sharp(originalPath)
        .rotate()
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(webpPath);
      fs.unlinkSync(originalPath);
      outPath = webpPath;
    } catch (e) {
      // If re-encode fails, keep the original (already validated jpeg/png/webp).
      console.error("[upload] re-encode failed, keeping original", e);
      outPath = originalPath;
    }

    // Upload to Cloudinary BEFORE deleting the local file.
    // If the upload fails, the local file is preserved so the request can
    // still be retried or logged.
    const result = await cloudinary.uploader.upload(outPath, {
      folder: "ms-sushant-construction",
    });

    // Only delete the local file after Cloudinary confirms success.
    try {
      fs.unlinkSync(outPath);
    } catch {
      // Non-fatal: the temp file will be cleaned up eventually.
    }

    const url = result.secure_url;

    await writeAudit(req, {
      action: "UPLOAD",
      entity: "Upload",
      details: url,
    });

    res.status(201).json({ url });
  })
);

export default router;

