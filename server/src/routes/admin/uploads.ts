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
import cloudinary, { isCloudinaryConfigured } from "../../utils/cloudinary.js";

const router = Router();

/**
 * Remove a temp file if it exists (best-effort cleanup).
 */
function removeFile(p: string | undefined) {
  if (!p) return;
  fs.unlink(p, () => {});
}

// POST /api/admin/uploads  (multipart field name: "file")
router.post(
  "/uploads",
  requireAdmin,
  upload.single("file"),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.file) throw new HttpError(400, "No file uploaded");
    const originalPath = req.file.path;
    const originalFilename = req.file.filename;
    const ext = path.extname(originalFilename).toLowerCase();
    const baseName = path.basename(originalFilename, ext);
    const webpPath = path.join(UPLOAD_DIR, `${baseName}.webp`);
    let optimizedPath = originalPath;

    try {
      // Re-encode safely with Sharp (always to WebP when possible).
      await sharp(originalPath)
        .rotate()
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(webpPath);
      optimizedPath = webpPath;
    } catch (e) {
      // If re-encode fails, keep the original (already validated jpeg/png/webp).
      console.error("[upload] re-encode failed, keeping original", e);
    }

    let url: string;

    if (isCloudinaryConfigured()) {
      // Upload the optimized image to Cloudinary and return its secure URL.
      const result = await cloudinary.uploader.upload(optimizedPath, {
        folder: "ms-sushant-construction/products",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        resource_type: "image",
      });
      url = result.secure_url || result.url;
    } else {
      // Fallback: serve from local disk (same behaviour as before).
      const finalFilename = `${baseName}.webp`;
      const finalPath = path.join(UPLOAD_DIR, "products", finalFilename);
      fs.mkdirSync(path.dirname(finalPath), { recursive: true });
      fs.copyFileSync(optimizedPath, finalPath);
      url = `/uploads/products/${finalFilename}`;
    }

    // Clean up temp files (original + optimized) after a successful upload.
    removeFile(originalPath);
    if (optimizedPath !== originalPath) removeFile(optimizedPath);

    await writeAudit(req, {
      action: "UPLOAD",
      entity: "Upload",
      details: url,
    });

    res.status(201).json({ url });
  })
);

export default router;

