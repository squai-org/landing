import { resumeUrl } from '../config/checkout';

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
  tax: string;
  integritySignature: string;
}

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
  tax: session.tax,
  integritySignature: session.integritySignature,
  redirectionUrl,
  originUrl: resumeUrl(new URL(redirectionUrl).origin, session.orderId),
  renderMode: 'embedded',
  // Prellena el formulario de Bold con lo que la persona ya escribio.
  ...(customer && { customerData: JSON.stringify(customer) }),
});

