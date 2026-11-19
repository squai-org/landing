import { badRequest, forbidden } from './http';
import { verifyTurnstileToken } from './turnstile';
import type { Env, RequestMeta } from '../types';

export type TurnstileAction = 'contact' | 'checkout';

/**
 * Verificacion antibot compartida por los formularios. Sin
 * TURNSTILE_SECRET_KEY no bloquea nada: el formulario sigue funcionando en
 * entornos donde Turnstile no esta configurado.
 */
export const assertHuman = async (
  env: Env,
  token: string | undefined,
  expectedAction: TurnstileAction,
  meta: RequestMeta
) => {
  const secret = env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY no configurado: se omite la verificación de bot.');
    return;
  }

  if (!token) {
    throw badRequest('turnstile_missing', 'Completa la verificación de seguridad.');
  }

  const verification = await verifyTurnstileToken(secret, token, meta.ip);

  if (!verification.success) {
    console.warn('Turnstile rechazó el envío', verification['error-codes']);
    throw forbidden('turnstile_failed', 'No pudimos verificar que eres una persona. Recarga e inténtalo de nuevo.');
  }

  if (verification.action !== expectedAction) {
    console.warn('Turnstile devolvió una acción inesperada', verification.action);
    throw forbidden('turnstile_action_mismatch', 'No pudimos verificar que eres una persona. Recarga e inténtalo de nuevo.');
  }

  if (env.TURNSTILE_HOSTNAME && verification.hostname !== env.TURNSTILE_HOSTNAME) {
    console.warn('Turnstile devolvió un hostname inesperado', verification.hostname);
    throw forbidden('turnstile_hostname_mismatch', 'No pudimos verificar que eres una persona. Recarga e inténtalo de nuevo.');
  }
};
