import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import { pool } from "../config/db.js";
import { bannerUploadsDir } from "../config/paths.js";
import { allowRoles, requireAdmin } from "../middleware/auth.js";
import {
  ALLOWED_IMAGE_TYPES,
  deleteUploadedFiles,
  imageFileFilter,
  uploadedFiles,
  verifyUploadedImages,
} from "../middleware/uploadSecurity.js";
import {
  cleanText,
  isAllowed,
  parsePositiveId,
} from "../security/validation.js";
import { safelyDeleteUpload, uploadBannerMedia } from "../services/uploadFiles.js";

const router = Router();
const BANNER_STATUSES = ["Active", "Draft"];

fs.mkdirSync(bannerUploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: bannerUploadsDir,
  filename: (_req, file, callback) => {
    const extension = ALLOWED_IMAGE_TYPES.get(file.mimetype);
    callback(null, `${randomUUID()}.${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: imageFileFilter,
});
const bannerUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "mobile_image", maxCount: 1 },
]);

router.get("/public", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, title, subtitle, button_text, button_link, image, mobile_image, sort_order
     FROM banners
     WHERE status = 'Active'
     ORDER BY sort_order, id DESC`,
  );
  res.json(rows);
});

router.use(
  requireAdmin,
  allowRoles("Super Admin", "Product Manager"),
);

router.get("/", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT
       id, title, subtitle, button_text, button_link, image, mobile_image,
       status, sort_order, created_at
     FROM banners
     ORDER BY sort_order, id DESC`,
  );
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const bannerId = parsePositiveId(req.params.id);
  if (!bannerId) {
    return res.status(400).json({ message: "Invalid banner ID" });
  }

  const [[banner]] = await pool.query(
    `SELECT
       id, title, subtitle, button_text, button_link, image, mobile_image,
       status, sort_order, created_at
     FROM banners
     WHERE id = ?
     LIMIT 1`,
    [bannerId],
  );
  if (!banner) {
    return res.status(404).json({ message: "Banner not found" });
  }
  res.json(banner);
});

router.post(
  "/",
  bannerUpload,
  verifyUploadedImages,
  async (req, res) => {
    const input = parseBanner(req.body);
    const files = uploadedFiles(req);

    const desktopFile = req.files?.image?.[0];
    const mobileFile = req.files?.mobile_image?.[0];
    if (input.error || !desktopFile) {
      await deleteUploadedFiles(files);
      return res.status(400).json({
        message: input.error || "Banner image required",
      });
    }

    try {
      await uploadBannerMedia(files);
      const uploadedImage = imageUrl(desktopFile);
      const uploadedMobileImage = imageUrl(mobileFile);
      const [result] = await pool.query(
        `INSERT INTO banners
          (title, subtitle, button_text, button_link, image, mobile_image, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.value.title,
          input.value.subtitle,
          input.value.buttonText,
          input.value.buttonLink,
          uploadedImage,
          uploadedMobileImage,
          input.value.status,
          input.value.sortOrder,
        ],
      );

      res.status(201).json({
        id: result.insertId,
        image: uploadedImage,
        mobile_image: uploadedMobileImage,
      });
    } catch (error) {
      await deleteUploadedFiles(files);
      await Promise.all(files.map((file) => safelyDeleteUpload(imageUrl(file), "banners")));
      throw error;
    }
  },
);

router.put(
  "/:id",
  bannerUpload,
  verifyUploadedImages,
  async (req, res) => {
    const bannerId = parsePositiveId(req.params.id);
    const input = parseBanner(req.body);
    const files = uploadedFiles(req);

    if (!bannerId || input.error) {
      await deleteUploadedFiles(files);
      return res.status(400).json({
        message: input.error || "Invalid banner ID",
      });
    }

    let connection;
    let oldImage;
    let oldMobileImage;
    let finalImage;
    let finalMobileImage;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      await uploadBannerMedia(files);
      const newImage = imageUrl(req.files?.image?.[0]);
      const newMobileImage = imageUrl(req.files?.mobile_image?.[0]);
      const [[existingBanner]] = await connection.query(
        "SELECT image, mobile_image FROM banners WHERE id = ? FOR UPDATE",
        [bannerId],
      );

      if (!existingBanner) {
        await connection.rollback();
        await deleteUploadedFiles(files);
        await Promise.all(files.map((file) => safelyDeleteUpload(imageUrl(file), "banners")));
        return res.status(404).json({ message: "Banner not found" });
      }

      oldImage = existingBanner.image;
      oldMobileImage = existingBanner.mobile_image;
      finalImage = newImage || existingBanner.image;
      finalMobileImage = newMobileImage || existingBanner.mobile_image;

      await connection.query(
        `UPDATE banners
         SET title = ?, subtitle = ?, button_text = ?, button_link = ?,
             image = ?, mobile_image = ?, status = ?, sort_order = ?
         WHERE id = ?`,
        [
          input.value.title,
          input.value.subtitle,
          input.value.buttonText,
          input.value.buttonLink,
          finalImage,
          finalMobileImage,
          input.value.status,
          input.value.sortOrder,
          bannerId,
        ],
      );
      await connection.commit();

      if (newImage && oldImage !== newImage) {
        await safelyDeleteUpload(oldImage, "banners");
      }
      if (newMobileImage && oldMobileImage !== newMobileImage) {
        await safelyDeleteUpload(oldMobileImage, "banners");
      }

      res.json({ message: "Banner updated", image: finalImage, mobile_image: finalMobileImage });
    } catch (error) {
      if (connection) await connection.rollback();
      await deleteUploadedFiles(files);
      await Promise.all(files.map((file) => safelyDeleteUpload(imageUrl(file), "banners")));
      throw error;
    } finally {
      connection?.release();
    }
  },
);

router.put("/:id/status", async (req, res) => {
  const bannerId = parsePositiveId(req.params.id);
  const status = req.body.status;

  if (!bannerId || !isAllowed(status, BANNER_STATUSES)) {
    return res.status(400).json({
      message: bannerId ? "Invalid banner status" : "Invalid banner ID",
    });
  }

  const [result] = await pool.query(
    "UPDATE banners SET status = ? WHERE id = ?",
    [status, bannerId],
  );
  if (!result.affectedRows) {
    return res.status(404).json({ message: "Banner not found" });
  }
  res.json({ message: "Banner status updated" });
});

router.delete("/:id", async (req, res) => {
  const bannerId = parsePositiveId(req.params.id);
  if (!bannerId) {
    return res.status(400).json({ message: "Invalid banner ID" });
  }

  const connection = await pool.getConnection();
  let imagePath;
  let mobileImagePath;

  try {
    await connection.beginTransaction();
    const [[banner]] = await connection.query(
      "SELECT image, mobile_image FROM banners WHERE id = ? FOR UPDATE",
      [bannerId],
    );

    if (!banner) {
      await connection.rollback();
      return res.status(404).json({ message: "Banner not found" });
    }

    imagePath = banner.image;
    mobileImagePath = banner.mobile_image;
    await connection.query("DELETE FROM banners WHERE id = ?", [bannerId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await safelyDeleteUpload(imagePath, "banners");
  await safelyDeleteUpload(mobileImagePath, "banners");
  res.json({ message: "Banner deleted" });
});

function parseBanner(body) {
  const value = {
    title: cleanText(body.title, 220),
    subtitle: cleanText(body.subtitle, 1000),
    buttonText: cleanText(body.button_text || "Shop now", 80),
    buttonLink: safeButtonLink(body.button_link || "/products"),
    status: body.status || "Active",
    sortOrder: Number(body.sort_order || 0),
  };

  if (!value.title) return { error: "Banner title is required" };
  if (!value.buttonLink) {
    return { error: "Button link must be a relative path or HTTPS URL" };
  }
  if (!isAllowed(value.status, BANNER_STATUSES)) {
    return { error: "Invalid banner status" };
  }
  if (!Number.isSafeInteger(value.sortOrder) || value.sortOrder < 0) {
    return { error: "Sort order must be a positive whole number" };
  }

  return { value };
}

function safeButtonLink(value) {
  const link = cleanText(value, 255);
  if (/^\/(?!\/)/.test(link)) return link;

  try {
    const url = new URL(link);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function imageUrl(file) {
  return file ? file.blobUrl || `/uploads/banners/${file.filename}` : null;
}

export default router;
