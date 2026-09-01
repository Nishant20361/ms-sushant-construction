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
      // Strictly verify and re-encode with Sharp (limits decompression bomb risks)
      const image = sharp(originalPath, { failOn: "error" });
      const meta = await image.metadata();

      if (!meta.format || !["jpeg", "png", "webp", "jpg"].includes(meta.format)) {
        removeFile(originalPath);
        throw new HttpError(400, "Invalid image format. Only JPEG, PNG, and WebP are allowed.");
      }

      if ((meta.width && meta.width > 5000) || (meta.height && meta.height > 5000)) {
        removeFile(originalPath);
        throw new HttpError(400, "Image dimensions exceed the maximum allowed size (5000x5000px).");
      }

      await image
        .rotate()
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(webpPath);
      optimizedPath = webpPath;
    } catch (e) {
      removeFile(originalPath);
      removeFile(webpPath);
      if (e instanceof HttpError) throw e;
      throw new HttpError(400, "Corrupted or invalid image file.");
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

