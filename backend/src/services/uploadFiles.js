import fs from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { uploadsRoot } from "../config/paths.js";
import { env } from "../config/env.js";

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

function isBlobUrl(value, folder) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname.endsWith(BLOB_HOST_SUFFIX) &&
      url.pathname.startsWith(`/${folder}/`);
  } catch {
    return false;
  }
}

export function isProductBlobUrl(value) {
  return isBlobUrl(value, "products");
}

export function isReviewBlobUrl(value) {
  return isBlobUrl(value, "reviews");
}

export async function uploadProductImage(file, blobPut = put) {
  if ((!file?.buffer && !file?.path) || !file.filename || !file.mimetype) {
    throw new Error("A validated product media file is required");
  }
  const body = file.buffer || await fs.readFile(file.path);
  const blob = await blobPut(`products/${file.filename}`, body, {
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
  } finally {
    if (files.some((file) => file?.blobUrl)) {
      await Promise.allSettled(
        files.map((file) => file?.path).filter(Boolean).map((filePath) => fs.unlink(filePath)),
      );
    }
  }
}

export async function cleanupProductImageUploads(files, blobDelete = del) {
  const urls = files.map((file) => file?.blobUrl).filter(isProductBlobUrl);
  await Promise.allSettled(urls.map((url) => blobDelete(url)));
  for (const file of files) delete file.blobUrl;
}

async function uploadMediaToBlob(files, folder, blobPut = put) {
  if (process.env.VERCEL !== "1") return files;

  try {
    for (const file of files) {
      if (!file?.path || !file.filename || !file.mimetype) {
        throw new Error("A validated review media file is required");
      }
      const body = await fs.readFile(file.path);
      const blob = await blobPut(`${folder}/${file.filename}`, body, {
        access: "public",
        contentType: file.mimetype,
      });
      file.blobUrl = blob.url;
    }
    return files;
  } catch (error) {
    await Promise.allSettled(
      files
        .map((file) => file?.blobUrl)
        .filter((url) => isBlobUrl(url, folder))
        .map((url) => del(url)),
    );
    throw error;
  } finally {
    await Promise.allSettled(
      files.map((file) => file?.path).filter(Boolean).map((filePath) => fs.unlink(filePath)),
    );
  }
}

export async function uploadReviewMedia(files, blobPut = put) {
  return uploadMediaToBlob(files, "reviews", blobPut);
}

export async function uploadBannerMedia(files, blobPut = put) {
  return uploadMediaToBlob(files, "banners", blobPut);
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
  const persistedBlobUrl = resolveBlobUrl(uploadUrl, expectedFolder);
  if (persistedBlobUrl) {
    await blobDelete(persistedBlobUrl);
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

function resolveBlobUrl(uploadUrl, expectedFolder) {
  if (isBlobUrl(uploadUrl, expectedFolder)) return uploadUrl;
  const prefix = `/uploads/${expectedFolder}/`;
  if (
    typeof uploadUrl === "string" &&
    uploadUrl.startsWith(prefix) &&
    env.publicMediaUrl
  ) {
    return `${env.publicMediaUrl}/${expectedFolder}/${uploadUrl.slice(prefix.length)}`;
  }
  return null;
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
