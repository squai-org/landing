import type { Currency } from '../../config/checkout';
import { badRequest, conflict, notFound } from '../lib/http';
import { isEnrolled } from '../repositories/order.repository';
import {
  countApprovedOrders,
  findCurrentPrices,
  findProgram,
  findProgramLimits,
  type Program,
} from '../repositories/program.repository';
import type { Env } from '../types';

export type ProgramStatus = 'upcoming' | 'open' | 'closed';

export interface ProgramView {
  code: string;
  description: string;
  prices: Partial<Record<Currency, number>>;
  defaultCurrency: Currency;
  status: ProgramStatus;
  startsOn: string | null;
  endsOn: string | null;
  schedule: string | null;
}

const pickDefaultCurrency = (prices: ProgramView['prices'], ipCountry: string | null): Currency => {
  const preferred: Currency = ipCountry?.toUpperCase() === 'CO' ? 'COP' : 'USD';
  if (prices[preferred] !== undefined) return preferred;
  return preferred === 'COP' ? 'USD' : 'COP';
};

const computeStatus = async (env: Env, program: Program, now: Date): Promise<ProgramStatus> => {
  const limits = await findProgramLimits(env.DB, program.code);
  const instant = now.toISOString();

  if (!limits || program.closedManually || instant >= limits.closesAt) return 'closed';
  if (instant < limits.opensAt) return 'upcoming';

  const approved = await countApprovedOrders(env.DB, program.code);
  return approved >= limits.capacity ? 'closed' : 'open';
};

export const programStatus = async (env: Env, code: string, now: Date): Promise<ProgramStatus> => {
  const program = await findProgram(env.DB, code);
  return program ? computeStatus(env, program, now) : 'closed';
};

export const loadProgram = async (
  env: Env,
  code: string,
  now: Date,
  ipCountry: string | null
): Promise<ProgramView> => {
  const program = await findProgram(env.DB, code);
  const current = program ? await findCurrentPrices(env.DB, code, now) : [];

  if (!program || !current.length) {
    throw notFound('program_not_found', 'El programa solicitado no esta disponible.');
  }

  const prices: ProgramView['prices'] = {};
  for (const { currency, amount } of current) prices[currency] = amount;

  return {
    code: program.code,
    description: program.description,
    prices,
    defaultCurrency: pickDefaultCurrency(prices, ipCountry),
    status: await computeStatus(env, program, now),
    startsOn: program.startsOn,
    endsOn: program.endsOn,
    schedule: program.schedule,
  };
};

export const priceIn = (program: ProgramView, currency: Currency): number => {
  const amount = program.prices[currency];

  if (amount === undefined) {
    throw badRequest('currency_not_available', 'El programa no tiene precio vigente en esa moneda.', {
      currency: 'Elige otra moneda.',
    });
  }

  return amount;
};

export const assertOpenAndNotEnrolled = async (env: Env, program: ProgramView, email: string): Promise<void> => {
  if (await isEnrolled(env.DB, email, program.code)) {
    throw conflict('already_enrolled', 'Ya tienes una inscripcion en este programa.');
  }

  if (program.status !== 'open') {
    throw conflict('program_not_open', 'Las inscripciones de este programa no estan abiertas.');
  }
};
