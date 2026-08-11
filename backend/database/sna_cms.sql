CREATE DATABASE IF NOT EXISTS sna_cms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE sna_cms;

CREATE TABLE admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Super Admin','Product Manager','Order Manager')
    NOT NULL DEFAULT 'Product Manager',
  status ENUM('Active','Disabled') NOT NULL DEFAULT 'Active',
  session_version INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_refresh_tokens (
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

CREATE TABLE password_reset_tokens (
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

CREATE TABLE categories (
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

CREATE TABLE products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  category VARCHAR(120) NOT NULL,
  category_id INT UNSIGNED DEFAULT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 5,
  status ENUM('Active','Draft') NOT NULL DEFAULT 'Active',
  description TEXT,
  main_image VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_products_name (name),
  KEY idx_products_category (category_id),
  KEY idx_products_status (status),
  CONSTRAINT fk_product_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  image VARCHAR(255) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_product_images_product (product_id),
  CONSTRAINT fk_image_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_variants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  brand VARCHAR(120) NOT NULL,
  color VARCHAR(80) DEFAULT '',
  size VARCHAR(80) DEFAULT '',
  sku VARCHAR(120) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('Active','Draft') NOT NULL DEFAULT 'Active',
  KEY idx_variants_product (product_id),
  CONSTRAINT fk_variant_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE banners (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(220) NOT NULL,
  subtitle TEXT,
  button_text VARCHAR(80) DEFAULT 'Shop now',
  button_link VARCHAR(255) DEFAULT '/products',
  image VARCHAR(255) NOT NULL,
  status ENUM('Active','Draft') DEFAULT 'Active',
  sort_order INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cms_pages (
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

CREATE TABLE orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(80) NOT NULL UNIQUE,
  customer VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  product VARCHAR(220) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  stage TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE faqs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  status ENUM('Published','Draft') DEFAULT 'Published',
  sort_order INT UNSIGNED DEFAULT 0
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value TEXT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_history (
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

INSERT INTO categories(name, slug, status, sort_order) VALUES
('Healthy Foods', 'healthy-foods', 'Active', 1),
('Natural Sweeteners', 'natural-sweeteners', 'Active', 2);

INSERT INTO categories(name, slug, parent_id, status, sort_order)
SELECT 'Millet', 'millet', id, 'Active', 1
FROM categories
WHERE slug = 'healthy-foods';

INSERT INTO categories(name, slug, parent_id, status, sort_order)
SELECT 'Pickles', 'pickles', id, 'Active', 2
FROM categories
WHERE slug = 'healthy-foods';

INSERT INTO categories(name, slug, parent_id, status, sort_order)
SELECT 'Honey', 'honey', id, 'Active', 1
FROM categories
WHERE slug = 'natural-sweeteners';

INSERT INTO products
  (name, category, category_id, price, stock, low_stock_threshold,
   status, description)
VALUES
(
  'Traditional Health Mix',
  'Healthy Foods',
  (SELECT id FROM categories WHERE slug = 'healthy-foods'),
  449,
  34,
  5,
  'Active',
  '36 natural grains, nuts and seeds'
),
(
  'Wild Forest Honey',
  'Honey',
  (SELECT id FROM categories WHERE slug = 'honey'),
  399,
  18,
  5,
  'Active',
  'Raw, unprocessed forest honey'
);

INSERT INTO cms_pages(slug, title, content, status) VALUES
('home', 'Home', 'Welcome to SNA.', 'Published'),
('about-us', 'About Us', 'Add your SNA company story here.', 'Published'),
('contact', 'Contact', 'Add your contact information here.', 'Published'),
('privacy-policy', 'Privacy Policy', 'Add your privacy policy here.', 'Draft'),
('terms-and-conditions', 'Terms and Conditions', 'Add your terms here.', 'Draft'),
('return-policy', 'Return Policy', 'Add your return policy here.', 'Draft'),
('shipping-policy', 'Shipping Policy', 'Add your shipping policy here.', 'Draft');

INSERT INTO orders(order_code, customer, phone, product, amount, stage) VALUES
('SNA-1001', 'Priya S', '9876543210', 'Traditional Health Mix', 898, 4);

INSERT INTO faqs(question, answer, status, sort_order) VALUES
(
  'How fresh are SNA products?',
  'Products are prepared in small fresh batches.',
  'Published',
  1
);
