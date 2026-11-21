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
  /** Impuesto incluido en el monto (p. ej. vat-19). No entra en la firma. */
  tax: string;
  integritySignature: string;
}

/** Datos del formulario con que se prellena el de Bold. */
export interface CustomerData {
  fullName: string;
  email: string;
  phone: string;
  dialCode: string;
}

/**
 * Configuracion para `new BoldCheckout(config)`, la "integracion personalizada"
 * de Bold: el boton lo pinta el sitio con su propio estilo y la libreria solo
 * abre el modal. Las propiedades son las de los atributos data-* del boton, en
 * camelCase.
 * https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-personalizada
 */
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

declare global {
  interface Window {
    BoldCheckout: new (config: ReturnType<typeof boldCheckoutConfig>) => { open(): void };
  }
}

let library: Promise<void> | null = null;

/**
 * Carga la libreria de Bold (checkout.libraryUrl) una sola vez por pagina, al
 * momento de pagar y no antes. Si falla, el siguiente intento la vuelve a pedir.
 * La usan Checkout.astro y retomar.astro.
 */
export const loadBoldLibrary = (url: string): Promise<void> => {
  library ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('bold_library'));
    document.head.appendChild(script);
  });
  library.catch(() => {
    library = null;
  });
  return library;
};

/** Abre el modal de Bold con una sesion firmada, cargando antes la libreria. */
export const openBoldCheckout = async (
  libraryUrl: string,
  session: CheckoutSession,
  redirectionUrl: string,
  customer?: CustomerData
): Promise<void> => {
  await loadBoldLibrary(libraryUrl);
  new window.BoldCheckout(boldCheckoutConfig(session, redirectionUrl, customer)).open();
};
