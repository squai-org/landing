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
  text: 'reserve' | 'paying' | 'retry';
  locked: boolean;
  disabled: boolean;
}

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

export type SalesPanel = 'form' | 'upcoming' | 'closed';

export const salesPanel = (status: string | undefined): SalesPanel => {
  if (status === 'upcoming' || status === 'closed') return status;
  return 'form';
};

export const rejectionAction = (code: string | undefined): 'enrolled' | 'closed' | null => {
  if (code === 'already_enrolled') return 'enrolled';
  if (code === 'program_not_open') return 'closed';
  return null;
};

const ENROLLED_PARAM = 'estado';
const ENROLLED_VALUE = 'inscrito';

export const enrolledUrl = (returnPath: string): string => `${returnPath}?${ENROLLED_PARAM}=${ENROLLED_VALUE}`;

export type ThanksStart = { state: 'enrolled' } | { state: 'error' } | { state: 'checking'; orderId: string };

export const thanksStart = (search: string): ThanksStart => {
  const params = new URLSearchParams(search);
  if (params.get(ENROLLED_PARAM) === ENROLLED_VALUE) return { state: 'enrolled' };
  const orderId = params.get('bold-order-id');
  return orderId ? { state: 'checking', orderId } : { state: 'error' };
};
