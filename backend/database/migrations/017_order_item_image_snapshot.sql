ALTER TABLE order_items
  ADD COLUMN product_image VARCHAR(500) NULL AFTER product_name;

UPDATE order_items oi
LEFT JOIN products p ON p.id = oi.product_id
SET oi.product_image = p.main_image
WHERE oi.product_image IS NULL;
