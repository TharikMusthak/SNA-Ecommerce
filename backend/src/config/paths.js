import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

export const backendRoot = path.resolve(configDirectory, "../..");
export const projectRoot = path.resolve(backendRoot, "..");
export const docsRoot = path.join(projectRoot, "docs");

// Vercel's deployment bundle is read-only. Its only writable filesystem area
// is the temporary directory; traditional deployments retain persistent local
// uploads under backend/uploads.
export const uploadsRoot = process.env.VERCEL === "1"
  ? path.join(os.tmpdir(), "sna-uploads")
  : path.join(backendRoot, "uploads");
export const productUploadsDir = path.join(uploadsRoot, "products");
export const bannerUploadsDir = path.join(uploadsRoot, "banners");
export const reviewUploadsDir = path.join(uploadsRoot, "reviews");
