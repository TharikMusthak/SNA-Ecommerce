CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  parent_id INT UNSIGNED DEFAULT NULL,
  description TEXT,
  status ENUM('Active','Draft') NOT NULL DEFAULT 'Active',
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categories_name_parent (name, parent_id),
  KEY idx_categories_parent (parent_id),
  CONSTRAINT fk_category_parent
    FOREIGN KEY (parent_id) REFERENCES categories(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS sna_legacy_add_column;
DELIMITER $$
CREATE PROCEDURE sna_legacy_add_column(
  IN table_name_value VARCHAR(64),
  IN column_name_value VARCHAR(64),
  IN definition_value TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND COLUMN_NAME = column_name_value
  ) THEN
    SET @ddl = CONCAT(
      'ALTER TABLE `', table_name_value,
      '` ADD COLUMN `', column_name_value, '` ', definition_value
    );
    PREPARE statement_value FROM @ddl;
    EXECUTE statement_value;
    DEALLOCATE PREPARE statement_value;
  END IF;
END$$
DELIMITER ;

CALL sna_legacy_add_column(
  'products',
  'category_id',
  'INT UNSIGNED DEFAULT NULL AFTER `category`'
);
CALL sna_legacy_add_column(
  'products',
  'low_stock_threshold',
  'INT UNSIGNED NOT NULL DEFAULT 5 AFTER `stock`'
);
DROP PROCEDURE sna_legacy_add_column;

INSERT INTO categories (name, slug, status, sort_order)
SELECT
  source_category.name,
  CONCAT('legacy-category-', source_category.first_product_id),
  'Active',
  source_category.first_product_id
FROM (
  SELECT TRIM(category) AS name, MIN(id) AS first_product_id
  FROM products
  WHERE category IS NOT NULL AND TRIM(category) <> ''
  GROUP BY TRIM(category)
) AS source_category
WHERE NOT EXISTS (
  SELECT 1
  FROM categories existing_category
  WHERE CONVERT(existing_category.name USING utf8mb4)
          COLLATE utf8mb4_unicode_ci =
        CONVERT(source_category.name USING utf8mb4)
          COLLATE utf8mb4_unicode_ci
);

UPDATE products product
JOIN categories category
  ON CONVERT(category.name USING utf8mb4)
       COLLATE utf8mb4_unicode_ci =
     CONVERT(TRIM(product.category) USING utf8mb4)
       COLLATE utf8mb4_unicode_ci
SET product.category_id = category.id
WHERE product.category_id IS NULL;

DROP PROCEDURE IF EXISTS sna_legacy_add_index;
DELIMITER $$
CREATE PROCEDURE sna_legacy_add_index(
  IN table_name_value VARCHAR(64),
  IN index_name_value VARCHAR(64),
  IN definition_value TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND INDEX_NAME = index_name_value
  ) THEN
    SET @ddl = CONCAT(
      'ALTER TABLE `', table_name_value, '` ADD ', definition_value
    );
    PREPARE statement_value FROM @ddl;
    EXECUTE statement_value;
    DEALLOCATE PREPARE statement_value;
  END IF;
END$$
DELIMITER ;

CALL sna_legacy_add_index(
  'products',
  'idx_products_category',
  'KEY `idx_products_category` (`category_id`)'
);
DROP PROCEDURE sna_legacy_add_index;

DROP PROCEDURE IF EXISTS sna_legacy_add_fk;
DELIMITER $$
CREATE PROCEDURE sna_legacy_add_fk(
  IN table_name_value VARCHAR(64),
  IN constraint_name_value VARCHAR(64),
  IN definition_value TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND CONSTRAINT_NAME = constraint_name_value
  ) THEN
    SET @ddl = CONCAT(
      'ALTER TABLE `', table_name_value, '` ADD CONSTRAINT `',
      constraint_name_value, '` ', definition_value
    );
    PREPARE statement_value FROM @ddl;
    EXECUTE statement_value;
    DEALLOCATE PREPARE statement_value;
  END IF;
END$$
DELIMITER ;

CALL sna_legacy_add_fk(
  'products',
  'fk_product_category',
  'FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL'
);
DROP PROCEDURE sna_legacy_add_fk;
