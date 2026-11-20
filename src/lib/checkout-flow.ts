/**
 * Fases del boton unico de registro y pago (docs/bold-checkout.md).
 *
 * idle    formulario sin enviar: el boton dice "Reservar" y lo habilita el
 *         formulario (consentimiento + Turnstile).
 * paying  la inscripcion quedo guardada y firmada, y el modal de Bold esta abierto.
 * retry   el comprador cerro el modal sin pagar: el mismo boton cambia de estilo
 *         y de texto para retomar la MISMA sesion, sin crear otra inscripcion.
 */
export type Phase = 'idle' | 'paying' | 'retry';
export type FlowEvent = 'session' | 'closed' | 'retry' | 'edited';

const transitions: Record<Phase, Partial<Record<FlowEvent, Phase>>> = {
  idle: { session: 'paying' },
  paying: { closed: 'retry' },
  retry: { retry: 'paying', edited: 'idle' },
};

export const nextPhase = (phase: Phase, event: FlowEvent): Phase => transitions[phase][event] ?? phase;

export interface ButtonView {
  variant: 'primary' | 'dark';
  /** Clave del texto. Todos vienen del contenido: `labels.reserve` y `ui.checkout.button`. */
  text: 'reserve' | 'paying' | 'retry';
  /** `true`: el flujo decide si el boton esta habilitado. `false`: lo decide el formulario. */
  locked: boolean;
  /** Solo se lee cuando `locked` es `true`. */
  disabled: boolean;
}

const views: Record<Phase, ButtonView> = {
  idle: { variant: 'primary', text: 'reserve', locked: false, disabled: false },
  paying: { variant: 'dark', text: 'paying', locked: true, disabled: true },
  retry: { variant: 'dark', text: 'retry', locked: true, disabled: false },
};

export const buttonView = (phase: Phase): ButtonView => views[phase];

/**
 * Antes de reabrir el pago se consulta la inscripcion: si Bold ya la aprobo, un
 * segundo pago seria un doble cobro.
 */
export const canReopen = (enrollmentStatus: string): boolean => enrollmentStatus !== 'approved';
