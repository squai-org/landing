import type { Context } from 'hono';

/**
 * Trabajo que sigue despues de responder (p. ej. enviar un correo): se le
 * entrega a waitUntil para que el Worker no lo corte. Un error se registra y
 * no sube, porque la respuesta ya salio.
 *
 * Hono lanza "This context has no ExecutionContext" cuando la peticion llega
 * sin contexto (app.request en tests que no lo pasan); en ese caso la promesa
 * corre suelta.
 */
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
