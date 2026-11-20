/**
 * Configuracion del checkout de Bold. El monto no esta aqui: lo decide la fila
 * del plan en D1, que es lo que se firma y lo que se muestra.
 * Ver docs/bold-checkout.md.
 */
export const checkout = {
  /** Codigo en payment_plans y, de paso, prefijo del data-order-id. */
  plan: 'squai-one',
  /** Libreria del Boton de pagos. Debe estar permitida en la CSP. */
  libraryUrl: 'https://checkout.bold.co/library/boldPaymentButton.js',
  /** A donde vuelve el comprador. Bold le anade bold-order-id y bold-tx-status,
   * pero ese estado es provisional: /gracias lo confirma contra el Worker. */
  returnPath: '/gracias',
};
