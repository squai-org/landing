import { describe, expect, it } from 'vitest';
import {
  buttonView,
  canReopen,
  enrolledUrl,
  nextPhase,
  rejectionAction,
  salesPanel,
  thanksStart,
} from '../../src/lib/checkout-flow';

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
  const both = { terms: true, privacy: true };

  it('muestra la accion de reservar con el estilo primario y deja que el formulario la habilite', () => {
    expect(buttonView('idle', both)).toMatchObject({ variant: 'primary', text: 'reserve', locked: false });
  });

  it('bloquea el boton mientras el modal de pago esta abierto', () => {
    expect(buttonView('paying', both)).toMatchObject({ variant: 'dark', text: 'paying', locked: true, disabled: true });
  });

  it('cambia de estilo y de texto para invitar a reintentar el pago', () => {
    const retry = buttonView('retry', both);

    expect(retry.variant).toBe('dark');
    expect(retry.variant).not.toBe(buttonView('idle', both).variant);
    expect(retry.text).toBe('retry');
    expect(retry.locked).toBe(true);
  });

  it('deja pulsable el boton de reintento', () => {
    expect(buttonView('retry', both).disabled).toBe(false);
  });
});

/**
 * El comprador acepta por separado los Terminos de Servicio y la Politica de
 * Privacidad. Sin las dos casillas el boton no avanza, ni al registrarse ni al
 * continuar un pago que dejo a medias.
 */
describe('buttonView con las dos casillas de consentimiento', () => {
  const combos = [
    { terms: false, privacy: false, disabled: true },
    { terms: true, privacy: false, disabled: true },
    { terms: false, privacy: true, disabled: true },
    { terms: true, privacy: true, disabled: false },
  ];

  it.each(combos)('registro con terminos=$terms y privacidad=$privacy: deshabilitado=$disabled', ({ terms, privacy, disabled }) => {
    expect(buttonView('idle', { terms, privacy }).disabled).toBe(disabled);
  });

  it.each(combos)('continuar con terminos=$terms y privacidad=$privacy: deshabilitado=$disabled', ({ terms, privacy, disabled }) => {
    expect(buttonView('retry', { terms, privacy }).disabled).toBe(disabled);
  });

  it.each(combos)('con el modal abierto sigue bloqueado con terminos=$terms y privacidad=$privacy', ({ terms, privacy }) => {
    expect(buttonView('paying', { terms, privacy }).disabled).toBe(true);
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

/**
 * El programa abre y cierra solo (estado calculado por el Worker). Fuera de su
 * periodo de venta la pagina muestra un aviso con textos del CMS en lugar del
 * boton.
 */
describe('salesPanel', () => {
  it('muestra el formulario con su boton cuando el programa esta abierto', () => {
    expect(salesPanel('open')).toBe('form');
  });

  it('muestra "Proximamente" antes de la apertura', () => {
    expect(salesPanel('upcoming')).toBe('upcoming');
  });

  it('muestra "Inscripciones cerradas" cuando el programa cerro', () => {
    expect(salesPanel('closed')).toBe('closed');
  });

  it('deja el formulario si no se pudo saber el estado: el Worker igual rechaza un programa cerrado', () => {
    expect(salesPanel(undefined)).toBe('form');
  });
});

describe('rechazos al abrir el pago', () => {
  it('lleva a la pagina de gracias a quien ya esta inscrito', () => {
    expect(rejectionAction('already_enrolled')).toBe('enrolled');
  });

  it('cambia el boton por "Inscripciones cerradas" si el programa cerro mientras llenaba el formulario', () => {
    expect(rejectionAction('program_not_open')).toBe('closed');
  });

  it.each(['validation_failed', 'turnstile_missing', undefined])('deja el error en el formulario con %s', (code) => {
    expect(rejectionAction(code)).toBeNull();
  });

  it('la variante de inscrito de /gracias no lleva ningun order-id', () => {
    expect(enrolledUrl('/gracias')).toBe('/gracias?estado=inscrito');
  });
});

describe('thanksStart', () => {
  it('muestra "ya estas inscrito" sin consultar ninguna orden', () => {
    expect(thanksStart('?estado=inscrito')).toEqual({ state: 'enrolled' });
  });

  it('consulta la orden que trae Bold en la vuelta', () => {
    expect(thanksStart('?bold-order-id=squai-one-abc&bold-tx-status=approved')).toEqual({
      state: 'checking',
      orderId: 'squai-one-abc',
    });
  });

  it('sin orden ni variante muestra el error', () => {
    expect(thanksStart('')).toEqual({ state: 'error' });
  });
});
