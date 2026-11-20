/**
 * Fases del boton unico de registro y pago (docs/bold-checkout.md).
 *
 * idle    formulario sin enviar: el boton dice "Reservar" y lo habilita el
 *         formulario (las dos casillas de consentimiento + Turnstile).
 * paying  la inscripcion quedo guardada y firmada, y el modal de Bold esta abierto.
 * retry   el comprador cerro el modal sin pagar: el mismo boton cambia de estilo
 *         y de texto para retomar la MISMA sesion, sin crear otra inscripcion.
 *
 * En registro y en reintento el boton solo se habilita con las dos casillas
 * marcadas: Terminos de Servicio y Politica de Privacidad, aceptadas por separado.
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
  /**
   * `true`: el flujo decide si el boton esta habilitado. `false`: el formulario
   * ademas lo condiciona (Turnstile, envio en curso).
   */
  locked: boolean;
  /** `true` si el flujo no deja pulsar el boton en esta fase con estas casillas. */
  disabled: boolean;
}

/** Casillas obligatorias del formulario de compra. */
export interface Consents {
  terms: boolean;
  privacy: boolean;
}

const views: Record<Phase, Omit<ButtonView, 'disabled'> & { open: boolean }> = {
  idle: { variant: 'primary', text: 'reserve', locked: false, open: true },
  paying: { variant: 'dark', text: 'paying', locked: true, open: false },
  retry: { variant: 'dark', text: 'retry', locked: true, open: true },
};

export const buttonView = (phase: Phase, consents: Consents): ButtonView => {
  const { open, ...view } = views[phase];
  return { ...view, disabled: !(open && consents.terms && consents.privacy) };
};

/**
 * Antes de reabrir el pago se consulta la inscripcion: si Bold ya la aprobo, un
 * segundo pago seria un doble cobro.
 */
export const canReopen = (enrollmentStatus: string): boolean => enrollmentStatus !== 'approved';

/**
 * Estado de ventas del programa segun GET /api/checkout/program (calculado en
 * el Worker): upcoming antes de la apertura, closed por fecha, cupo o cierre
 * manual. Fuera de `open` la pagina muestra un aviso en lugar del boton.
 */
export type SalesPanel = 'form' | 'upcoming' | 'closed';

export const salesPanel = (status: string | undefined): SalesPanel => {
  if (status === 'upcoming' || status === 'closed') return status;
  // Si no se pudo leer el estado se deja el formulario: el Worker rechaza
  // igual un pago en un programa que no esta abierto.
  return 'form';
};

/**
 * Que hace la pagina cuando POST /api/checkout/session responde con error:
 * al inscrito se lo lleva a /gracias; si el programa cerro mientras llenaba el
 * formulario, se cambia el boton por el aviso. El resto queda en el formulario.
 */
export const rejectionAction = (code: string | undefined): 'enrolled' | 'closed' | null => {
  if (code === 'already_enrolled') return 'enrolled';
  if (code === 'program_not_open') return 'closed';
  return null;
};

/**
 * Variante "ya estas inscrito" de la pagina de gracias. No lleva order-id: la
 * respuesta de /session no lo revela a quien solo trae un correo.
 */
const ENROLLED_PARAM = 'estado';
const ENROLLED_VALUE = 'inscrito';

export const enrolledUrl = (returnPath: string): string => `${returnPath}?${ENROLLED_PARAM}=${ENROLLED_VALUE}`;

export type ThanksStart = { state: 'enrolled' } | { state: 'error' } | { state: 'checking'; orderId: string };

/** Primer estado de /gracias segun su URL. Bold solo documenta `bold-order-id`. */
export const thanksStart = (search: string): ThanksStart => {
  const params = new URLSearchParams(search);
  if (params.get(ENROLLED_PARAM) === ENROLLED_VALUE) return { state: 'enrolled' };
  const orderId = params.get('bold-order-id');
  return orderId ? { state: 'checking', orderId } : { state: 'error' };
};
