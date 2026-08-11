DROP PROCEDURE IF EXISTS sna_add_column;
DROP PROCEDURE IF EXISTS sna_add_index;
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
DELIMITER ;

CALL sna_add_column('orders','reservation_expires_at','DATETIME NULL');
CALL sna_add_column('orders','reservation_released_at','DATETIME NULL');
CALL sna_add_column('orders','expired_at','DATETIME NULL');
CALL sna_add_index('orders','idx_orders_reservation_expiry','KEY `idx_orders_reservation_expiry` (`status`,`payment_status`,`reservation_expires_at`)');

ALTER TABLE returns MODIFY status ENUM(
  'requested','approved','rejected','pickup_scheduled','picked_up','received',
  'inspection_pending','inspection_passed','inspection_failed','refund_pending',
  'refunded','partially_refunded','completed','cancelled'
) NOT NULL DEFAULT 'requested';
CALL sna_add_column('returns','admin_notes','TEXT NULL');
CALL sna_add_column('returns','completed_at','DATETIME NULL');
CALL sna_add_column('return_items','accepted_quantity','INT UNSIGNED NOT NULL DEFAULT 0');
CALL sna_add_column('return_items','restocked_quantity','INT UNSIGNED NOT NULL DEFAULT 0');
CALL sna_add_column('return_items','disposition',"ENUM('pending','restocked','damaged','expired','quality_rejected','no_restock') NOT NULL DEFAULT 'pending'");

CREATE TABLE IF NOT EXISTS return_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(40) DEFAULT NULL,
  to_status VARCHAR(40) NOT NULL,
  note VARCHAR(1000) DEFAULT NULL,
  actor_type ENUM('admin','customer','system') NOT NULL,
  actor_id BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_return_history_return (return_id, id),
  CONSTRAINT fk_return_history_return FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS return_inspections (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT UNSIGNED NOT NULL,
  result ENUM('passed','failed','partial') NOT NULL,
  notes TEXT DEFAULT NULL,
  inspected_by INT UNSIGNED NOT NULL,
  idempotency_key VARCHAR(190) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_return_inspection_key (idempotency_key),
  KEY idx_return_inspection_return (return_id),
  CONSTRAINT fk_return_inspection_return FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
  CONSTRAINT fk_return_inspection_admin FOREIGN KEY (inspected_by) REFERENCES admins(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS return_restock_actions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT UNSIGNED NOT NULL,
  return_item_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  disposition ENUM('restocked','damaged','expired','quality_rejected','no_restock') NOT NULL,
  processed_by INT UNSIGNED NOT NULL,
  idempotency_key VARCHAR(190) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_return_restock_key (idempotency_key),
  KEY idx_return_restock_return (return_id),
  CONSTRAINT fk_return_restock_return FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
  CONSTRAINT fk_return_restock_item FOREIGN KEY (return_item_id) REFERENCES return_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_return_restock_admin FOREIGN KEY (processed_by) REFERENCES admins(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refund_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT UNSIGNED NOT NULL,
  order_id INT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  refund_reference VARCHAR(190) NOT NULL,
  refund_method ENUM('cod_manual','bank_transfer','upi_manual','store_credit','external_pending') NOT NULL,
  eligible_amount DECIMAL(12,2) NOT NULL,
  refunded_amount DECIMAL(12,2) NOT NULL,
  status ENUM('pending','approved','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT NULL,
  processed_by INT UNSIGNED NOT NULL,
  processed_at DATETIME DEFAULT NULL,
  external_provider_reference VARCHAR(190) DEFAULT NULL,
  idempotency_key VARCHAR(190) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refund_reference (refund_reference),
  UNIQUE KEY uq_refund_idempotency (idempotency_key),
  KEY idx_refunds_return (return_id, status),
  KEY idx_refunds_order (order_id),
  CONSTRAINT fk_refund_return FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE RESTRICT,
  CONSTRAINT fk_refund_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_refund_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_refund_admin FOREIGN KEY (processed_by) REFERENCES admins(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  variant_id INT UNSIGNED DEFAULT NULL,
  admin_id INT UNSIGNED DEFAULT NULL,
  action VARCHAR(40) NOT NULL,
  quantity_change INT NOT NULL,
  previous_stock INT UNSIGNED NOT NULL,
  new_stock INT UNSIGNED NOT NULL,
  reference_type VARCHAR(40) DEFAULT NULL,
  reference_id BIGINT UNSIGNED DEFAULT NULL,
  note VARCHAR(500) DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_inventory_product (product_id, created_at),
  KEY idx_inventory_reference (reference_type, reference_id),
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CALL sna_add_column('inventory_history','variant_id','INT UNSIGNED NULL AFTER product_id');
CALL sna_add_column('inventory_history','reference_type','VARCHAR(40) NULL');
CALL sna_add_column('inventory_history','reference_id','BIGINT UNSIGNED NULL');
CALL sna_add_index('inventory_history','idx_inventory_reference','KEY `idx_inventory_reference` (`reference_type`,`reference_id`)');

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  channel ENUM('email','whatsapp') NOT NULL,
  event VARCHAR(80) NOT NULL,
  recipient VARCHAR(190) NOT NULL,
  template_name VARCHAR(120) DEFAULT NULL,
  entity_type VARCHAR(80) DEFAULT NULL,
  entity_id VARCHAR(120) DEFAULT NULL,
  payload JSON DEFAULT NULL,
  provider_message_id VARCHAR(190) DEFAULT NULL,
  status ENUM('queued','sending','sent','delivered','read','failed','retrying','skipped') NOT NULL DEFAULT 'queued',
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME DEFAULT NULL,
  last_error_code VARCHAR(120) DEFAULT NULL,
  sent_at DATETIME DEFAULT NULL,
  delivered_at DATETIME DEFAULT NULL,
  read_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_delivery_queue (status, next_attempt_at),
  KEY idx_delivery_entity (entity_type, entity_id),
  KEY idx_delivery_provider_message (provider_message_id),
  CONSTRAINT fk_delivery_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_webhook_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(40) NOT NULL,
  external_event_id VARCHAR(190) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notification_webhook_event (provider, external_event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE sna_add_column;
DROP PROCEDURE sna_add_index;
