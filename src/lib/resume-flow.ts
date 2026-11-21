import { checkout } from '../config/checkout';
import type { CheckoutSession } from './bold-checkout';
import { enrolledUrl } from './checkout-flow';

export type ResumeNotice = 'expired' | 'closed' | 'notFound' | 'error';

export type ResumeOutcome =
  | { kind: 'pay'; session: CheckoutSession }
  | { kind: 'redirect'; url: string }
  | { kind: 'show'; state: ResumeNotice };

export const resumeOrderId = (search: string): string | null =>
  new URLSearchParams(search).get('order_id')?.trim() || null;

interface ResumeBody {
  session?: CheckoutSession;
  enrolled?: boolean;
  orderId?: string;
  error?: { code?: string };
}

const NOTICES: Record<string, ResumeNotice> = {
  resume_expired: 'expired',
  program_not_open: 'closed',
  order_not_found: 'notFound',
  validation_failed: 'notFound',
};

export const resumeOutcome = (status: number, body: unknown): ResumeOutcome => {
  const data = (body ?? {}) as ResumeBody;

  if (status === 201 && data.session) return { kind: 'pay', session: data.session };

  if (status === 200 && data.enrolled && data.orderId) {
    return { kind: 'redirect', url: `${checkout.returnPath}?bold-order-id=${encodeURIComponent(data.orderId)}` };
  }

  const code = data.error?.code ?? '';
  if (code === 'already_enrolled') return { kind: 'redirect', url: enrolledUrl(checkout.returnPath) };

  return { kind: 'show', state: NOTICES[code] ?? 'error' };
};
