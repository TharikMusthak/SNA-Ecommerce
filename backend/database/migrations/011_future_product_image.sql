DROP PROCEDURE IF EXISTS sna_add_column;
DELIMITER $$
CREATE PROCEDURE sna_add_column(IN table_value VARCHAR(64), IN column_value VARCHAR(64), IN definition_value TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = table_value AND COLUMN_NAME = column_value
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', table_value, '` ADD COLUMN `', column_value, '` ', definition_value);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL sna_add_column('products', 'future_image', 'VARCHAR(255) NULL');
DROP PROCEDURE sna_add_column;
