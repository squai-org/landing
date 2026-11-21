-- Programa y Precio (ver GLOSSARY.md) reemplazan a payment_plans.
--
-- Un programa tiene varios precios: uno por moneda y fecha de vigencia. El
-- precio vigente de una moneda es el de mayor valid_from que ya llego. No hay
-- valid_until: un precio rige hasta que empieza el siguiente, asi un cambio
-- programado (p. ej. el 1 de enero) entra solo, sin desplegar ni editar nada.
--
-- valid_from es ISO-8601 UTC con milisegundos y Z, igual que
-- Date#toISOString(): el Worker compara con el instante que le pasa el llamador
-- y la comparacion de textos es la de fechas. Colombia es UTC-5 sin horario de
-- verano, asi que las 00:00 de Colombia son las 05:00 UTC.
--
-- Los montos son enteros sin decimales, impuestos incluidos, como los cobra
-- Bold. El minimo de Bold en COP son 1000; en USD basta con que sea positivo.
-- https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-manual
--
-- `active` de payment_plans no pasa: el cierre manual de ventas es de
-- program_limits (0008).
--
-- Sin BEGIN/COMMIT: D1 aplica cada migracion como un solo lote atomico.

CREATE TABLE programs (
  code        TEXT PRIMARY KEY,
  -- Bold muestra esta descripcion en el checkout y exige entre 2 y 100 caracteres.
  description TEXT NOT NULL CHECK (length(description) BETWEEN 2 AND 100),
  -- Fechas del programa (YYYY-MM-DD) y horario en texto, para el correo de
  -- confirmacion. Sin valor, el correo dice "Por confirmar".
  starts_on   TEXT,
  ends_on     TEXT,
  schedule    TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO programs (code, description, created_at, updated_at)
SELECT code, description, strftime('%Y-%m-%dT%H:%M:%fZ', updated_at), strftime('%Y-%m-%dT%H:%M:%fZ', updated_at)
FROM payment_plans;

-- Fechas y horario de la cohorte de Squai One (ver la especificacion, #49).
UPDATE programs
SET starts_on = '2027-01-26',
    ends_on = '2027-02-18',
    schedule = 'Martes y jueves de 6:30 a 9:00 p. m. (hora de Colombia)'
WHERE code = 'squai-one';

CREATE TABLE program_prices (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  program_code TEXT NOT NULL REFERENCES programs (code),
  currency     TEXT NOT NULL CHECK (currency IN ('COP', 'USD')),
  amount       INTEGER NOT NULL CHECK (typeof(amount) = 'integer'),
  valid_from   TEXT NOT NULL,
  CHECK ((currency = 'COP' AND amount >= 1000) OR (currency = 'USD' AND amount > 0)),
  UNIQUE (program_code, currency, valid_from)
);

-- El precio que tenia cada plan queda como historia, vigente desde su ultima
-- edicion. Si esa edicion cayo en el mismo segundo que esta migracion, se
-- corre un segundo atras para que no empate con el precio de la cohorte.
INSERT INTO program_prices (program_code, currency, amount, valid_from)
SELECT code, currency, amount,
  strftime('%Y-%m-%dT%H:%M:%fZ', min(updated_at, datetime('now', '-1 second')))
FROM payment_plans;

-- Precios de la cohorte: rigen desde que se aplica esta migracion y el
-- 1 de enero de 2027 a las 00:00 de Colombia pasan a los de 2027.
INSERT INTO program_prices (program_code, currency, amount, valid_from) VALUES
  ('squai-one', 'COP', 440000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('squai-one', 'USD', 147, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('squai-one', 'COP', 550000, '2027-01-01T05:00:00.000Z'),
  ('squai-one', 'USD', 185, '2027-01-01T05:00:00.000Z');

DROP TABLE payment_plans;

-- La orden congela el impuesto con que se cobro, junto al monto y la moneda.
-- Las ordenes anteriores quedan en NULL: se cobraron sin impuesto declarado.
ALTER TABLE orders ADD COLUMN tax TEXT;
