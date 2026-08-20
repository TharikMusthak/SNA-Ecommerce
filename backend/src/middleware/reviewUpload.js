import { randomUUID } from "node:crypto";
import fs from "node:fs";
import multer from "multer";
import { reviewUploadsDir } from "../config/paths.js";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  productMediaFileFilter,
  verifyProductMedia,
} from "./uploadSecurity.js";

fs.mkdirSync(reviewUploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: reviewUploadsDir,
  filename: (_req, file, callback) => {
    const extension = ALLOWED_IMAGE_TYPES.get(file.mimetype) || ALLOWED_VIDEO_TYPES.get(file.mimetype);
    callback(null, `${randomUUID()}.${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 2 },
  fileFilter: productMediaFileFilter,
});

export const reviewUpload = [
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  verifyProductMedia,
];

export function reviewFileUrl(file) {
  return file ? `/uploads/reviews/${file.filename}` : null;
}
