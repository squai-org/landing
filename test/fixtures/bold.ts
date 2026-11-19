/**
 * Datos de prueba de Bold y vectores fijos para los tests.
 *
 * Las tarjetas y los bancos son los que publica el ambiente de pruebas de Bold.
 * Solo sirven contra la pasarela real (el checkout no se puede automatizar
 * desde workerd), asi que aqui se usan para construir notificaciones de webhook
 * realistas y para la lista de verificacion manual de docs/bold-checkout.md.
 * https://developers.bold.co/pagos-en-linea/boton-de-pagos/ambiente-pruebas#datos-de-prueba
 */
export const BOLD_TEST_CARDS = {
  visaApproved: '4111111111111111',
  mastercardApproved: '5100010000000015',
  rejected: '4970110000000062',
  failed: '5204730000008404',
} as const;

/** Bancos PSE del ambiente de pruebas: el nombre decide el resultado. */
export const BOLD_TEST_PSE_BANKS = {
  approved: 'BANCO QUE APRUEBA',
  rejected: 'BANCO QUE RECHAZA',
  failed: 'BANCO QUE SIMULA UN ERROR',
} as const;

export const TEST_SECRET_KEY = 'test_secret_key';
export const TEST_IDENTITY_KEY = 'test_identity_key';

/**
 * Notificacion SALE_APPROVED tal como la enviaria Bold para un pago con la
 * VISA aprobada de pruebas. Es una cadena literal, no un objeto serializado al
 * vuelo: la firma se calcula sobre los bytes exactos del cuerpo, asi que
 * cualquier reordenamiento de claves la invalidaria.
 */
export const APPROVED_SALE_BODY =
  '{"id":"5e8b8d6f-0c7a-4a1e-9c3e-2f0a1b2c3d4e","type":"SALE_APPROVED","subject":"TX-4111-APPROVED","source":"bold.co","spec_version":"1.0","time":1763510400000,"datacontenttype":"application/json","data":{"payment_id":"TX-4111-APPROVED","merchant_id":"squai","created_at":"2026-11-19T00:00:00Z","amount":{"currency":"COP","total":399000,"taxes":[],"tip":0},"metadata":{"reference":"SQUAI-ONE-TEST"},"payment_method":"CREDIT_CARD","card":{"brand":"VISA","masked_pan":"411111******1111","installments":1,"card_type":"CREDIT"},"payer_email":"comprador@squai.io"}}';

/**
 * HMAC-SHA256 hexadecimal de base64(APPROVED_SALE_BODY) con TEST_SECRET_KEY,
 * calculado aparte con node:crypto y no con el codigo que se prueba.
 */
export const APPROVED_SALE_SIGNATURE = 'ae985bf2a690b9bf4cee9a9b89db2659849e3a0d411961e4498feb2d9f0c94f9';

/** Venta rechazada con la tarjeta de rechazo del ambiente de pruebas (4970 11... 0062). */
export const REJECTED_SALE_BODY =
  '{"id":"7a1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e","type":"SALE_REJECTED","subject":"TX-4970-REJECTED","source":"bold.co","spec_version":"1.0","time":1763510460000,"datacontenttype":"application/json","data":{"payment_id":"TX-4970-REJECTED","merchant_id":"squai","created_at":"2026-11-19T00:01:00Z","amount":{"currency":"COP","total":399000,"taxes":[],"tip":0},"metadata":{"reference":"SQUAI-ONE-TEST"},"payment_method":"CREDIT_CARD","card":{"brand":"VISA","masked_pan":"497011******0062","installments":1,"card_type":"CREDIT"},"payer_email":"comprador@squai.io"}}';
export const REJECTED_SALE_SIGNATURE = '883dba43615724568962148bea81add9d24cfc20368d4f956c2154d55664f660';

/** Anulacion del mismo payment_id de la venta aprobada. */
export const VOID_APPROVED_BODY =
  '{"id":"9b2d3e4f-5a6b-7c8d-9e0f-1a2b3c4d5e6f","type":"VOID_APPROVED","subject":"TX-4111-APPROVED","source":"bold.co","spec_version":"1.0","time":1763514000000,"datacontenttype":"application/json","data":{"payment_id":"TX-4111-APPROVED","merchant_id":"squai","created_at":"2026-11-19T01:00:00Z","amount":{"currency":"COP","total":399000,"taxes":[],"tip":0},"metadata":{"reference":"SQUAI-ONE-TEST"},"payment_method":"CREDIT_CARD","payer_email":"comprador@squai.io"}}';
export const VOID_APPROVED_SIGNATURE = 'f60993dbbcf4b82f848a96a94e45fe773f70e20f1e01d9e61e679dbe8636cc5a';

/** Venta aprobada por PSE (BANCO QUE APRUEBA): no trae objeto `card`. */
export const PSE_APPROVED_BODY =
  '{"id":"3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f","type":"SALE_APPROVED","subject":"TX-PSE-APPROVED","source":"bold.co","spec_version":"1.0","time":1763517600000,"datacontenttype":"application/json","data":{"payment_id":"TX-PSE-APPROVED","merchant_id":"squai","created_at":"2026-11-19T02:00:00Z","amount":{"currency":"COP","total":399000,"taxes":[],"tip":0},"metadata":{"reference":"SQUAI-ONE-TEST-PSE"},"payment_method":"PSE","payer_email":"comprador@squai.io"}}';
export const PSE_APPROVED_SIGNATURE = '3d5cd3c9d2bd3750f727bf8125ea93a3308824fae2085031a89d97f0f0996af5';
