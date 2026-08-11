import fs from "node:fs/promises";
import path from "node:path";
import { fileTypeFromFile } from "file-type";

export const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function imageFileFilter(_req, file, callback) {
  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    return callback(
      new Error("Only JPG, PNG and WEBP images are allowed"),
    );
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
        await fs.unlink(file.path);
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
