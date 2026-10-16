CREATE TABLE IF NOT EXISTS frontend_order_status_labels (
  status_key VARCHAR(40) NOT NULL,
  display_label VARCHAR(120) NOT NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (status_key),
  CONSTRAINT fk_frontend_status_label_admin
    FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO frontend_order_status_labels(status_key, display_label) VALUES
  ('pending', 'Pending'),
  ('confirmed', 'Confirmed'),
  ('processing', 'Processing'),
  ('packed', 'Packed'),
  ('shipped', 'Shipped'),
  ('out_for_delivery', 'Out for delivery'),
  ('delivered', 'Delivered'),
  ('cancelled', 'Cancelled'),
  ('returned', 'Returned');
