export interface BoldTransactionRecord {
  paymentId: string;
  type: string;
  eventId: string | null;
  orderId: string | null;
  amount: number | null;
  currency: string | null;
  paymentMethod: string | null;
  payerEmail: string | null;
  cardBrand: string | null;
  cardMaskedPan: string | null;
  occurredAt: string | null;
  payload: string;
}

/**
 * Bold reintenta las notificaciones, asi que el mismo evento puede llegar
 * varias veces: el upsert sobre (payment_id, type) deja una sola fila y
 * refresca el cuerpo recibido.
 */
const UPSERT_SQL = `
  INSERT INTO bold_transactions
    (payment_id, type, event_id, order_id, amount, currency, payment_method,
      payer_email, card_brand, card_masked_pan, occurred_at, payload)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (payment_id, type) DO UPDATE SET
    payload = excluded.payload,
    received_at = datetime('now')
`;

export const recordBoldTransaction = async (db: D1Database, record: BoldTransactionRecord): Promise<void> => {
  await db
    .prepare(UPSERT_SQL)
    .bind(
      record.paymentId,
      record.type,
      record.eventId,
      record.orderId,
      record.amount,
      record.currency,
      record.paymentMethod,
      record.payerEmail,
      record.cardBrand,
      record.cardMaskedPan,
      record.occurredAt,
      record.payload
    )
    .run();
};
