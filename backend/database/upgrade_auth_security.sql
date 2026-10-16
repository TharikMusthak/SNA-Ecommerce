USE sna_cms;

SET @session_version_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admins'
    AND COLUMN_NAME = 'session_version'
);

SET @sql = IF(
  @session_version_exists = 0,
  'ALTER TABLE admins ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER status',
  'SELECT ''admins.session_version already exists'' AS migration_status'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
