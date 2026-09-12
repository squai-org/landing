import { Hono } from 'hono';
import { badRequest, ok } from '../lib/http';
import { parseBody } from '../lib/validate';
import { waitlistSchema } from '../schemas/waitlist.schema';
import { submitWaitlist } from '../services/leads.service';
import type { AppBindings } from '../types';

/** POST /api/waitlist — lista de espera de la próxima cohorte (Squai One). */
export const waitlistRoute = new Hono<AppBindings>().post('/', async (c) => {
  const raw = await c.req.json().catch(() => {
    throw badRequest('invalid_json', 'El cuerpo de la petición no es JSON válido.');
  });

  const input = parseBody(waitlistSchema, raw);
  const result = await submitWaitlist(c.env, input, c.get('requestMeta'));

  return ok(c, { id: result.id, created: result.isNew }, result.isNew ? 201 : 200);
});
