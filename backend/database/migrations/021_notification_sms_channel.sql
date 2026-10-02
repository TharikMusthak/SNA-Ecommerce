-- Store real MSG91 SMS results beside email delivery records. WhatsApp remains
-- supported by the legacy schema but is no longer queued by the application.
ALTER TABLE notification_deliveries
  MODIFY channel ENUM('email','sms','whatsapp') NOT NULL;
