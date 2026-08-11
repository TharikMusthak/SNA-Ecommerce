import path from "node:path";
import { fileURLToPath } from "node:url";

// All upload paths are anchored to the backend folder, not process.cwd().
const configDirectory = path.dirname(fileURLToPath(import.meta.url));

export const backendRoot = path.resolve(configDirectory, "../..");
export const projectRoot = path.resolve(backendRoot, "..");
export const docsRoot = path.join(projectRoot, "docs");
export const uploadsRoot = path.join(backendRoot, "uploads");
export const productUploadsDir = path.join(uploadsRoot, "products");
export const bannerUploadsDir = path.join(uploadsRoot, "banners");
