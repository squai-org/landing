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
  tax: 'vat-19',
  /** Libreria del Boton de pagos. Debe estar permitida en la CSP. */
  libraryUrl: 'https://checkout.bold.co/library/boldPaymentButton.js',
  /** A donde vuelve el comprador. Bold le anade bold-order-id y bold-tx-status,
   * pero ese estado es provisional: /gracias lo confirma contra el Worker. */
  returnPath: '/gracias',
};
