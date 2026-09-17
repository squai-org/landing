/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}

interface Window {
  turnstile?: {
    render: (container: HTMLElement | string, options: Record<string, unknown>) => string;
    reset: (widget?: string | HTMLElement) => void;
    remove: (widget?: string | HTMLElement) => void;
  };
  squaiTurnstileLoad?: () => void;
}
