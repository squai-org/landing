import { badRequest, notFound } from '../lib/http';
import { findCurrentPrices, findProgram, type Currency } from '../repositories/program.repository';
import type { Env } from '../types';

export type { Currency };

export interface ProgramView {
  code: string;
  description: string;
  /** Precio vigente por moneda; una moneda sin precio vigente no aparece. */
  prices: Partial<Record<Currency, number>>;
  defaultCurrency: Currency;
}

/**
 * Moneda que se propone: COP a quien llega desde Colombia, USD al resto (y a
 * quien no trae pais). Si esa moneda no tiene precio vigente se propone la
 * otra, para no mostrar una tarjeta sin precio.
 */
const pickDefaultCurrency = (prices: ProgramView['prices'], ipCountry: string | null): Currency => {
  const preferred: Currency = ipCountry?.toUpperCase() === 'CO' ? 'COP' : 'USD';
  if (prices[preferred] !== undefined) return preferred;
  return preferred === 'COP' ? 'USD' : 'COP';
};

/**
 * El programa con sus precios vigentes en `now`. Sin ningun precio vigente no
 * se puede vender, y se responde igual que si no existiera.
 */
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
  };
};

/** Monto vigente en la moneda elegida; si no hay, error claro y no un cobro en otra. */
export const priceIn = (program: ProgramView, currency: Currency): number => {
  const amount = program.prices[currency];

  if (amount === undefined) {
    throw badRequest('currency_not_available', 'El programa no tiene precio vigente en esa moneda.', {
      currency: 'Elige otra moneda.',
    });
  }

  return amount;
};
