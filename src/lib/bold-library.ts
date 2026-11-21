import { boldCheckoutConfig, type CheckoutSession, type CustomerData } from './bold-checkout';

declare global {
  interface Window {
    BoldCheckout: new (config: ReturnType<typeof boldCheckoutConfig>) => { open(): void };
  }
}

let library: Promise<void> | null = null;

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

export const openBoldCheckout = async (
  libraryUrl: string,
  session: CheckoutSession,
  redirectionUrl: string,
  customer?: CustomerData
): Promise<void> => {
  await loadBoldLibrary(libraryUrl);
  new window.BoldCheckout(boldCheckoutConfig(session, redirectionUrl, customer)).open();
};
