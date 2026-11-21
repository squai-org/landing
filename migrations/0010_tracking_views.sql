
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