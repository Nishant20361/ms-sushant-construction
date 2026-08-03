import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cloudinary credentials live in the repository root .env. The server's
// config.ts only loads server/.env, so we defensively load the root .env
// (and server/.env) here BEFORE configuring the SDK. dotenv never overrides
// already-set process.env values, so this is safe regardless of import order.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  // Fail loudly at startup rather than at first upload with a confusing
  // "Must supply api_key" error. In tests we simply skip real uploads.
  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "[cloudinary] Missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET. " +
        "Image uploads will fall back to local storage."
    );
  }
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export default cloudinary;

/** True when the SDK is configured with valid-looking credentials. */
export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName && apiKey && apiSecret);
}
