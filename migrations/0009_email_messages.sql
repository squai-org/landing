-- Mensajes de correo (ver GLOSSARY.md y docs/adr/0001).
--
-- D1 es la fuente de verdad de que correo se envio a quien, con que plantilla
-- y cuando: es la prueba del acuse de recibo (Ley 1480 art. 50). Brevo solo
-- transporta.
--
-- Protocolo de envio: primero se reclama la fila con
-- INSERT ... ON CONFLICT DO NOTHING y solo se envia si el insert cambio una
-- fila; despues se anota el resultado (status, attempts, provider_message_id,
-- last_error, sent_at). Asi el webhook y /status pueden llegar a la vez o
-- repetirse y sale un solo correo.
--
-- UNIQUE (order_id, kind): una confirmacion por orden. El indice parcial deja
-- una sola recuperacion por cliente y programa, aunque haya varias ordenes.
--
-- Fechas en ISO-8601 UTC con milisegundos y Z, como Date#toISOString(): el
-- Worker escribe el instante que le pasa el llamador.
--
-- Sin BEGIN/COMMIT: D1 aplica cada migracion como un solo lote atomico.

CREATE TABLE email_messages (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id            TEXT NOT NULL REFERENCES orders (order_id),
  customer_id         INTEGER NOT NULL REFERENCES customers (id),
  program_code        TEXT NOT NULL,
  kind                TEXT NOT NULL CHECK (kind IN ('confirmation', 'recovery')),
  -- Plantilla de Brevo usada (src/config/email.ts).
  template_id         INTEGER NOT NULL,
  -- messageId que devuelve Brevo al aceptar el envio.
  provider_message_id TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
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

-- El cron reintenta las confirmaciones fallidas o atascadas.
CREATE INDEX idx_email_messages_status ON email_messages (status, kind, updated_at);
