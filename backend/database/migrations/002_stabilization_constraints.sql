DROP PROCEDURE IF EXISTS sna_add_column;
DROP PROCEDURE IF EXISTS sna_add_index;
DROP PROCEDURE IF EXISTS sna_add_fk;
DELIMITER $$
CREATE PROCEDURE sna_add_column(IN table_value VARCHAR(64), IN column_value VARCHAR(64), IN definition_value TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=table_value AND COLUMN_NAME=column_value) THEN
    SET @ddl=CONCAT('ALTER TABLE `',table_value,'` ADD COLUMN `',column_value,'` ',definition_value);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
CREATE PROCEDURE sna_add_index(IN table_value VARCHAR(64), IN index_value VARCHAR(64), IN definition_value TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=table_value AND INDEX_NAME=index_value) THEN
    SET @ddl=CONCAT('ALTER TABLE `',table_value,'` ADD ',definition_value);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
CREATE PROCEDURE sna_add_fk(IN table_value VARCHAR(64), IN constraint_value VARCHAR(64), IN definition_value TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=table_value AND CONSTRAINT_NAME=constraint_value) THEN
    SET @ddl=CONCAT('ALTER TABLE `',table_value,'` ADD CONSTRAINT `',constraint_value,'` ',definition_value);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL sna_add_column('orders','checkout_idempotency_key','VARCHAR(190) NULL AFTER order_code');
CALL sna_add_column('cart_items','variant_identity','INT UNSIGNED AS (IFNULL(variant_id,0)) PERSISTENT');

UPDATE products SET slug=CONCAT('product-',id) WHERE slug IS NULL OR TRIM(slug)='';

DROP TEMPORARY TABLE IF EXISTS duplicate_cart_items;
CREATE TEMPORARY TABLE duplicate_cart_items AS
SELECT MIN(id) keep_id,cart_id,product_id,IFNULL(variant_id,0) variant_identity,SUM(quantity) total_quantity
FROM cart_items
GROUP BY cart_id,product_id,IFNULL(variant_id,0)
HAVING COUNT(*)>1;
UPDATE cart_items ci JOIN duplicate_cart_items d ON d.keep_id=ci.id SET ci.quantity=d.total_quantity;
DELETE ci FROM cart_items ci JOIN duplicate_cart_items d
  ON d.cart_id=ci.cart_id AND d.product_id=ci.product_id
  AND d.variant_identity=IFNULL(ci.variant_id,0) AND ci.id<>d.keep_id;
DROP TEMPORARY TABLE duplicate_cart_items;

CALL sna_add_index('products','uq_products_slug','UNIQUE KEY `uq_products_slug` (`slug`)');
CALL sna_add_index('products','uq_products_sku','UNIQUE KEY `uq_products_sku` (`sku`)');
CALL sna_add_index('products','idx_products_public','KEY `idx_products_public` (`status`,`deleted_at`,`published_at`)');
CALL sna_add_index('orders','uq_orders_checkout_idempotency','UNIQUE KEY `uq_orders_checkout_idempotency` (`checkout_idempotency_key`)');
CALL sna_add_index('orders','idx_orders_user_created','KEY `idx_orders_user_created` (`user_id`,`created_at`)');
CALL sna_add_index('cart_items','uq_cart_product_variant_stable','UNIQUE KEY `uq_cart_product_variant_stable` (`cart_id`,`product_id`,`variant_identity`)');

CALL sna_add_fk('products','fk_products_brand','FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE SET NULL');
CALL sna_add_fk('orders','fk_orders_user','FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL');
CALL sna_add_fk('orders','fk_orders_address','FOREIGN KEY (`address_id`) REFERENCES `user_addresses`(`id`) ON DELETE SET NULL');

DROP PROCEDURE sna_add_column;
DROP PROCEDURE sna_add_index;
DROP PROCEDURE sna_add_fk;
