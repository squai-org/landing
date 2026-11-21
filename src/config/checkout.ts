export const checkout = {
  program: 'squai-one',
  tax: 'vat-19' as const,
  /** Libreria del Boton de pagos. Debe estar permitida en la CSP. */
  libraryUrl: 'https://checkout.bold.co/library/boldPaymentButton.js',
  /** A donde vuelve el comprador. Bold le anade bold-order-id y bold-tx-status,
   * pero ese estado es provisional: /gracias lo confirma contra el Worker. */
  returnPath: '/gracias',
  resumePath: '/retomar',
  resumeExpiryDays: 7,
  recoveryDelayHours: 2,
};

export const CURRENCIES = ['COP', 'USD'] as const;

export type Currency = (typeof CURRENCIES)[number];

export type Tax = typeof checkout.tax;

export const resumeUrl = (origin: string, orderId: string): string =>
  `${origin}${checkout.resumePath}?order_id=${encodeURIComponent(orderId)}`;
