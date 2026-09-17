const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
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
