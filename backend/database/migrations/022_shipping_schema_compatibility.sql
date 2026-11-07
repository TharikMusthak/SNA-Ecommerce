-- Complete the shipping schema for databases created from older SNA exports.
-- Every operation is additive, so existing orders and products are preserved.
DROP PROCEDURE IF EXISTS sna_add_column;
DELIMITER $$
CREATE PROCEDURE sna_add_column(IN table_value VARCHAR(64), IN column_value VARCHAR(64), IN definition_value TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=table_value AND COLUMN_NAME=column_value
  ) THEN
    SET @ddl=CONCAT('ALTER TABLE `',table_value,'` ADD COLUMN `',column_value,'` ',definition_value);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL sna_add_column('products','option_label','VARCHAR(120) NULL AFTER name');
CALL sna_add_column('products','package_length_cm','DECIMAL(8,2) NULL');
CALL sna_add_column('products','package_width_cm','DECIMAL(8,2) NULL');
CALL sna_add_column('products','package_height_cm','DECIMAL(8,2) NULL');

CREATE TABLE IF NOT EXISTS shipping_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  provider_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  pickup_location VARCHAR(190) DEFAULT NULL,
  pickup_pincode VARCHAR(20) DEFAULT NULL,
  default_weight_grams INT UNSIGNED NOT NULL DEFAULT 500,
  default_length_cm DECIMAL(8,2) NOT NULL DEFAULT 10,
  default_width_cm DECIMAL(8,2) NOT NULL DEFAULT 10,
  default_height_cm DECIMAL(8,2) NOT NULL DEFAULT 10,
  free_shipping_threshold DECIMAL(12,2) NOT NULL DEFAULT 0,
  pincode_cache_minutes INT UNSIGNED NOT NULL DEFAULT 1440,
  default_courier_strategy ENUM('cheapest','fastest') NOT NULL DEFAULT 'cheapest',
  allow_cod BOOLEAN NOT NULL DEFAULT TRUE,
  require_serviceable_address BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO shipping_settings(id) VALUES (1);

CREATE TABLE IF NOT EXISTS shipments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'shiprocket',
  provider_order_id BIGINT UNSIGNED DEFAULT NULL,
  provider_shipment_id BIGINT UNSIGNED DEFAULT NULL,
  courier_id BIGINT UNSIGNED DEFAULT NULL,
  courier_name VARCHAR(190) DEFAULT NULL,
  awb_code VARCHAR(120) DEFAULT NULL,
  pickup_location VARCHAR(190) DEFAULT NULL,
  shipping_charge DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_shipping_cost DECIMAL(12,2) DEFAULT NULL,
  weight DECIMAL(10,3) NOT NULL DEFAULT 0.500,
  length DECIMAL(8,2) NOT NULL DEFAULT 10,
  width DECIMAL(8,2) NOT NULL DEFAULT 10,
  height DECIMAL(8,2) NOT NULL DEFAULT 10,
  status VARCHAR(50) NOT NULL DEFAULT 'shipment_created',
  tracking_url VARCHAR(1000) DEFAULT NULL,
  estimated_delivery_at DATETIME DEFAULT NULL,
  picked_up_at DATETIME DEFAULT NULL,
  shipped_at DATETIME DEFAULT NULL,
  delivered_at DATETIME DEFAULT NULL,
  cancelled_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shipments_order (order_id),
  KEY idx_shipments_awb (awb_code),
  KEY idx_shipments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shipment_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shipment_id BIGINT UNSIGNED NOT NULL,
  provider_event_id VARCHAR(190) DEFAULT NULL,
  status VARCHAR(80) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  location VARCHAR(190) DEFAULT NULL,
  event_time DATETIME NOT NULL,
  raw_event_reference VARCHAR(190) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shipment_provider_event (shipment_id,provider_event_id),
  KEY idx_shipment_events_timeline (shipment_id,event_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shipping_rate_quotes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  address_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(40) NOT NULL,
  delivery_pincode VARCHAR(20) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  package_hash CHAR(64) NOT NULL,
  options_json JSON NOT NULL,
  selected_courier_id BIGINT UNSIGNED DEFAULT NULL,
  selected_rate DECIMAL(12,2) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_shipping_quotes_lookup (user_id,address_id,expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE sna_add_column;
