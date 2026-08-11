import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import { pool } from "../config/db.js";
import { productUploadsDir } from "../config/paths.js";
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
import {
  DUPLICATE_PRODUCT_MESSAGE,
  normalizeProductName,
  productNameExists,
} from "../security/productValidation.js";
import {
  safelyDeleteUpload,
  safelyDeleteUploads,
} from "../services/uploadFiles.js";
import { paginated } from "../utils/apiResponse.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();
const PRODUCT_STATUSES = ["Active", "Draft"];

fs.mkdirSync(productUploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: productUploadsDir,
  filename: (_req, file, callback) => {
    const extension = ALLOWED_IMAGE_TYPES.get(file.mimetype);
    callback(null, `${randomUUID()}.${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 9 },
  fileFilter: imageFileFilter,
});

const productUpload = upload.fields([
  { name: "main_image", maxCount: 1 },
  { name: "gallery", maxCount: 8 },
]);

router.use(
  requireAdmin,
  allowRoles("Super Admin", "Product Manager"),
);

router.get("/", async (req, res) => {
  const pagination = parsePagination(req.query, ["id", "name", "price", "stock", "status", "created_at"], "id");
  const search = cleanText(req.query.search, 120);
  const status = cleanText(req.query.status, 20);
  const categoryId = parsePositiveId(req.query.category_id);
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push("(p.name LIKE ? OR p.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (isAllowed(status, PRODUCT_STATUSES)) {
    conditions.push("p.status = ?");
    params.push(status);
  }
  if (categoryId) {
    conditions.push("p.category_id = ?");
    params.push(categoryId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT
       p.*,
       c.name AS category_name,
       COUNT(pi.id) AS gallery_count
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_images pi ON pi.product_id = p.id
     ${where}
     GROUP BY p.id
     ORDER BY p.${pagination.sort} ${pagination.order}
     ${req.baseUrl.includes("/v1/") ? "LIMIT ? OFFSET ?" : ""}`,
    req.baseUrl.includes("/v1/") ? [...params,pagination.limit,pagination.offset] : params,
  );
  if (req.baseUrl.includes("/v1/")) {
    const [[count]] = await pool.query(`SELECT COUNT(*) total FROM products p ${where}`, params);
    return paginated(res, rows, { ...pagination, total: Number(count.total) });
  }
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid product ID" });

  const [[product]] = await pool.query(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?
     LIMIT 1`,
    [id],
  );

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const [[images], [variants]] = await Promise.all([
    pool.query(
      `SELECT id, image, sort_order, created_at
       FROM product_images
       WHERE product_id = ?
       ORDER BY sort_order, id`,
      [id],
    ),
    pool.query(
      `SELECT id, brand, color, size, sku, price, stock, status
       FROM product_variants
       WHERE product_id = ?
       ORDER BY id DESC`,
      [id],
    ),
  ]);

  res.json({ ...product, images, variants });
});

router.post(
  "/",
  productUpload,
  verifyUploadedImages,
  async (req, res) => {
    const input = parseProduct(req.body);
    const newFiles = uploadedFiles(req);

    if (input.error) {
      await deleteUploadedFiles(newFiles);
      return res.status(400).json({ message: input.error });
    }

    let connection;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      if (await productNameExists(connection, input.value.name)) {
        await connection.rollback();
        await deleteUploadedFiles(newFiles);
        return res.status(409).json({
          message: DUPLICATE_PRODUCT_MESSAGE,
        });
      }

      const category = await resolveCategory(connection, input.value);
      if (!category) {
        await connection.rollback();
        await deleteUploadedFiles(newFiles);
        return res.status(400).json({ message: "Selected category not found" });
      }

      const mainImage = req.files?.main_image?.[0]
        ? imageUrl(req.files.main_image[0])
        : null;
      const slug = await resolveProductSlug(connection, req.body.slug || input.value.name);
      const [result] = await connection.query(
        `INSERT INTO products
          (name, category, category_id, price, stock, low_stock_threshold,
           status, description, main_image, slug)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.value.name,
          category.name,
          category.id,
          input.value.price,
          input.value.stock,
          input.value.lowStockThreshold,
          input.value.status,
          input.value.description,
          mainImage,
          slug,
        ],
      );

      for (const [index, file] of (
        req.files?.gallery || []
      ).entries()) {
        await connection.query(
          `INSERT INTO product_images(product_id, image, sort_order)
           VALUES (?, ?, ?)`,
          [result.insertId, imageUrl(file), index],
        );
      }

      await connection.commit();
      res.status(201).json({ id: result.insertId });
    } catch (error) {
      if (connection) await connection.rollback();
      await deleteUploadedFiles(newFiles);
      throw error;
    } finally {
      connection?.release();
    }
  },
);

router.put(
  "/:id",
  productUpload,
  verifyUploadedImages,
  async (req, res) => {
    const id = parsePositiveId(req.params.id);
    const input = parseProduct(req.body);
    const newFiles = uploadedFiles(req);

    if (!id || input.error) {
      await deleteUploadedFiles(newFiles);
      return res.status(400).json({
        message: input.error || "Invalid product ID",
      });
    }

    let connection;
    let oldMainImage = null;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      const [[existingProduct]] = await connection.query(
        `SELECT main_image, slug
         FROM products
         WHERE id = ?
         FOR UPDATE`,
        [id],
      );

      if (!existingProduct) {
        await connection.rollback();
        await deleteUploadedFiles(newFiles);
        return res.status(404).json({ message: "Product not found" });
      }

      if (await productNameExists(connection, input.value.name, id)) {
        await connection.rollback();
        await deleteUploadedFiles(newFiles);
        return res.status(409).json({
          message: DUPLICATE_PRODUCT_MESSAGE,
        });
      }

      const category = await resolveCategory(connection, input.value);
      if (!category) {
        await connection.rollback();
        await deleteUploadedFiles(newFiles);
        return res.status(400).json({ message: "Selected category not found" });
      }

      oldMainImage = existingProduct.main_image;
      const newMainFile = req.files?.main_image?.[0];
      const removeMainImage =
        req.body.remove_main_image === "1" && !newMainFile;
      const mainImage = newMainFile
        ? imageUrl(newMainFile)
        : removeMainImage
          ? null
          : existingProduct.main_image;
      const slug = req.body.slug
        ? await resolveProductSlug(connection, req.body.slug, id)
        : existingProduct.slug || await resolveProductSlug(connection, input.value.name, id);
      const [[imageCount]] = await connection.query(
        "SELECT COUNT(*) AS total FROM product_images WHERE product_id = ?",
        [id],
      );
      const newGallery = req.files?.gallery || [];

      if (Number(imageCount.total) + newGallery.length > 8) {
        await connection.rollback();
        await deleteUploadedFiles(newFiles);
        return res.status(400).json({
          message: "A product can contain a maximum of 8 gallery images",
        });
      }

      await connection.query(
        `UPDATE products
         SET name = ?, category = ?, category_id = ?, price = ?, stock = ?,
             low_stock_threshold = ?, status = ?, description = ?,
             main_image = ?, slug = ?
         WHERE id = ?`,
        [
          input.value.name,
          category.name,
          category.id,
          input.value.price,
          input.value.stock,
          input.value.lowStockThreshold,
          input.value.status,
          input.value.description,
          mainImage,
          slug,
          id,
        ],
      );

      for (const [index, file] of newGallery.entries()) {
        await connection.query(
          `INSERT INTO product_images(product_id, image, sort_order)
           VALUES (?, ?, ?)`,
          [id, imageUrl(file), Number(imageCount.total) + index],
        );
      }

      await connection.commit();

      if ((newMainFile || removeMainImage) && oldMainImage !== mainImage) {
        await safelyDeleteUpload(oldMainImage, "products");
      }

      res.json({ message: "Product updated" });
    } catch (error) {
      if (connection) await connection.rollback();
      await deleteUploadedFiles(newFiles);
      throw error;
    } finally {
      connection?.release();
    }
  },
);

router.put("/:id/status", async (req, res) => {
  const id = parsePositiveId(req.params.id);
  const status = req.body.status;

  if (!id || !isAllowed(status, PRODUCT_STATUSES)) {
    return res.status(400).json({
      message: id ? "Invalid product status" : "Invalid product ID",
    });
  }

  const [result] = await pool.query(
    "UPDATE products SET status = ? WHERE id = ?",
    [status, id],
  );
  if (!result.affectedRows) {
    return res.status(404).json({ message: "Product not found" });
  }
  res.json({ message: "Product status updated" });
});

router.get("/:id/images", async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid product ID" });

  const [rows] = await pool.query(
    `SELECT id, product_id, image, sort_order, created_at
     FROM product_images
     WHERE product_id = ?
     ORDER BY sort_order, id`,
    [id],
  );
  res.json(rows);
});

router.post(
  "/:id/images",
  upload.array("images", 8),
  verifyUploadedImages,
  async (req, res) => {
    const id = parsePositiveId(req.params.id);
    const files = uploadedFiles(req);

    if (!id || files.length === 0) {
      await deleteUploadedFiles(files);
      return res.status(400).json({
        message: id ? "At least one image is required" : "Invalid product ID",
      });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [[product]] = await connection.query(
        "SELECT id FROM products WHERE id = ? FOR UPDATE",
        [id],
      );
      if (!product) {
        await connection.rollback();
        await deleteUploadedFiles(files);
        return res.status(404).json({ message: "Product not found" });
      }

      const [[count]] = await connection.query(
        "SELECT COUNT(*) AS total FROM product_images WHERE product_id = ?",
        [id],
      );
      if (Number(count.total) + files.length > 8) {
        await connection.rollback();
        await deleteUploadedFiles(files);
        return res.status(400).json({
          message: "A product can contain a maximum of 8 gallery images",
        });
      }

      const created = [];
      for (const [index, file] of files.entries()) {
        const image = imageUrl(file);
        const [result] = await connection.query(
          `INSERT INTO product_images(product_id, image, sort_order)
           VALUES (?, ?, ?)`,
          [id, image, Number(count.total) + index],
        );
        created.push({
          id: result.insertId,
          product_id: id,
          image,
          sort_order: Number(count.total) + index,
        });
      }

      await connection.commit();
      res.status(201).json(created);
    } catch (error) {
      await connection.rollback();
      await deleteUploadedFiles(files);
      throw error;
    } finally {
      connection.release();
    }
  },
);

router.put("/:productId/images/:imageId/primary", async (req, res) => {
  const productId = parsePositiveId(req.params.productId);
  const imageId = parsePositiveId(req.params.imageId);

  if (!productId || !imageId) {
    return res.status(400).json({ message: "Invalid product or image ID" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [[product]] = await connection.query(
      "SELECT main_image FROM products WHERE id = ? FOR UPDATE",
      [productId],
    );
    const [[image]] = await connection.query(
      `SELECT id, image, sort_order
       FROM product_images
       WHERE id = ? AND product_id = ?
       FOR UPDATE`,
      [imageId, productId],
    );

    if (!product || !image) {
      await connection.rollback();
      return res.status(404).json({ message: "Product image not found" });
    }

    await connection.query(
      "UPDATE products SET main_image = ? WHERE id = ?",
      [image.image, productId],
    );
    await connection.query(
      "DELETE FROM product_images WHERE id = ?",
      [image.id],
    );
    if (product.main_image && product.main_image !== image.image) {
      await connection.query(
        `INSERT INTO product_images(product_id, image, sort_order)
         VALUES (?, ?, ?)`,
        [productId, product.main_image, image.sort_order],
      );
    }
    await connection.commit();
    res.json({
      message: "Primary product image updated",
      main_image: image.image,
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.delete("/:productId/images/:imageId", async (req, res) => {
  const productId = parsePositiveId(req.params.productId);
  const imageId = parsePositiveId(req.params.imageId);

  if (!productId || !imageId) {
    return res.status(400).json({ message: "Invalid image ID" });
  }

  const connection = await pool.getConnection();
  let imagePath;

  try {
    await connection.beginTransaction();
    const [[image]] = await connection.query(
      `SELECT image
       FROM product_images
       WHERE id = ? AND product_id = ?
       FOR UPDATE`,
      [imageId, productId],
    );

    if (!image) {
      await connection.rollback();
      return res.status(404).json({ message: "Image not found" });
    }

    imagePath = image.image;
    await connection.query(
      "DELETE FROM product_images WHERE id = ? AND product_id = ?",
      [imageId, productId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await safelyDeleteUpload(imagePath, "products");
  res.json({ message: "Image deleted" });
});

router.delete("/:id", async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid product ID" });

  const connection = await pool.getConnection();
  let uploadUrls = [];

  try {
    await connection.beginTransaction();
    const [[product]] = await connection.query(
      "SELECT main_image FROM products WHERE id = ? FOR UPDATE",
      [id],
    );

    if (!product) {
      await connection.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    const [images] = await connection.query(
      "SELECT image FROM product_images WHERE product_id = ?",
      [id],
    );
    uploadUrls = [
      product.main_image,
      ...images.map((image) => image.image),
    ];

    await connection.query("DELETE FROM products WHERE id = ?", [id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await safelyDeleteUploads(uploadUrls, "products");
  res.json({ message: "Product deleted" });
});

function imageUrl(file) {
  return `/uploads/products/${file.filename}`;
}

function parseProduct(body) {
  const rawCategoryId = String(body.category_id || "").trim();
  const categoryId = rawCategoryId
    ? parsePositiveId(rawCategoryId)
    : null;
  const value = {
    name: normalizeProductName(body.name),
    category: cleanText(body.category, 120),
    categoryId,
    price: Number(body.price),
    stock: Number(body.stock || 0),
    lowStockThreshold: Number(body.low_stock_threshold || 5),
    status: body.status || "Active",
    description: cleanText(body.description, 5000),
  };

  if (rawCategoryId && !categoryId) {
    return { error: "Invalid category ID" };
  }
  if (!value.name || (!value.category && !categoryId)) {
    return { error: "Product name and category are required" };
  }
  if (!Number.isFinite(value.price) || value.price < 0) {
    return { error: "Price must be a positive number" };
  }
  if (!Number.isInteger(value.stock) || value.stock < 0) {
    return { error: "Stock must be a positive whole number" };
  }
  if (
    !Number.isInteger(value.lowStockThreshold) ||
    value.lowStockThreshold < 0
  ) {
    return { error: "Low-stock threshold must be a positive whole number" };
  }
  if (!isAllowed(value.status, PRODUCT_STATUSES)) {
    return { error: "Invalid product status" };
  }

  return { value };
}

async function resolveProductSlug(queryable, value, excludeId = null) {
  const base = cleanText(value, 190).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "product";
  const params = [base];
  const exclusion = excludeId ? "AND id<>?" : "";
  if (excludeId) params.push(excludeId);
  const [[existing]] = await queryable.query(
    `SELECT id FROM products WHERE slug=? ${exclusion} LIMIT 1`, params,
  );
  return existing ? `${base}-${randomUUID().slice(0, 8)}` : base;
}

async function resolveCategory(queryable, product) {
  if (!product.categoryId) {
    return { id: null, name: product.category };
  }

  const [[category]] = await queryable.query(
    "SELECT id, name FROM categories WHERE id = ? LIMIT 1",
    [product.categoryId],
  );
  return category || null;
}

export default router;
