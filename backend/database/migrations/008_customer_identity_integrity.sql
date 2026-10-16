DROP PROCEDURE IF EXISTS sna_add_index;
DELIMITER $$
CREATE PROCEDURE sna_add_index(IN table_value VARCHAR(64), IN index_value VARCHAR(64), IN definition_value TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_value
      AND INDEX_NAME = index_value
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', table_value, '` ADD ', definition_value);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL sna_add_index('users', 'uq_users_email', 'UNIQUE KEY `uq_users_email` (`email`)');
CALL sna_add_index('users', 'uq_users_phone', 'UNIQUE KEY `uq_users_phone` (`phone`)');

DROP PROCEDURE sna_add_index;
