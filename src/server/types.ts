/**
 * Bindings y variables del Worker.
 *
 * `Cloudflare.Env` lo genera `pnpm cf-typegen` (wrangler types) a partir de
 * wrangler.jsonc, así que DB y las vars nunca se escriben a mano.
 * https://developers.cloudflare.com/workers/languages/typescript/
 *
 * `TURNSTILE_SECRET_KEY` es un secret (`wrangler secret put`), no aparece en la
 * configuración y puede faltar en desarrollo.
 * https://developers.cloudflare.com/workers/configuration/secrets/
 */
export type Env = Omit<Cloudflare.Env, 'ALLOW_PERSONAL_EMAIL' | 'API_RATE_LIMITER'> & {
  ALLOW_PERSONAL_EMAIL?: string;
  /** Ausente en entornos donde el binding no está disponible (tests). */
  API_RATE_LIMITER?: RateLimit;
  TURNSTILE_SECRET_KEY?: string;
};

export interface AppBindings {
  Bindings: Env;
  Variables: {
    /** Metadatos de la petición que se persisten junto al lead. */
    requestMeta: RequestMeta;
  };
}

export interface RequestMeta {
  /** Página desde la que se envió el formulario (cabecera Referer). */
  sourcePage: string | null;
  /** País inferido por Cloudflare. */
  ipCountry: string | null;
  userAgent: string | null;
  /**
   * IP del visitante (CF-Connecting-IP). Solo se usa en memoria para el
   * parámetro opcional `remoteip` de Turnstile; nunca se guarda en D1.
   */
  ip: string | null;
}
