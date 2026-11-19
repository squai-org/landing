-- Inscripciones a un plan de pago.
--
-- Se crea una fila ANTES de abrir el checkout, en estado 'pending': es lo que
-- liga un pago de Bold con la persona que lo hizo. Sin esto, un pago solo se
-- puede cruzar por el correo que el comprador escriba dentro de Bold.
--
-- `order_id` es el data-order-id que se firma, y es unico: una fila por
-- intento. Quien reintenta tras un rechazo genera otra inscripcion, asi que el
-- rastro del intento fallido no se pierde.
--
-- Los estados son los que devuelve Bold en minuscula. 'pending' cubre tanto
-- "aun no ha intentado pagar" (NO_TRANSACTION_FOUND) como el PENDING de PSE.
-- https://developers.bold.co/pagos-en-linea/boton-de-pagos/consulta-de-transacciones

CREATE TABLE enrollments (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id            TEXT NOT NULL UNIQUE,
  plan_code           TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'failed', 'voided')),
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  country_code        TEXT NOT NULL,
  phone               TEXT NOT NULL,
  phone_e164          TEXT NOT NULL,
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

CREATE INDEX idx_enrollments_email ON enrollments (email);
CREATE INDEX idx_enrollments_status ON enrollments (status, created_at DESC);
