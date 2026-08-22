import fs from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { uploadsRoot } from "../config/paths.js";

const PRODUCT_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export function isProductBlobUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname.endsWith(PRODUCT_BLOB_HOST_SUFFIX) &&
      url.pathname.startsWith("/products/");
  } catch {
    return false;
  }
}

export async function uploadProductImage(file, blobPut = put) {
  if (!file?.buffer || !file.filename || !file.mimetype) {
    throw new Error("A validated memory-backed product image is required");
  }
  const blob = await blobPut(`products/${file.filename}`, file.buffer, {
    access: "public",
    contentType: file.mimetype,
  });
  file.blobUrl = blob.url;
  return blob.url;
}

export async function uploadProductImages(files, blobPut = put, blobDelete = del) {
  try {
    for (const file of files) {
      await uploadProductImage(file, blobPut);
    }
    return files.map((file) => file.blobUrl);
  } catch (error) {
    await cleanupProductImageUploads(files, blobDelete);
    throw error;
  }
}

export async function cleanupProductImageUploads(files, blobDelete = del) {
  const urls = files.map((file) => file?.blobUrl).filter(isProductBlobUrl);
  await Promise.allSettled(urls.map((url) => blobDelete(url)));
  for (const file of files) delete file.blobUrl;
}

export function resolveUploadPath(uploadUrl, expectedFolder) {
  if (
    typeof uploadUrl !== "string" ||
    !uploadUrl.startsWith("/uploads/") ||
    !/^[a-z0-9_-]+$/i.test(expectedFolder)
  ) {
    return null;
  }

  const relativePath = uploadUrl.slice("/uploads/".length);
  const resolvedPath = path.resolve(uploadsRoot, relativePath);
  const expectedRoot = path.join(uploadsRoot, expectedFolder);
  const expectedPrefix = `${expectedRoot}${path.sep}`;

  return resolvedPath.startsWith(expectedPrefix) ? resolvedPath : null;
}

export async function deleteUploadByUrl(uploadUrl, expectedFolder, blobDelete = del) {
  if (expectedFolder === "products" && isProductBlobUrl(uploadUrl)) {
    await blobDelete(uploadUrl);
    return true;
  }
  const filePath = resolveUploadPath(uploadUrl, expectedFolder);
  if (!filePath) return false;

  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export async function safelyDeleteUpload(uploadUrl, expectedFolder) {
  try {
    return await deleteUploadByUrl(uploadUrl, expectedFolder);
  } catch (error) {
    console.error("Uploaded file cleanup failed", {
      folder: expectedFolder,
      code: error?.code,
      message: error?.message,
    });
    return false;
  }
}

export async function safelyDeleteUploads(uploadUrls, expectedFolder) {
  await Promise.all(
    uploadUrls
      .filter(Boolean)
      .map((uploadUrl) => safelyDeleteUpload(uploadUrl, expectedFolder)),
  );
}
