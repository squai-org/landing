import { Hono } from 'hono';
import { badRequest, ok } from '../lib/http';
import { parseBody } from '../lib/validate';
import { contactSchema } from '../schemas/contact.schema';
import { submitContactRequest } from '../services/leads.service';
import type { AppBindings } from '../types';

export const contactRoute = new Hono<AppBindings>().post('/', async (c) => {
  const raw = await c.req.json().catch(() => {
    throw badRequest('invalid_json', 'El cuerpo de la petición no es JSON válido.');
  });

  const input = parseBody(contactSchema, raw);
  const id = await submitContactRequest(c.env, input, c.get('requestMeta'));

  return ok(c, { id, created: true }, 201);
});
