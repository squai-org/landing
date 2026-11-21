import { retryConfirmations, sendRecoveries } from './services/email.service';
import type { Env } from './types';

export const scheduled: ExportedHandlerScheduledHandler<Env> = async (controller, env) => {
  const now = new Date(controller.scheduledTime);

  await retryConfirmations(env, now);
  await sendRecoveries(env, now);
};
