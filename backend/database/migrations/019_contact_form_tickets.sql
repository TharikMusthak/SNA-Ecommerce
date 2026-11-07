-- Legacy deployments may already have one or more contact fields. Keep this
-- migration safe when upgrading those databases.
ALTER TABLE support_tickets
  MODIFY user_id BIGINT UNSIGNED NULL;

DROP PROCEDURE IF EXISTS sna_add_contact_ticket_column;
DELIMITER $$
CREATE PROCEDURE sna_add_contact_ticket_column(IN column_value VARCHAR(64), IN definition_value TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'support_tickets'
      AND COLUMN_NAME = column_value
  ) THEN
    SET @ddl = CONCAT(
      'ALTER TABLE support_tickets ADD COLUMN `', column_value, '` ', definition_value
    );
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL sna_add_contact_ticket_column('contact_name', 'VARCHAR(190) NULL AFTER user_id');
CALL sna_add_contact_ticket_column('contact_email', 'VARCHAR(190) NULL AFTER contact_name');
CALL sna_add_contact_ticket_column('contact_phone', 'VARCHAR(40) NULL AFTER contact_email');
DROP PROCEDURE sna_add_contact_ticket_column;

ALTER TABLE support_ticket_messages
  MODIFY sender_id BIGINT UNSIGNED NULL;
