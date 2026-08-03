import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import { Request } from "express";
import { HttpError } from "../utils/httpError.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Uploads directory, resolved relative to this module so it works in both
 * development (server/src/middleware) and after a TypeScript build
 * (server/dist/middleware) — both resolve to <project>/server/uploads.
 *
 * Optional: set UPLOAD_DIR in the environment (e.g. a persistent disk mount
 * on Render) to override the default location.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, "../../uploads");

/**
 * Subdirectory that product images are saved into. Uploaded product images
 * live in <UPLOAD_DIR>/products.
 */
export const PRODUCTS_DIR = path.join(UPLOAD_DIR, "products");

for (const dir of [UPLOAD_DIR, PRODUCTS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function mimeFromExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "";
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PRODUCTS_DIR),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
    const name = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}${safeExt}`;
    cb(null, name);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb) => {
    // Reject SVG/GIF/executables and anything not jpeg/png/webp.
    const byMime = ALLOWED_MIME.has(file.mimetype);
    const byExt = ["image/jpeg", "image/png", "image/webp"].includes(mimeFromExt(file.originalname));
    if (!byMime || !byExt) {
      const err = new HttpError(400, "Only JPEG, PNG and WebP images are allowed.");
      (err as any).code = "UNSUPPORTED_FILE";
      return cb(err);
    }
    cb(null, true);
  },
});

export function isUploadedFileSafe(filepath: string): boolean {
  // Normalize to a POSIX relative path so `../` or backslashes can't escape
  // the uploads tree ("products/../../etc/passwd" would normalize away from
  // the allowed products/ prefix and be rejected here).
  const normalized = path.posix.normalize(filepath);
  // Only allow files inside the products subdirectory.
  if (!normalized.startsWith("products/") && normalized !== "products") {
    return false;
  }
  const base = path.posix.basename(normalized);
  // Only serve files with an allowlisted extension.
  return /^[a-zA-Z0-9._-]+\.(jpe?g|png|webp)$/.test(base);
}

