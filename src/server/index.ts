import { Hono } from 'hono';
import { onError, onNotFound } from './middleware/error';
import { jsonRequest } from './middleware/json-request';
import { rateLimit } from './middleware/rate-limit';
import { requestMeta } from './middleware/request-meta';
import { sameOrigin } from './middleware/same-origin';
import { securityHeaders } from './middleware/security-headers';
import { contactRoute } from './routes/contact';
import { waitlistRoute } from './routes/waitlist';
import type { AppBindings } from './types';

const app = new Hono<AppBindings>();

app.onError(onError);
app.notFound(onNotFound);

const api = new Hono<AppBindings>();

api.use('*', securityHeaders());
api.use('*', sameOrigin());
api.use('*', requestMeta());

api.get('/health', (c) => c.json({ ok: true }));

api.use('/waitlist', rateLimit(), jsonRequest());
api.use('/contact', rateLimit(), jsonRequest());

api.route('/waitlist', waitlistRoute);
api.route('/contact', contactRoute);

app.route('/api', api);

export default app;
