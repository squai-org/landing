import { checkout } from '../config/checkout';

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
  /** Impuesto incluido en el monto (p. ej. vat-19). No entra en la firma. */
  tax: string;
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

/**
 * Enlace para retomar una orden sin pagar: solo lleva el order-id, que es
 * opaco y no tiene datos personales. Lo usan el origin-url de Bold y el
 * correo de recuperacion.
 */
export const resumeUrl = (origin: string, orderId: string): string =>
  `${origin}${checkout.resumePath}?order_id=${encodeURIComponent(orderId)}`;

export const boldCheckoutConfig = (session: CheckoutSession, redirectionUrl: string, customer?: CustomerData) => ({
  apiKey: session.apiKey,
  orderId: session.orderId,
  amount: String(session.amount),
  currency: session.currency,
  description: session.description,
  tax: session.tax,
  integritySignature: session.integritySignature,
  redirectionUrl,
  // A donde vuelve quien abandona o cancela el pago en Bold: la pagina para
  // retomar esta misma orden, en el dominio de la vuelta.
  originUrl: resumeUrl(new URL(redirectionUrl).origin, session.orderId),
  renderMode: 'embedded',
  // Prellena el formulario de Bold con lo que la persona ya escribio.
  ...(customer && { customerData: JSON.stringify(customer) }),
});
