DROP PROCEDURE IF EXISTS sna_add_column;
DELIMITER $$
CREATE PROCEDURE sna_add_column(IN table_value VARCHAR(64), IN column_value VARCHAR(64), IN definition_value TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=table_value AND COLUMN_NAME=column_value) THEN
    SET @ddl=CONCAT('ALTER TABLE `',table_value,'` ADD COLUMN `',column_value,'` ',definition_value);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

ALTER TABLE reviews MODIFY status ENUM('pending','approved','rejected','hidden') NOT NULL DEFAULT 'pending';
CALL sna_add_column('support_tickets','priority',"ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal'");
CALL sna_add_column('coupons','product_restrictions','JSON NULL');
CALL sna_add_column('coupons','category_restrictions','JSON NULL');

DROP PROCEDURE sna_add_column;
