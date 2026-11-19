-- Checkout de Bold: catalogo de planes cobrables.
--
-- El precio vive aqui y no en src/content/copies.json porque tiene que poder
-- cambiar sin un despliegue: se edita desde el panel de D1 en Cloudflare o con
-- `pnpm price:set`. Tambien es la unica fuente del monto que se firma, asi que
-- lo que muestra la pagina y lo que cobra Bold no pueden separarse.
--
-- `amount` es un entero en la unidad minima que acepta Bold (pesos sin
-- decimales, impuestos incluidos) y su minimo son 1000 COP.
-- https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-manual

CREATE TABLE payment_plans (
  code        TEXT PRIMARY KEY,
  amount      INTEGER NOT NULL CHECK (amount >= 1000),
  currency    TEXT NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP', 'USD')),
  -- Bold muestra esta descripcion en el checkout y exige entre 2 y 100 caracteres.
  description TEXT NOT NULL CHECK (length(description) BETWEEN 2 AND 100),
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO payment_plans (code, amount, currency, description) VALUES
  ('squai-one', 399000, 'COP', 'Fundamentos de Inteligencia Artificial Generativa');

-- Transacciones que notifica el webhook de Bold.
--
-- Es el unico registro propio de que un pago ocurrio: la redireccion lleva
-- bold-tx-status, pero Bold advierte que ese estado puede no ser definitivo y
-- el comprador puede cerrar la pestana antes de volver.
--
-- La clave es (payment_id, type) y no payment_id: una anulacion posterior
-- (VOID_APPROVED) habla del mismo pago y debe quedar como evento aparte, pero
-- un reenvio del mismo evento no debe duplicar filas.
-- https://developers.bold.co/webhook

CREATE TABLE bold_transactions (
  payment_id      TEXT NOT NULL,
  type            TEXT NOT NULL,
  event_id        TEXT,
  order_id        TEXT,
  amount          INTEGER,
  currency        TEXT,
  payment_method  TEXT,
  payer_email     TEXT,
  card_brand      TEXT,
  card_masked_pan TEXT,
  occurred_at     TEXT,
  -- Cuerpo crudo de la notificacion, para poder auditar un cobro disputado.
  payload         TEXT NOT NULL,
  received_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (payment_id, type)
);

CREATE INDEX idx_bold_transactions_order ON bold_transactions (order_id);
