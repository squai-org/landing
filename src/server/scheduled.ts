import { retryConfirmations } from './services/email.service';
import type { Env } from './types';

/**
 * Handler del Cron Trigger (triggers.crons en wrangler.jsonc, en UTC).
 * Reintenta las confirmaciones que no se enviaron. "Ahora" es la hora
 * programada de la ejecucion, no el reloj, para que los tests la controlen.
 */
export const scheduled: ExportedHandlerScheduledHandler<Env> = async (controller, env) => {
  const now = new Date(controller.scheduledTime);

  await retryConfirmations(env, now);
};
