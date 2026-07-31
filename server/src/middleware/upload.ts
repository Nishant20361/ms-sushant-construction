import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { Request } from "express";
import { HttpError } from "../utils/httpError.js";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
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
  const base = path.basename(filepath);
  // Only serve files with an allowlisted extension from the uploads dir.
  return /^[a-zA-Z0-9._-]+\.(jpe?g|png|webp)$/.test(base);
}

