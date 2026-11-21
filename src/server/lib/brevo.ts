const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

export interface BrevoContact {
  email: string;
  name?: string;
}

export interface BrevoTemplateEmail {
  templateId: number;
  to: BrevoContact[];
  sender: BrevoContact;
  replyTo: BrevoContact;
  params: Record<string, string>;
  tags?: string[];
}

export class BrevoError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'BrevoError';
  }
}

export const sendBrevoTemplateEmail = async (
  apiKey: string,
  message: BrevoTemplateEmail
): Promise<{ messageId: string | null }> => {
  const res = await fetch(BREVO_SEND_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(message),
  });

  const body = (await res.json().catch(() => null)) as
    | { messageId?: string; messageIds?: string[]; code?: string; message?: string }
    | null;

  if (!res.ok) {
    const detail = [body?.code, body?.message].filter(Boolean).join(': ');
    throw new BrevoError(res.status, `${res.status}${detail ? ` ${detail}` : ''}`);
  }

  return { messageId: body?.messageId ?? body?.messageIds?.[0] ?? null };
};
