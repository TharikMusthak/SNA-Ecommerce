import { del, put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";
import { uploadsRoot } from "../config/paths.js";

const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

function isSafeFolder(value) {
  return typeof value === "string" && /^[a-z0-9_-]+$/i.test(value);
}

function storageConfigurationError() {
  const error = new Error(
    "File storage is not configured. Connect Vercel Blob and provide BLOB_READ_WRITE_TOKEN.",
  );
  error.code = "BLOB_STORAGE_NOT_CONFIGURED";
  error.status = 500;
  return error;
}

export function resolveUploadPath(uploadUrl, expectedFolder) {
  if (
    typeof uploadUrl !== "string" ||
    !uploadUrl.startsWith("/uploads/") ||
    !isSafeFolder(expectedFolder)
  ) {
    return null;
  }

  const relativePath = uploadUrl.slice("/uploads/".length);
  const resolvedPath = path.resolve(uploadsRoot, relativePath);
  const expectedRoot = path.join(uploadsRoot, expectedFolder);
  const expectedPrefix = `${expectedRoot}${path.sep}`;

  return resolvedPath.startsWith(expectedPrefix) ? resolvedPath : null;
}

export function resolveBlobUrl(uploadUrl, expectedFolder) {
  if (typeof uploadUrl !== "string" || !isSafeFolder(expectedFolder)) {
    return null;
  }

  try {
    const url = new URL(uploadUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !url.hostname.endsWith(BLOB_HOST_SUFFIX)
    ) {
      return null;
    }

    const firstPathSegment = decodeURIComponent(
      url.pathname.split("/").filter(Boolean)[0] || "",
    );
    return firstPathSegment === expectedFolder ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isVercelBlobUrl(uploadUrl, expectedFolder) {
  return Boolean(resolveBlobUrl(uploadUrl, expectedFolder));
}

export function blobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function uploadFileToBlob(file, expectedFolder) {
  if (
    !isSafeFolder(expectedFolder) ||
    !file ||
    typeof file.path !== "string" ||
    typeof file.filename !== "string" ||
    path.basename(file.filename) !== file.filename ||
    typeof file.mimetype !== "string"
  ) {
    const error = new Error("Invalid file storage request");
    error.code = "INVALID_BLOB_UPLOAD";
    error.status = 500;
    throw error;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw storageConfigurationError();

  const blob = await put(
    `${expectedFolder}/${file.filename}`,
    await fs.readFile(file.path),
    {
      access: "public",
      addRandomSuffix: false,
      contentType: file.mimetype,
      token,
    },
  );

  const blobUrl = resolveBlobUrl(blob?.url, expectedFolder);
  if (!blobUrl) {
    const error = new Error("File storage returned an invalid URL");
    error.code = "INVALID_BLOB_RESPONSE";
    error.status = 502;
    throw error;
  }

  return blobUrl;
}

export async function deleteUploadByUrl(uploadUrl, expectedFolder) {
  const blobUrl = resolveBlobUrl(uploadUrl, expectedFolder);
  if (blobUrl) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw storageConfigurationError();
    await del(blobUrl, { token });
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
