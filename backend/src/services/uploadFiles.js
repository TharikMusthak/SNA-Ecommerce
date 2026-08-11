import fs from "node:fs/promises";
import path from "node:path";
import { uploadsRoot } from "../config/paths.js";

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

export async function deleteUploadByUrl(uploadUrl, expectedFolder) {
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
