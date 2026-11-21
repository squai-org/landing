
CREATE TABLE email_messages (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id            TEXT NOT NULL REFERENCES orders (order_id),
  customer_id         INTEGER NOT NULL REFERENCES customers (id),
  program_code        TEXT NOT NULL,
  kind                TEXT NOT NULL CHECK (kind IN ('confirmation', 'recovery')),
  template_id         INTEGER NOT NULL,
  provider_message_id TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  attempts            INTEGER NOT NULL DEFAULT 0,
  last_error          TEXT,
  sent_at             TEXT,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (order_id, kind)
);

CREATE UNIQUE INDEX ux_email_messages_recovery
  ON email_messages (customer_id, program_code)
  WHERE kind = 'recovery';

CREATE INDEX idx_email_messages_status ON email_messages (status, kind, updated_at);

INSERT INTO email_messages (order_id, customer_id, program_code, kind, template_id, status, last_error)
SELECT order_id, customer_id, program_code, 'confirmation', 0, 'skipped',
  'Venta aprobada antes de 0009: no se envia confirmacion retroactiva. Pasar a failed para enviarla.'
FROM orders
WHERE status = 'approved';
