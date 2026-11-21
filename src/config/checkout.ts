/**
 * Configuracion del checkout de Bold. El monto no esta aqui: lo decide el
 * precio vigente del programa en D1, que es lo que se firma y lo que se muestra.
 * Ver docs/bold-checkout.md.
 */
export const checkout = {
  /** Codigo en programs y, de paso, prefijo del data-order-id. */
  program: 'squai-one',
  /**
   * Impuesto que se declara a Bold en cada cobro: IVA del 19% incluido en el
   * monto (Bold no lo suma). Lo lee el Worker y queda en la orden.
   * https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-personalizada
   */
  tax: 'vat-19' as const,
  /** Libreria del Boton de pagos. Debe estar permitida en la CSP. */
  libraryUrl: 'https://checkout.bold.co/library/boldPaymentButton.js',
  /** A donde vuelve el comprador. Bold le anade bold-order-id y bold-tx-status,
   * pero ese estado es provisional: /gracias lo confirma contra el Worker. */
  returnPath: '/gracias',
  /**
   * Pagina para retomar una orden sin pagar: /retomar?order_id=<orderId>. Es
   * el origin-url que se manda a Bold (a donde vuelve quien abandona el modal)
   * y el enlace del correo de recuperacion.
   */
  resumePath: '/retomar',
  /** Dias, contados desde que se creo la orden, durante los que sirve el enlace. */
  resumeExpiryDays: 7,
  /**
   * Horas sin pagar, contadas desde la ultima orden del cliente en el
   * programa, antes de que el cron envie el unico correo de recuperacion.
   */
  recoveryDelayHours: 2,
};

/**
 * Monedas en que se puede pagar. Las mismas del CHECK de program_prices
 * (0007); las usan el esquema de /api/checkout/session, el repositorio y el
 * selector de moneda.
 */
export const CURRENCIES = ['COP', 'USD'] as const;

export type Currency = (typeof CURRENCIES)[number];

/** Impuesto que se declara a Bold (checkout.tax). */
export type Tax = typeof checkout.tax;

/**
 * Enlace para retomar una orden sin pagar: solo lleva el order-id, que es
 * opaco y no tiene datos personales. Lo usan el origin-url de Bold y el
 * correo de recuperacion.
 */
export const resumeUrl = (origin: string, orderId: string): string =>
  `${origin}${checkout.resumePath}?order_id=${encodeURIComponent(orderId)}`;
