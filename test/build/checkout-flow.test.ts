import { describe, expect, it } from 'vitest';
import { buttonView, canReopen, nextPhase } from '../../src/lib/checkout-flow';

/**
 * Un solo boton conduce todo el registro y pago. Estas pruebas fijan que el
 * comprador nunca vea dos botones de accion y que, si cierra el modal de Bold
 * sin pagar, el mismo boton le ofrezca retomar la sesion ya firmada.
 */
describe('nextPhase', () => {
  it('abre el pago en cuanto el Worker entrega la sesion firmada', () => {
    expect(nextPhase('idle', 'session')).toBe('paying');
  });

  it('pasa a reintento cuando el comprador cierra el modal sin terminar', () => {
    expect(nextPhase('paying', 'closed')).toBe('retry');
  });

  it('vuelve a abrir el pago desde el reintento', () => {
    expect(nextPhase('retry', 'retry')).toBe('paying');
  });

  it('descarta la sesion si el comprador edita el formulario despues de firmarla', () => {
    expect(nextPhase('retry', 'edited')).toBe('idle');
  });

  it('ignora eventos que no corresponden a la fase actual', () => {
    expect(nextPhase('idle', 'closed')).toBe('idle');
    expect(nextPhase('paying', 'edited')).toBe('paying');
    expect(nextPhase('idle', 'retry')).toBe('idle');
  });
});

describe('buttonView', () => {
  it('muestra la accion de reservar con el estilo primario y deja que el formulario la habilite', () => {
    expect(buttonView('idle')).toMatchObject({ variant: 'primary', text: 'reserve', locked: false });
  });

  it('bloquea el boton mientras el modal de pago esta abierto', () => {
    expect(buttonView('paying')).toMatchObject({ variant: 'dark', text: 'paying', locked: true, disabled: true });
  });

  it('cambia de estilo y de texto para invitar a reintentar el pago', () => {
    const retry = buttonView('retry');

    expect(retry.variant).toBe('dark');
    expect(retry.variant).not.toBe(buttonView('idle').variant);
    expect(retry.text).toBe('retry');
    expect(retry.locked).toBe(true);
  });

  it('deja pulsable el boton de reintento', () => {
    expect(buttonView('retry').disabled).toBe(false);
  });
});

describe('canReopen', () => {
  it('no reabre el pago si la compra ya fue aprobada', () => {
    expect(canReopen('approved')).toBe(false);
  });

  it.each(['pending', 'rejected', 'failed', 'voided', 'unknown'])('reabre el pago si el estado es %s', (status) => {
    expect(canReopen(status)).toBe(true);
  });
});
