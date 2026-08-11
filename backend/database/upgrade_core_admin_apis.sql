USE sna_cms;

CREATE TABLE IF NOT EXISTS admin_refresh_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  session_version INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_refresh_admin (admin_id),
  KEY idx_refresh_expiry (expires_at),
  CONSTRAINT fk_refresh_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_reset_admin (admin_id),
  KEY idx_reset_expiry (expires_at),
  CONSTRAINT fk_reset_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

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

SET @category_id_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'category_id'
);
SET @sql = IF(
  @category_id_exists = 0,
  'ALTER TABLE products ADD COLUMN category_id INT UNSIGNED DEFAULT NULL AFTER category',
  'SELECT ''products.category_id already exists'' AS migration_status'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @low_stock_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'low_stock_threshold'
);
SET @sql = IF(
  @low_stock_exists = 0,
  'ALTER TABLE products ADD COLUMN low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 5 AFTER stock',
  'SELECT ''products.low_stock_threshold already exists'' AS migration_status'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

INSERT IGNORE INTO categories(name, slug, status, sort_order)
SELECT
  category,
  CONCAT('legacy-category-', MIN(id)),
  'Active',
  MIN(id)
FROM products
WHERE category IS NOT NULL AND TRIM(category) <> ''
GROUP BY category;

UPDATE products p
JOIN categories c ON LOWER(c.name) = LOWER(p.category)
SET p.category_id = c.id
WHERE p.category_id IS NULL;

SET @product_category_fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND CONSTRAINT_NAME = 'fk_product_category'
);
SET @sql = IF(
  @product_category_fk_exists = 0,
  'ALTER TABLE products ADD CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL',
  'SELECT ''fk_product_category already exists'' AS migration_status'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

CREATE TABLE IF NOT EXISTS inventory_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  admin_id INT UNSIGNED DEFAULT NULL,
  action ENUM('Set','Restock','Sale','Adjustment') NOT NULL,
  quantity_change INT NOT NULL,
  previous_stock INT UNSIGNED NOT NULL,
  new_stock INT UNSIGNED NOT NULL,
  note VARCHAR(500) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_inventory_product (product_id),
  KEY idx_inventory_created (created_at),
  CONSTRAINT fk_inventory_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_inventory_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id)
    ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_pages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(140) NOT NULL UNIQUE,
  title VARCHAR(190) NOT NULL,
  content LONGTEXT NOT NULL,
  status ENUM('Published','Draft') NOT NULL DEFAULT 'Published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO cms_pages(slug, title, content, status) VALUES
('home', 'Home', 'Welcome to SNA.', 'Published'),
('about-us', 'About Us', 'Add your SNA company story here.', 'Published'),
('contact', 'Contact', 'Add your contact information here.', 'Published'),
('privacy-policy', 'Privacy Policy', 'Add your privacy policy here.', 'Draft'),
('terms-and-conditions', 'Terms and Conditions', 'Add your terms here.', 'Draft'),
('return-policy', 'Return Policy', 'Add your return policy here.', 'Draft'),
('shipping-policy', 'Shipping Policy', 'Add your shipping policy here.', 'Draft');
