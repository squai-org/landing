/**
 * Datos de una venta firmada por el Worker (POST /api/checkout/session).
 * Ver docs/bold-checkout.md.
 */
export interface CheckoutSession {
  apiKey: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  integritySignature: string;
}

/**
 * Configuracion para `new BoldCheckout(config)`, la "integracion personalizada"
 * de Bold: el boton lo pinta el sitio con su propio estilo y la libreria solo
 * abre el modal. Las propiedades son las de los atributos data-* del boton, en
 * camelCase.
 * https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-personalizada
 */
export interface CustomerData {
  fullName: string;
  email: string;
  phone: string;
  dialCode: string;
}

export const boldCheckoutConfig = (session: CheckoutSession, redirectionUrl: string, customer?: CustomerData) => ({
  apiKey: session.apiKey,
  orderId: session.orderId,
  amount: String(session.amount),
  currency: session.currency,
  description: session.description,
  integritySignature: session.integritySignature,
  redirectionUrl,
  renderMode: 'embedded',
  // Prellena el formulario de Bold con lo que la persona ya escribio.
  ...(customer && { customerData: JSON.stringify(customer) }),
});
