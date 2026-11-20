import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { createCheckoutSession } from '../../src/server/services/checkout.service';
import { loadProgram } from '../../src/server/services/program.service';
import { TEST_IDENTITY_KEY, TEST_SECRET_KEY } from '../fixtures/bold';

/**
 * El precio vigente depende del instante. Los servicios reciben `now` del
 * llamador, asi el test fija el reloj sin tocar el del Worker.
 *
 * Programa propio, con el mismo calendario que la cohorte de Squai One: un
 * precio desde 2026 y otro desde el 1 de enero de 2027 a las 00:00 de Colombia
 * (UTC-5, sin horario de verano), que son las 05:00 UTC.
 */
const PROGRAM = 'programa-calendario';
const JUST_BEFORE = new Date('2027-01-01T04:59:59.999Z'); // 31 dic 23:59:59.999 en Bogota
const SWITCH = new Date('2027-01-01T05:00:00.000Z'); // 1 ene 00:00 en Bogota

const withKeys = { ...env, BOLD_IDENTITY_KEY: TEST_IDENTITY_KEY, BOLD_SECRET_KEY: TEST_SECRET_KEY };

const meta = { sourcePage: null, ipCountry: 'CO', userAgent: null, ip: null };

const input = {
  program: PROGRAM,
  currency: 'COP' as const,
  full_name: 'Ana Rios',
  email: 'ana@calendario.co',
  country_code: '+57',
  phone: '3205551234',
  referral_source: 'instagram' as const,
  'cf-turnstile-response': undefined,
};

beforeAll(async () => {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO programs (code, description) VALUES (?, 'Programa con cambio de precio')
       ON CONFLICT (code) DO NOTHING`
    ).bind(PROGRAM),
    env.DB.prepare(
      `INSERT INTO program_prices (program_code, currency, amount, valid_from) VALUES
         (?1, 'COP', 440000, '2026-11-01T05:00:00.000Z'),
         (?1, 'USD', 147, '2026-11-01T05:00:00.000Z'),
         (?1, 'COP', 550000, '2027-01-01T05:00:00.000Z'),
         (?1, 'USD', 185, '2027-01-01T05:00:00.000Z')
       ON CONFLICT DO NOTHING`
    ).bind(PROGRAM),
    // Ventas abiertas a ambos lados del cambio de precio.
    env.DB.prepare(
      `INSERT INTO program_limits (program_code, opens_at, closes_at, capacity)
       VALUES (?, '2026-11-01T05:00:00.000Z', '2027-02-01T05:00:00.000Z', 30)
       ON CONFLICT DO NOTHING`
    ).bind(PROGRAM),
  ]);
});

describe('precio vigente segun la fecha', () => {
  it('cobra el precio de 2026 hasta el ultimo milisegundo del 31 de diciembre en Colombia', async () => {
    const program = await loadProgram(withKeys, PROGRAM, JUST_BEFORE, 'CO');

    expect(program.prices).toEqual({ COP: 440000, USD: 147 });
  });

  it('pasa solo al precio de 2027 a las 00:00 del 1 de enero en Colombia', async () => {
    const program = await loadProgram(withKeys, PROGRAM, SWITCH, 'CO');

    expect(program.prices).toEqual({ COP: 550000, USD: 185 });
  });

  it('una orden creada antes del cambio conserva su monto, moneda e impuesto', async () => {
    const session = await createCheckoutSession(withKeys, input, meta, JUST_BEFORE);
    expect(session).toMatchObject({ amount: 440000, currency: 'COP', tax: 'vat-19' });

    const after = await createCheckoutSession(withKeys, input, meta, SWITCH);
    expect(after).toMatchObject({ amount: 550000, currency: 'COP' });

    const order = await env.DB.prepare('SELECT amount, currency, tax FROM orders WHERE order_id = ?')
      .bind(session.orderId)
      .first();
    expect(order).toEqual({ amount: 440000, currency: 'COP', tax: 'vat-19' });
  });
});
