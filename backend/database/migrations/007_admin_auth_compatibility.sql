DROP PROCEDURE IF EXISTS sna_admin_auth_add_column;
DELIMITER $$
CREATE PROCEDURE sna_admin_auth_add_column(
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

CALL sna_admin_auth_add_column(
  'admins',
  'session_version',
  'INT UNSIGNED NOT NULL DEFAULT 0 AFTER `status`'
);
DROP PROCEDURE sna_admin_auth_add_column;

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
