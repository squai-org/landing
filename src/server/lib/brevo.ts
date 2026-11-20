/**
 * Cliente minimo de la API transaccional de Brevo, sobre fetch y sin SDK.
 * Envia con una plantilla (templateId) y sus parametros; los placeholders de
 * la plantilla son {{ params.NOMBRE }} (New Template Language).
 * https://developers.brevo.com/reference/send-transac-email
 */
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

/** Brevo no acepto el envio. El mensaje es lo que se guarda como last_error. */
export class BrevoError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'BrevoError';
  }
}

/**
 * Envia un correo con plantilla. Devuelve el messageId de Brevo; cualquier
 * respuesta que no sea 2xx lanza BrevoError con estado, codigo y mensaje.
 */
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
