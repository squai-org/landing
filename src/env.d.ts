/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}

interface Window {
  turnstile?: {
    reset: (container?: HTMLElement | string) => void;
    remove: (container?: HTMLElement | string) => void;
  };
  squaiTurnstileSync?: () => void;
}
