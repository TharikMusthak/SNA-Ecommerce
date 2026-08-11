USE sna_cms;

SET @role_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admins'
    AND COLUMN_NAME = 'role'
);

SET @sql = IF(
  @role_column_exists = 0,
  'ALTER TABLE admins ADD COLUMN role ENUM(''Super Admin'',''Product Manager'',''Order Manager'') NOT NULL DEFAULT ''Product Manager'' AFTER password_hash',
  'SELECT ''admins.role already exists'' AS migration_status'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @super_admin_exists = (
  SELECT COUNT(*)
  FROM admins
  WHERE role = 'Super Admin'
);

SET @sql = IF(
  @super_admin_exists = 0,
  'UPDATE admins SET role = ''Super Admin'' ORDER BY id ASC LIMIT 1',
  'SELECT ''Existing Super Admin role was preserved'' AS migration_status'
);
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
