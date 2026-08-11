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
import { safelyDeleteUpload } from "../services/uploadFiles.js";

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
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: imageFileFilter,
});

router.get("/public", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, title, subtitle, button_text, button_link, image, sort_order
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
       id, title, subtitle, button_text, button_link, image,
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
       id, title, subtitle, button_text, button_link, image,
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
  upload.single("image"),
  verifyUploadedImages,
  async (req, res) => {
    const input = parseBanner(req.body);
    const files = uploadedFiles(req);

    if (input.error || !req.file) {
      await deleteUploadedFiles(files);
      return res.status(400).json({
        message: input.error || "Banner image required",
      });
    }

    const uploadedImage = imageUrl(req.file);

    try {
      const [result] = await pool.query(
        `INSERT INTO banners
          (title, subtitle, button_text, button_link, image, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.value.title,
          input.value.subtitle,
          input.value.buttonText,
          input.value.buttonLink,
          uploadedImage,
          input.value.status,
          input.value.sortOrder,
        ],
      );

      res.status(201).json({
        id: result.insertId,
        image: uploadedImage,
      });
    } catch (error) {
      await deleteUploadedFiles(files);
      throw error;
    }
  },
);

router.put(
  "/:id",
  upload.single("image"),
  verifyUploadedImages,
  async (req, res) => {
    const bannerId = parsePositiveId(req.params.id);
    const input = parseBanner(req.body);
    const files = uploadedFiles(req);
    const newImage = req.file ? imageUrl(req.file) : null;

    if (!bannerId || input.error) {
      await deleteUploadedFiles(files);
      return res.status(400).json({
        message: input.error || "Invalid banner ID",
      });
    }

    let connection;
    let oldImage;
    let finalImage;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      const [[existingBanner]] = await connection.query(
        "SELECT image FROM banners WHERE id = ? FOR UPDATE",
        [bannerId],
      );

      if (!existingBanner) {
        await connection.rollback();
        await deleteUploadedFiles(files);
        return res.status(404).json({ message: "Banner not found" });
      }

      oldImage = existingBanner.image;
      finalImage = newImage || existingBanner.image;

      await connection.query(
        `UPDATE banners
         SET title = ?, subtitle = ?, button_text = ?, button_link = ?,
             image = ?, status = ?, sort_order = ?
         WHERE id = ?`,
        [
          input.value.title,
          input.value.subtitle,
          input.value.buttonText,
          input.value.buttonLink,
          finalImage,
          input.value.status,
          input.value.sortOrder,
          bannerId,
        ],
      );
      await connection.commit();

      if (newImage && oldImage !== newImage) {
        await safelyDeleteUpload(oldImage, "banners");
      }

      res.json({ message: "Banner updated", image: finalImage });
    } catch (error) {
      if (connection) await connection.rollback();
      await deleteUploadedFiles(files);
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

  try {
    await connection.beginTransaction();
    const [[banner]] = await connection.query(
      "SELECT image FROM banners WHERE id = ? FOR UPDATE",
      [bannerId],
    );

    if (!banner) {
      await connection.rollback();
      return res.status(404).json({ message: "Banner not found" });
    }

    imagePath = banner.image;
    await connection.query("DELETE FROM banners WHERE id = ?", [bannerId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await safelyDeleteUpload(imagePath, "banners");
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
  return `/uploads/banners/${file.filename}`;
}

export default router;
