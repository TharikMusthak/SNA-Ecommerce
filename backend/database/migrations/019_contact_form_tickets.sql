ALTER TABLE support_tickets
  MODIFY user_id BIGINT UNSIGNED NULL,
  ADD COLUMN contact_name VARCHAR(190) NULL AFTER user_id,
  ADD COLUMN contact_email VARCHAR(190) NULL AFTER contact_name,
  ADD COLUMN contact_phone VARCHAR(40) NULL AFTER contact_email;

ALTER TABLE support_ticket_messages
  MODIFY sender_id BIGINT UNSIGNED NULL;
