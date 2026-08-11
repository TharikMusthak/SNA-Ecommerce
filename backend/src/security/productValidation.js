import { cleanText } from "./validation.js";

export const DUPLICATE_PRODUCT_MESSAGE =
  "Product name already exists. Please use a different name.";

export function normalizeProductName(value) {
  return cleanText(value, 190).replace(/\s+/g, " ");
}

export async function productNameExists(queryable, name, excludeId = null) {
  const params = [name];
  let query = "SELECT id FROM products WHERE LOWER(name) = LOWER(?)";

  if (excludeId) {
    query += " AND id <> ?";
    params.push(excludeId);
  }

  query += " LIMIT 1";
  const [rows] = await queryable.query(query, params);
  return rows.length > 0;
}

export function isDuplicateProductNameError(error) {
  if (error?.code !== "ER_DUP_ENTRY") return false;

  const errorDetails = [
    error.constraint,
    error.sqlMessage,
    error.message,
  ]
    .filter(Boolean)
    .join(" ");

  return errorDetails.includes("uq_products_name");
}
