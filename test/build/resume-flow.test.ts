import { describe, expect, it } from 'vitest';
import { resumeOrderId, resumeOutcome } from '../../src/lib/resume-flow';

/**
 * Que hace /retomar con la respuesta de POST /api/checkout/resume: abrir Bold,
 * llevar a /gracias o mostrar un aviso con textos del CMS.
 */
const session = {
  apiKey: 'identity-key',
  orderId: 'squai-one-nueva',
  amount: 440000,
  currency: 'COP',
  description: 'Squai One',
  tax: 'vat-19',
  integritySignature: 'abc123',
};

const error = (code: string) => ({ ok: false, error: { code, message: 'x' } });

describe('resumeOrderId', () => {
  it('lee el order_id de la URL del enlace', () => {
    expect(resumeOrderId('?order_id=squai-one-abc')).toBe('squai-one-abc');
  });

  it('sin order_id no hay nada que retomar', () => {
    expect(resumeOrderId('')).toBeNull();
    expect(resumeOrderId('?order_id=%20')).toBeNull();
  });
});

describe('resumeOutcome', () => {
  it('con una orden nueva abre Bold directo con esa sesion', () => {
    expect(resumeOutcome(201, { ok: true, session })).toEqual({ kind: 'pay', session });
  });

  it('si la orden anterior ya estaba pagada lleva a /gracias con ese order-id', () => {
    expect(resumeOutcome(200, { ok: true, enrolled: true, orderId: 'squai-one-pagada' })).toEqual({
      kind: 'redirect',
      url: '/gracias?bold-order-id=squai-one-pagada',
    });
  });

  it('si el cliente ya estaba inscrito con otra orden lleva a la variante de inscrito de /gracias', () => {
    expect(resumeOutcome(409, error('already_enrolled'))).toEqual({ kind: 'redirect', url: '/gracias?estado=inscrito' });
  });

  it('muestra el aviso de enlace expirado', () => {
    expect(resumeOutcome(410, error('resume_expired'))).toEqual({ kind: 'show', state: 'expired' });
  });

  it('muestra el aviso de inscripciones cerradas sin abrir pago', () => {
    expect(resumeOutcome(409, error('program_not_open'))).toEqual({ kind: 'show', state: 'closed' });
  });

  it('una orden que no existe o un enlace mal copiado muestran "no encontrado"', () => {
    expect(resumeOutcome(404, error('order_not_found'))).toEqual({ kind: 'show', state: 'notFound' });
    expect(resumeOutcome(400, error('validation_failed'))).toEqual({ kind: 'show', state: 'notFound' });
  });

  it('cualquier otro fallo muestra el error generico', () => {
    expect(resumeOutcome(429, error('rate_limited'))).toEqual({ kind: 'show', state: 'error' });
    expect(resumeOutcome(503, error('bold_not_configured'))).toEqual({ kind: 'show', state: 'error' });
    expect(resumeOutcome(500, null)).toEqual({ kind: 'show', state: 'error' });
  });
});
