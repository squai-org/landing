import { Hono } from 'hono';
import { onError, onNotFound } from './middleware/error';
import { jsonRequest } from './middleware/json-request';
import { rateLimit } from './middleware/rate-limit';
import { requestMeta } from './middleware/request-meta';
import { sameOrigin } from './middleware/same-origin';
import { securityHeaders } from './middleware/security-headers';
import { checkoutRoute } from './routes/checkout';
import { contactRoute } from './routes/contact';
import type { AppBindings } from './types';

const app = new Hono<AppBindings>();

app.onError(onError);
app.notFound(onNotFound);

const api = new Hono<AppBindings>();

api.use('*', securityHeaders());
api.use('*', sameOrigin());
api.use('*', requestMeta());

api.get('/health', (c) => c.json({ ok: true }));

api.use('/contact', rateLimit(), jsonRequest());
api.use('/checkout/session', jsonRequest());
// Retomar no pide Turnstile (el enlace llega por correo): el limite por IP
// frena a quien pruebe order_id al azar.
api.use('/checkout/resume', rateLimit(), jsonRequest());

api.route('/checkout', checkoutRoute);
api.route('/contact', contactRoute);

app.route('/api', api);

export default app;
