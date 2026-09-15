
export type Env = Omit<Cloudflare.Env, 'API_RATE_LIMITER'> & {
  API_RATE_LIMITER?: RateLimit;
  TURNSTILE_SECRET_KEY?: string;
};

export interface AppBindings {
  Bindings: Env;
  Variables: {
    requestMeta: RequestMeta;
  };
}

export interface RequestMeta {
  sourcePage: string | null;
  ipCountry: string | null;
  userAgent: string | null;
  ip: string | null;
}
