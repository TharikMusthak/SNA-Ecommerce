-- Some pre-migration databases already received this field through an earlier
-- manual deployment. Add it only when it is absent so the migration remains
-- safe to run against either schema.
DROP PROCEDURE IF EXISTS sna_add_order_item_image_column;
DELIMITER $$
CREATE PROCEDURE sna_add_order_item_image_column()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'order_items'
      AND COLUMN_NAME = 'product_image'
  ) THEN
    ALTER TABLE order_items
      ADD COLUMN product_image VARCHAR(500) NULL AFTER product_name;
  END IF;
END$$
DELIMITER ;

CALL sna_add_order_item_image_column();
DROP PROCEDURE sna_add_order_item_image_column;

UPDATE order_items oi
LEFT JOIN products p ON p.id = oi.product_id
SET oi.product_image = p.main_image
WHERE oi.product_image IS NULL;
