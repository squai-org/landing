/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Sitekey pública del widget de Turnstile; opcional en desarrollo. */
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}

interface Window {
  /** API del script de Turnstile, presente solo cuando api.js está cargado. */
  turnstile?: {
    reset: (container?: HTMLElement | string) => void;
    remove: (container?: HTMLElement | string) => void;
  };
  /** Sincroniza el estado de los botones de envío con el token de Turnstile. */
  squaiTurnstileSync?: () => void;
}
