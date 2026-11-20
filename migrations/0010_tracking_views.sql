-- Vistas de seguimiento del embudo de ventas (ver GLOSSARY.md y ADR 0001).
--
-- El equipo consulta en D1, sin depender de Brevo, quien mostro intencion de
-- compra y no pago, quien esta inscrito y cuantos cupos quedan. Las vistas no
-- guardan nada: se calculan al consultarlas, igual que el estado del programa.
-- Uso en docs/bold-checkout.md, seccion "Seguimiento en D1".
--
-- Inscripcion = orden aprobada del cliente en el programa. Una venta anulada
-- (voided) deja de contar y libera el cupo.
--
-- Sin BEGIN/COMMIT: D1 aplica cada migracion como un solo lote atomico.

-- Clientes con ordenes en un programa y sin inscripcion en el, una fila por
-- cliente y programa aunque haya intentado varias veces. last_status es el
-- estado de su orden mas reciente y last_attempt_at, cuando la creo.
CREATE VIEW v_customers_without_enrollment AS
SELECT
  c.id         AS customer_id,
  c.email      AS email,
  c.full_name  AS full_name,
  c.phone_e164 AS phone_e164,
  o.program_code AS program_code,
  count(*)     AS attempts,
  (SELECT l.status FROM orders l
    WHERE l.customer_id = o.customer_id AND l.program_code = o.program_code
    ORDER BY l.created_at DESC, l.id DESC LIMIT 1) AS last_status,
  max(o.created_at) AS last_attempt_at
FROM orders o
JOIN customers c ON c.id = o.customer_id
GROUP BY o.customer_id, o.program_code
HAVING sum(o.status = 'approved') = 0;

-- Inscritos por programa: una fila por cliente con una orden aprobada en el
-- programa, aunque haya pagado dos veces. order_id y enrolled_at son los de su
-- primera orden aprobada (enrolled_at cae en created_at si la orden no tiene
-- confirmed_at). El conteo sale con GROUP BY program_code.
CREATE VIEW v_enrollments_by_program AS
SELECT
  o.program_code AS program_code,
  c.id           AS customer_id,
  c.email        AS email,
  c.full_name    AS full_name,
  c.phone_e164   AS phone_e164,
  o.order_id     AS order_id,
  coalesce(o.confirmed_at, o.created_at) AS enrolled_at
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.id = (
  SELECT f.id FROM orders f
  WHERE f.customer_id = o.customer_id
    AND f.program_code = o.program_code
    AND f.status = 'approved'
  ORDER BY coalesce(f.confirmed_at, f.created_at), f.id
  LIMIT 1
);

-- Cupos por programa: el cupo de program_limits menos las ordenes aprobadas,
-- la misma cuenta con que el Worker cierra el programa por cupo (una venta
-- anulada libera su lugar). seats_left no baja de 0. Un programa sin fila en
-- program_limits sale con capacity y seats_left en NULL: no se vende.
-- El estado por fechas no esta aqui: depende del instante, y lo calcula el
-- Worker; opens_at, closes_at y closed_manually se muestran para leerlo.
CREATE VIEW v_program_seats AS
SELECT
  p.code     AS program_code,
  l.capacity AS capacity,
  (SELECT count(*) FROM orders o
    WHERE o.program_code = p.code AND o.status = 'approved') AS approved_orders,
  max(l.capacity - (SELECT count(*) FROM orders o
    WHERE o.program_code = p.code AND o.status = 'approved'), 0) AS seats_left,
  l.opens_at        AS opens_at,
  l.closes_at       AS closes_at,
  p.closed_manually AS closed_manually
FROM programs p
LEFT JOIN program_limits l ON l.program_code = p.code;