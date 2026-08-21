import fs from "node:fs/promises";
import path from "node:path";
import { fileTypeFromFile } from "file-type";
import {
  blobStorageEnabled,
  safelyDeleteUpload,
  uploadFileToBlob,
} from "../services/uploadFiles.js";

export const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export const ALLOWED_VIDEO_TYPES = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
]);

export function imageFileFilter(_req, file, callback) {
  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    return callback(
      new Error("Only JPG, PNG and WEBP images are allowed"),
    );
  }

  callback(null, true);
}

export function productMediaFileFilter(_req, file, callback) {
  const allowed = file.fieldname === "video"
    ? ALLOWED_VIDEO_TYPES.has(file.mimetype)
    : ALLOWED_IMAGE_TYPES.has(file.mimetype);
  if (!allowed) {
    return callback(new Error(file.fieldname === "video"
      ? "Only MP4, WebM and MOV videos are allowed"
      : "Only JPG, PNG and WEBP images are allowed"));
  }
  callback(null, true);
}

export function uploadedFiles(req) {
  if (req.file) return [req.file];
  if (!req.files) return [];
  if (Array.isArray(req.files)) return req.files;
  return Object.values(req.files).flat();
}

async function deleteTemporaryFile(file) {
  if (!file?.path) return;

  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error("Temporary upload cleanup failed", {
        code: error?.code,
        message: error?.message,
      });
    }
  }
}

export async function deleteUploadedFiles(files) {
  await Promise.all(
    files.filter(Boolean).map(async (file) => {
      if (file.blobUrl && file.blobFolder) {
        await safelyDeleteUpload(file.blobUrl, file.blobFolder);
      }
      await deleteTemporaryFile(file);
    }),
  );
}

export function persistUploadedFilesToBlob(expectedFolder) {
  if (!/^[a-z0-9_-]+$/i.test(expectedFolder)) {
    throw new Error("Invalid Blob upload folder");
  }

  return async function persistUploads(req, _res, next) {
    const files = uploadedFiles(req);
    if (files.length === 0) return next();

    if (!blobStorageEnabled()) {
      if (process.env.VERCEL === "1") {
        await deleteUploadedFiles(files);
        const error = new Error(
          "File storage is not configured. Connect Vercel Blob and provide BLOB_READ_WRITE_TOKEN.",
        );
        error.code = "BLOB_STORAGE_NOT_CONFIGURED";
        error.status = 500;
        return next(error);
      }
      return next();
    }

    try {
      for (const file of files) {
        file.blobUrl = await uploadFileToBlob(file, expectedFolder);
        file.blobFolder = expectedFolder;
        await deleteTemporaryFile(file);
      }
      next();
    } catch (cause) {
      await deleteUploadedFiles(files);
      const error = new Error("Persistent file upload failed");
      error.code = "BLOB_UPLOAD_FAILED";
      error.status = 502;
      error.cause = cause;
      next(error);
    }
  };
}

export async function verifyUploadedImages(req, res, next) {
  const files = uploadedFiles(req);

  try {
    for (const file of files) {
      const detected = await fileTypeFromFile(file.path);

      if (
        !detected ||
        !ALLOWED_IMAGE_TYPES.has(detected.mime) ||
        detected.mime !== file.mimetype
      ) {
        await deleteUploadedFiles(files);
        return res.status(400).json({
          message: "Uploaded file is not a valid supported image",
        });
      }

      const safeExtension = ALLOWED_IMAGE_TYPES.get(detected.mime);
      if (path.extname(file.filename).slice(1) !== safeExtension) {
        await deleteUploadedFiles(files);
        return res.status(400).json({
          message: "Uploaded image extension does not match its content",
        });
      }
    }

    next();
  } catch (error) {
    await deleteUploadedFiles(files);
    next(error);
  }
}

export async function verifyProductMedia(req, res, next) {
  const files = uploadedFiles(req);
  try {
    for (const file of files) {
      const detected = await fileTypeFromFile(file.path);
      const isVideo = file.fieldname === "video";
      const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
      const sizeLimit = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (!detected || !allowedTypes.has(detected.mime) || detected.mime !== file.mimetype) {
        await deleteUploadedFiles(files);
        return res.status(400).json({ message: `Uploaded file is not a valid supported ${isVideo ? "video" : "image"}` });
      }
      if (file.size > sizeLimit || path.extname(file.filename).slice(1) !== allowedTypes.get(detected.mime)) {
        await deleteUploadedFiles(files);
        return res.status(400).json({ message: isVideo ? "Video must be 50 MB or smaller and match its file extension" : "Image must be 5 MB or smaller and match its file extension" });
      }
    }
    next();
  } catch (error) {
    await deleteUploadedFiles(files);
    next(error);
  }
}
