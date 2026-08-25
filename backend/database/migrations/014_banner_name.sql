SET @schema_name = DATABASE();
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'banners'
    AND COLUMN_NAME = 'name'
);
SET @statement = IF(
  @column_exists = 0,
  'ALTER TABLE banners ADD COLUMN name VARCHAR(190) NULL AFTER id',
  'SELECT 1'
);
PREPARE banner_name_statement FROM @statement;
EXECUTE banner_name_statement;
DEALLOCATE PREPARE banner_name_statement;

UPDATE banners
SET name = title
WHERE name IS NULL OR TRIM(name) = '';
