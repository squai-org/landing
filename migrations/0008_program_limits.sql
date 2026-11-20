-- Limites de venta del Programa (ver GLOSSARY.md): apertura, cierre y cupo.
--
-- El estado del programa (proximamente, abierto, cerrado) no se guarda: el
-- Worker lo calcula en cada consulta con el instante que le pasa el llamador,
-- estos limites, el cierre manual y las ordenes aprobadas. Asi el programa
-- abre y cierra solo, y una venta anulada libera su cupo sin tocar nada.
--
-- opens_at y closes_at son ISO-8601 UTC con milisegundos y Z, igual que
-- Date#toISOString(): comparar textos es comparar instantes. closes_at es
-- exclusivo. Colombia es UTC-5 sin horario de verano, asi que las 00:00 de
-- Colombia son las 05:00 UTC.
--
-- Un programa sin fila aqui no se vende: se considera cerrado.
--
-- Sin BEGIN/COMMIT: D1 aplica cada migracion como un solo lote atomico.

CREATE TABLE program_limits (
  program_code TEXT PRIMARY KEY REFERENCES programs (code),
  opens_at     TEXT NOT NULL,
  closes_at    TEXT NOT NULL,
  capacity     INTEGER NOT NULL CHECK (typeof(capacity) = 'integer' AND capacity > 0),
  CHECK (closes_at > opens_at)
);

-- Squai One vende desde el 1 de diciembre de 2026 hasta el 22 de enero de 2027
-- inclusive, hora de Colombia, con 30 cupos.
INSERT INTO program_limits (program_code, opens_at, closes_at, capacity) VALUES
  ('squai-one', '2026-12-01T05:00:00.000Z', '2027-01-23T05:00:00.000Z', 30);

-- Cierre manual: corta las ventas antes de la fecha o del cupo. Vale 0 o 1.
ALTER TABLE programs
  ADD COLUMN closed_manually INTEGER NOT NULL DEFAULT 0 CHECK (closed_manually IN (0, 1));
