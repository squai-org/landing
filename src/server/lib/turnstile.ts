/**
 * Validación server-side de Turnstile.
 * El secret nunca sale del Worker; el token de cliente se valida una sola vez
 * y caduca a los 5 minutos.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export const verifyTurnstileToken = async (
  secret: string,
  token: string,
  remoteIp?: string | null
): Promise<SiteverifyResponse> => {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (remoteIp) body.append('remoteip', remoteIp);

  const res = await fetch(SITEVERIFY_URL, { method: 'POST', body });

  if (!res.ok) {
    return { success: false, 'error-codes': [`siteverify-http-${res.status}`] };
  }

  return (await res.json()) as SiteverifyResponse;
};
