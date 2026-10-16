USE sna_cms;

-- Normalize leading/trailing whitespace, tabs and line breaks.
UPDATE products
SET name = TRIM(
  REPLACE(
    REPLACE(
      REPLACE(name, CHAR(9), ' '),
      CHAR(10),
      ' '
    ),
    CHAR(13),
    ' '
  )
);

-- Collapse repeated spaces. Re-running these statements is safe.
UPDATE products SET name = REPLACE(name, '  ', ' ');
UPDATE products SET name = REPLACE(name, '  ', ' ');
UPDATE products SET name = REPLACE(name, '  ', ' ');
UPDATE products SET name = REPLACE(name, '  ', ' ');
UPDATE products SET name = REPLACE(name, '  ', ' ');
UPDATE products SET name = REPLACE(name, '  ', ' ');
UPDATE products SET name = REPLACE(name, '  ', ' ');
UPDATE products SET name = REPLACE(name, '  ', ' ');

-- Review this result. Duplicate groups must be resolved before collation or
-- unique-index changes can be made safely.
SELECT
  LOWER(name) AS normalized_name,
  COUNT(*) AS duplicate_count,
  GROUP_CONCAT(id ORDER BY id) AS product_ids
FROM products
GROUP BY LOWER(name)
HAVING COUNT(*) > 1;

SET @duplicate_groups = (
  SELECT COUNT(*)
  FROM (
    SELECT LOWER(name)
    FROM products
    GROUP BY LOWER(name)
    HAVING COUNT(*) > 1
  ) AS duplicate_names
);

-- A case-insensitive collation makes "Honey" and "honey" equal at database
-- level. This also protects concurrent requests from a race condition.
SET @name_collation = (
  SELECT COLLATION_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'name'
);
SET @sql = IF(
  @duplicate_groups > 0,
  'SELECT ''Name collation skipped: resolve duplicate products, then rerun this migration'' AS migration_status',
  IF(
    @name_collation <> 'utf8mb4_unicode_ci',
    'ALTER TABLE products MODIFY name VARCHAR(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL',
    'SELECT ''products.name collation already configured'' AS migration_status'
  )
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @unique_index_exists = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND INDEX_NAME = 'uq_products_name'
    AND NON_UNIQUE = 0
);

SET @sql = IF(
  @duplicate_groups > 0,
  'SELECT ''Unique index skipped: resolve duplicate products, then rerun this migration'' AS migration_status',
  IF(
    @unique_index_exists > 0,
    'SELECT ''uq_products_name already exists'' AS migration_status',
    'ALTER TABLE products ADD UNIQUE KEY uq_products_name (name)'
  )
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
