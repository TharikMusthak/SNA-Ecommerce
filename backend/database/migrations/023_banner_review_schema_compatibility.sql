-- Support databases created from the original CMS schema, before banner
-- targeting/mobile fields and review edit tracking were introduced.
DROP PROCEDURE IF EXISTS sna_add_compat_column;
DELIMITER $$
CREATE PROCEDURE sna_add_compat_column(IN table_value VARCHAR(64), IN column_value VARCHAR(64), IN definition_value TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_value
      AND COLUMN_NAME = column_value
  ) THEN
    SET @ddl = CONCAT(
      'ALTER TABLE `', table_value, '` ADD COLUMN `', column_value, '` ', definition_value
    );
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL sna_add_compat_column('banners', 'mobile_image', 'VARCHAR(1000) NULL');
CALL sna_add_compat_column('banners', 'redirect_type', "VARCHAR(30) NOT NULL DEFAULT 'none'");
CALL sna_add_compat_column('banners', 'product_id', 'INT UNSIGNED NULL');
CALL sna_add_compat_column('banners', 'category_id', 'INT UNSIGNED NULL');
CALL sna_add_compat_column('banners', 'redirect_url', 'VARCHAR(1000) NULL');
CALL sna_add_compat_column('banners', 'display_position', "VARCHAR(40) NOT NULL DEFAULT 'home_hero'");
CALL sna_add_compat_column('banners', 'start_at', 'DATETIME NULL');
CALL sna_add_compat_column('banners', 'end_at', 'DATETIME NULL');
CALL sna_add_compat_column('reviews', 'edited_at', 'DATETIME NULL');

DROP PROCEDURE sna_add_compat_column;

UPDATE banners
SET display_position = 'home_hero'
WHERE display_position IS NULL OR TRIM(display_position) = '';
