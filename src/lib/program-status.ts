import { checkout } from '../config/checkout';
import { endpoints } from '../config/endpoints';

export type ProgramStatus = 'upcoming' | 'open' | 'closed';

export type ProgramStatusLabels = Record<ProgramStatus, string>;

interface ProgramStatusCopy {
  program: { status: string };
  ui: { checkout: { status: { upcomingTitle: string; closedTitle: string } } };
}

export const programStatusAttributes = ({ program, ui }: ProgramStatusCopy) => ({
  'data-program-status': '',
  'data-endpoint': `${endpoints.checkoutProgram}/${checkout.program}`,
  'data-upcoming': ui.checkout.status.upcomingTitle,
  'data-open': program.status,
  'data-closed': ui.checkout.status.closedTitle,
});

export const programStatusLabel = (status: unknown, labels: ProgramStatusLabels): string | null =>
  typeof status === 'string' && Object.hasOwn(labels, status) ? labels[status as ProgramStatus] || null : null;
