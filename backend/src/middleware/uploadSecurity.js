import fs from "node:fs/promises";
import path from "node:path";
import { fileTypeFromBuffer, fileTypeFromFile } from "file-type";

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

export async function deleteUploadedFiles(files) {
  await Promise.all(
    files.filter(Boolean).map(async (file) => {
      try {
        if (file.path) await fs.unlink(file.path);
      } catch (error) {
        if (error?.code !== "ENOENT") {
          console.error("Rejected upload cleanup failed", {
            code: error?.code,
            message: error?.message,
          });
        }
      }
    }),
  );
}

async function detectUploadedFileType(file) {
  return file.buffer
    ? fileTypeFromBuffer(file.buffer)
    : fileTypeFromFile(file.path);
}

export async function verifyUploadedImages(req, res, next) {
  const files = uploadedFiles(req);

  try {
    for (const file of files) {
      const detected = await detectUploadedFileType(file);

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
      const detected = await detectUploadedFileType(file);
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
