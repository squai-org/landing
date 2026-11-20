import type { OrderStatus } from './order.repository';

export type EmailKind = 'confirmation' | 'recovery';

/** Lo que necesita el correo de confirmacion: orden, cliente y programa. */
export interface ConfirmationData {
  orderId: string;
  customerId: number;
  programCode: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  tax: string | null;
  paymentMethod: string | null;
  email: string;
  fullName: string;
  programName: string;
  startsOn: string | null;
  endsOn: string | null;
  schedule: string | null;
}

const CONFIRMATION_DATA_SQL = `
  SELECT o.order_id AS orderId, o.customer_id AS customerId, o.program_code AS programCode,
         o.status, o.amount, o.currency, o.tax, o.payment_method AS paymentMethod,
         c.email, c.full_name AS fullName,
         p.description AS programName, p.starts_on AS startsOn, p.ends_on AS endsOn, p.schedule
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN programs p ON p.code = o.program_code
  WHERE o.order_id = ?
`;

export const findConfirmationData = async (db: D1Database, orderId: string) =>
  db.prepare(CONFIRMATION_DATA_SQL).bind(orderId).first<ConfirmationData>();

/**
 * Reclama el envio: crea la fila pendiente si no existe. Devuelve true solo a
 * quien la creo; ese es el unico que envia. La unicidad (order_id, kind) y la
 * de recuperacion por cliente y programa hacen que un segundo intento, aunque
 * sea concurrente, no cambie nada.
 */
const CLAIM_SQL = `
  INSERT INTO email_messages (order_id, customer_id, program_code, kind, template_id, created_at, updated_at)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
  ON CONFLICT DO NOTHING
`;

export const claimEmailMessage = async (
  db: D1Database,
  message: { orderId: string; customerId: number; programCode: string; kind: EmailKind; templateId: number },
  now: Date
): Promise<boolean> => {
  const { meta } = await db
    .prepare(CLAIM_SQL)
    .bind(message.orderId, message.customerId, message.programCode, message.kind, message.templateId, now.toISOString())
    .run();

  return meta.changes > 0;
};

/**
 * Confirmaciones que el cron debe reintentar: ordenes aprobadas sin fila de
 * confirmacion, con la fila fallida, o con la fila pendiente sin cambios desde
 * antes de `staleBefore` (un envio en curso de waitUntil la deja pendiente
 * unos segundos; pasado el margen se da por perdido).
 */
const RETRY_CANDIDATES_SQL = `
  SELECT o.order_id AS orderId, m.id IS NOT NULL AS hasMessage
  FROM orders o
  LEFT JOIN email_messages m ON m.order_id = o.order_id AND m.kind = 'confirmation'
  WHERE o.status = 'approved'
    AND (m.id IS NULL OR m.status = 'failed' OR (m.status = 'pending' AND m.updated_at < ?1))
  ORDER BY o.id
  LIMIT ?2
`;

export const findConfirmationsToRetry = async (db: D1Database, staleBefore: Date, limit: number) => {
  const { results } = await db
    .prepare(RETRY_CANDIDATES_SQL)
    .bind(staleBefore.toISOString(), limit)
    .all<{ orderId: string; hasMessage: number }>();

  return results.map((row) => ({ orderId: row.orderId, hasMessage: row.hasMessage === 1 }));
};

/**
 * Reclama de nuevo una confirmacion fallida o atascada: la vuelve a dejar
 * pendiente con la plantilla actual. Igual que claimEmailMessage, devuelve
 * true solo a quien la cambio, asi dos ejecuciones del cron que se crucen no
 * envian dos veces.
 */
const RECLAIM_SQL = `
  UPDATE email_messages
  SET status = 'pending', template_id = ?3, updated_at = ?4
  WHERE order_id = ?1 AND kind = ?2
    AND (status = 'failed' OR (status = 'pending' AND updated_at < ?5))
`;

export const reclaimEmailMessage = async (
  db: D1Database,
  key: { orderId: string; kind: EmailKind },
  templateId: number,
  staleBefore: Date,
  now: Date
): Promise<boolean> => {
  const { meta } = await db
    .prepare(RECLAIM_SQL)
    .bind(key.orderId, key.kind, templateId, now.toISOString(), staleBefore.toISOString())
    .run();

  return meta.changes > 0;
};

/** Anota el resultado de un intento de envio. */
const RESULT_SQL = `
  UPDATE email_messages
  SET status = ?3,
      attempts = attempts + 1,
      provider_message_id = COALESCE(?4, provider_message_id),
      last_error = ?5,
      sent_at = CASE WHEN ?3 = 'sent' THEN ?6 ELSE sent_at END,
      updated_at = ?6
  WHERE order_id = ?1 AND kind = ?2
`;

export const recordEmailResult = async (
  db: D1Database,
  key: { orderId: string; kind: EmailKind },
  result: { status: 'sent'; providerMessageId: string | null } | { status: 'failed'; error: string },
  now: Date
): Promise<void> => {
  await db
    .prepare(RESULT_SQL)
    .bind(
      key.orderId,
      key.kind,
      result.status,
      result.status === 'sent' ? result.providerMessageId : null,
      result.status === 'failed' ? result.error : null,
      now.toISOString()
    )
    .run();
};
