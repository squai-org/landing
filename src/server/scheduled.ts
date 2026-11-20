import { retryConfirmations, sendRecoveries } from './services/email.service';
import type { Env } from './types';

/**
 * Handler del Cron Trigger (triggers.crons en wrangler.jsonc, en UTC).
 * Reintenta las confirmaciones que no se enviaron y despues envia las
 * recuperaciones de quien no pago. "Ahora" es la hora programada de la
 * ejecucion, no el reloj, para que los tests la controlen.
 */
export const scheduled: ExportedHandlerScheduledHandler<Env> = async (controller, env) => {
  const now = new Date(controller.scheduledTime);

  await retryConfirmations(env, now);
  await sendRecoveries(env, now);
};
