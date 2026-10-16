CREATE TABLE IF NOT EXISTS pending_customer_registrations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  referral_code VARCHAR(32) NOT NULL,
  referred_by BIGINT UNSIGNED DEFAULT NULL,
  terms_accepted_at DATETIME NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  otp_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  otp_expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pending_customer_email (email),
  UNIQUE KEY uq_pending_customer_phone (phone),
  KEY idx_pending_customer_otp (phone, otp_expires_at),
  CONSTRAINT fk_pending_customer_referrer
    FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
