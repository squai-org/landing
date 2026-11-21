/** Duraciones en milisegundos, para restar a `now` sin repetir la cuenta. */
export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** El instante `ms` milisegundos antes de `now`. */
export const before = (now: Date, ms: number): Date => new Date(now.getTime() - ms);
