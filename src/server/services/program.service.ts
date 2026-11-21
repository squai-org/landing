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

/**
 * Estado de ventas, calculado y nunca guardado (ver GLOSSARY.md):
 * upcoming  antes de la apertura.
 * open      dentro de las fechas, con cupo y sin cierre manual.
 * closed    lo primero que se cumpla entre fecha de cierre, cupo o cierre
 *           manual; tambien un programa sin limites configurados.
 */
export type ProgramStatus = 'upcoming' | 'open' | 'closed';

export interface ProgramView {
  code: string;
  description: string;
  /** Precio vigente por moneda; una moneda sin precio vigente no aparece. */
  prices: Partial<Record<Currency, number>>;
  defaultCurrency: Currency;
  status: ProgramStatus;
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
 * `now` se compara como texto ISO con opens_at/closes_at: mismo formato, mismo
 * orden. El cupo solo se cuenta si el resto no cierra ya el programa.
 */
const computeStatus = async (env: Env, program: Program, now: Date): Promise<ProgramStatus> => {
  const limits = await findProgramLimits(env.DB, program.code);
  const instant = now.toISOString();

  if (!limits || program.closedManually || instant >= limits.closesAt) return 'closed';
  if (instant < limits.opensAt) return 'upcoming';

  const approved = await countApprovedOrders(env.DB, program.code);
  return approved >= limits.capacity ? 'closed' : 'open';
};

/**
 * Estado de ventas de un programa por su codigo, sin precios. Un programa que
 * no existe cuenta como cerrado. Lo usa el cron para no enviar recuperaciones
 * de un programa que ya no vende.
 */
export const programStatus = async (env: Env, code: string, now: Date): Promise<ProgramStatus> => {
  const program = await findProgram(env.DB, code);
  return program ? computeStatus(env, program, now) : 'closed';
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
    status: await computeStatus(env, program, now),
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

/**
 * Antes de abrir un pago: el cliente no puede estar ya inscrito ni el programa
 * fuera de su periodo de venta. Son errores distintos porque la pagina hace
 * cosas distintas: al inscrito lo lleva a /gracias, al resto le muestra el
 * estado. La respuesta no lleva el order-id de la inscripcion: quien llama es
 * anonimo y solo trae un correo.
 */
export const assertOpenAndNotEnrolled = async (env: Env, program: ProgramView, email: string): Promise<void> => {
  if (await isEnrolled(env.DB, email, program.code)) {
    throw conflict('already_enrolled', 'Ya tienes una inscripcion en este programa.');
  }

  if (program.status !== 'open') {
    throw conflict('program_not_open', 'Las inscripciones de este programa no estan abiertas.');
  }
};
