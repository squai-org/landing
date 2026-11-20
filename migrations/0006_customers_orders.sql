-- Cliente y Orden normalizados (ver GLOSSARY.md).
--
-- Un cliente aparece una sola vez, identificado por su correo normalizado
-- (trim + minusculas, igual que normalizeEmail en src/server/lib/email.ts).
-- Sus datos de contacto son los del ultimo formulario que envio.
--
-- `enrollments` pasa a `orders`: cada orden apunta a su cliente en vez de
-- repetir sus datos, y conserva el order_id firmado, el estado del pago y el
-- contexto del intento. Se reconstruye la tabla (crear, copiar, borrar) en
-- vez de ALTER TABLE DROP COLUMN, que falla sobre columnas indexadas.
--
-- Sin BEGIN/COMMIT: D1 aplica cada migracion como un solo lote atomico.

CREATE TABLE customers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT NOT NULL UNIQUE,
  full_name    TEXT NOT NULL,
  country_code TEXT NOT NULL,
  phone        TEXT NOT NULL,
  phone_e164   TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Una fila por correo normalizado, con el contacto del intento mas reciente.
-- created_at es el del primer intento; updated_at, el del ultimo.
INSERT INTO customers (email, full_name, country_code, phone, phone_e164, created_at, updated_at)
SELECT
  lower(trim(e.email)),
  e.full_name,
  e.country_code,
  e.phone,
  e.phone_e164,
  (SELECT min(f.created_at) FROM enrollments f WHERE lower(trim(f.email)) = lower(trim(e.email))),
  e.created_at
FROM enrollments e
WHERE e.id = (
  SELECT l.id FROM enrollments l
  WHERE lower(trim(l.email)) = lower(trim(e.email))
  ORDER BY l.created_at DESC, l.id DESC
  LIMIT 1
);

CREATE TABLE orders (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id            TEXT NOT NULL UNIQUE,
  customer_id         INTEGER NOT NULL REFERENCES customers (id),
  program_code        TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'failed', 'voided')),
  referral_source     TEXT CHECK (referral_source IN ('instagram', 'linkedin', 'tiktok', 'youtube', 'google', 'otras')),
  amount              INTEGER NOT NULL,
  currency            TEXT NOT NULL,
  bold_transaction_id TEXT,
  payment_method      TEXT,
  source_page         TEXT,
  ip_country          TEXT,
  user_agent          TEXT,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  confirmed_at        TEXT
);

-- Se conservan los id: insertarlos explicitos tambien avanza el contador de
-- AUTOINCREMENT, asi que las ordenes nuevas no los reutilizan.
INSERT INTO orders
  (id, order_id, customer_id, program_code, status, referral_source, amount, currency,
    bold_transaction_id, payment_method, source_page, ip_country, user_agent, created_at, confirmed_at)
SELECT
  e.id, e.order_id, c.id, e.plan_code, e.status, e.referral_source, e.amount, e.currency,
  e.bold_transaction_id, e.payment_method, e.source_page, e.ip_country, e.user_agent, e.created_at, e.confirmed_at
FROM enrollments e
JOIN customers c ON c.email = lower(trim(e.email));

DROP TABLE enrollments;

CREATE INDEX idx_orders_customer_program ON orders (customer_id, program_code);
CREATE INDEX idx_orders_status ON orders (status, created_at DESC);
