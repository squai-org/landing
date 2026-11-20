-- Elimina la tabla de la antigua lista de espera (creada en 0001 y ampliada en
-- 0002). No tiene registros y ninguna ruta la usa desde que el programa se vende
-- con el checkout de Bold. 0001 y 0002 no se editan: ya estan aplicadas.

DROP INDEX IF EXISTS idx_waitlist_signups_created_at;
DROP TABLE IF EXISTS waitlist_signups;
