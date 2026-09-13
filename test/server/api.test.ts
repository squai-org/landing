import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/server/index';

/**
 * El rate limiter agrupa por IP, así que cada petición usa una IP distinta
 * salvo que el test quiera justamente compartirla.
 */
let ipCounter = 0;
const nextIp = () => `198.51.100.${++ipCounter % 250}`;

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  app.request(
    `https://squai.io${path}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://squai.io',
        'CF-Connecting-IP': nextIp(),
        ...headers,
      },
      body: JSON.stringify(body),
    },
    env
  );

const waitlistPayload = {
  full_name: 'Ana  Ríos',
  email: ' ANA@Empresa.CO ',
  country_code: '+57',
  phone: '320 555 1234',
};

const contactPayload = {
  full_name: 'Luis Gómez',
  email: 'luis@empresa.co',
  organization: 'Empresa SAS',
  role: 'COO',
  country_code: '57',
  phone: '3205551234',
  team_size: '10-30',
  message: 'Queremos automatizar soporte.',
  ecosystem: 'grow',
};

beforeEach(async () => {
  await env.DB.exec('DELETE FROM waitlist_signups');
  await env.DB.exec('DELETE FROM contact_requests');
});

describe('POST /api/waitlist', () => {
  it('normaliza los datos y los guarda', async () => {
    const res = await post('/api/waitlist', waitlistPayload);
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ ok: true, created: true });

    const row = await env.DB.prepare('SELECT * FROM waitlist_signups').first<Record<string, string>>();
    expect(row).toMatchObject({
      full_name: 'Ana Ríos',
      email: 'ana@empresa.co',
      country_code: '+57',
      phone: '3205551234',
      phone_e164: '+573205551234',
    });
  });

  it('reutiliza la fila cuando el mismo correo se registra dos veces', async () => {
    await post('/api/waitlist', waitlistPayload);
    const res = await post('/api/waitlist', { ...waitlistPayload, full_name: 'Ana Ríos Pérez' });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, created: false });

    const { results } = await env.DB.prepare('SELECT full_name FROM waitlist_signups').all();
    expect(results).toEqual([{ full_name: 'Ana Ríos Pérez' }]);
  });

  it('rechaza correos con formato inválido señalando el campo', async () => {
    const res = await post('/api/waitlist', { ...waitlistPayload, email: 'ana(at)empresa.co' });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation_failed', fields: { email: expect.any(String) } },
    });
  });

  it('rechaza teléfonos demasiado cortos', async () => {
    const res = await post('/api/waitlist', { ...waitlistPayload, phone: '123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/contact', () => {
  it('guarda la solicitud con su ecosistema', async () => {
    const res = await post('/api/contact', contactPayload);
    expect(res.status).toBe(201);

    const row = await env.DB.prepare('SELECT * FROM contact_requests').first<Record<string, string>>();
    expect(row).toMatchObject({
      ecosystem: 'grow',
      organization: 'Empresa SAS',
      team_size: '10-30',
      phone_e164: '+573205551234',
    });
  });

  it.each(['grow', 'learn'])('acepta correos personales para %s', async (ecosystem) => {
    const res = await post('/api/contact', { ...contactPayload, ecosystem, email: 'luis@gmail.com' });

    expect(res.status).toBe(201);
    const row = await env.DB.prepare('SELECT ecosystem, email FROM contact_requests').first<Record<string, string>>();
    expect(row).toMatchObject({ ecosystem, email: 'luis@gmail.com' });
  });

  it('rechaza un team_size fuera del catálogo', async () => {
    const res = await post('/api/contact', { ...contactPayload, team_size: 'mil' });
    expect(res.status).toBe(400);
  });

  it('bloquea peticiones con Origin de otro dominio', async () => {
    const res = await post('/api/contact', contactPayload, { Origin: 'https://atacante.test' });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'cross_origin_blocked' } });
  });

  it('exige Content-Type JSON', async () => {
    const res = await app.request(
      'https://squai.io/api/contact',
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', 'CF-Connecting-IP': nextIp() },
        body: 'full_name=Luis',
      },
      env
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'unsupported_content_type' } });
  });
});

describe('Rate limiting', () => {
  it('corta a partir de la sexta petición del mismo minuto y la misma IP', async () => {
    const send = () =>
      app.request(
        'https://squai.io/api/waitlist',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://squai.io',
            'CF-Connecting-IP': '203.0.113.7',
          },
          body: JSON.stringify(waitlistPayload),
        },
        env
      );

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await send()).status);

    expect(statuses.slice(0, 5).every((status) => status < 400)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe('Turnstile', () => {
  it('exige el token cuando TURNSTILE_SECRET_KEY está configurado', async () => {
    const res = await app.request(
      'https://squai.io/api/waitlist',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://squai.io',
          'CF-Connecting-IP': nextIp(),
        },
        body: JSON.stringify(waitlistPayload),
      },
      { ...env, TURNSTILE_SECRET_KEY: 'test-secret' }
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'turnstile_missing' } });
  });
});
