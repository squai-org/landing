import type { Context } from 'hono';

export const defer =
  (c: Context) =>
  (task: Promise<unknown>): void => {
    const guarded = task.catch((error) => console.error('Tarea en segundo plano fallida', error));

    try {
      c.executionCtx.waitUntil(guarded);
    } catch {
      void guarded;
    }
  };
