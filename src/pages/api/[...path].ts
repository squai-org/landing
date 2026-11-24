import type { APIRoute } from 'astro';
import app from '../../server/index';
import { getNodeEnv } from '../../server/lib/node-env';

export const prerender = false;

export const ALL: APIRoute = ({ request }) => app.fetch(request, getNodeEnv());
