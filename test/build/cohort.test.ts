import { describe, expect, it } from 'vitest';
import { formatCohortDates } from '../../src/lib/cohort';

describe('formatCohortDates', () => {
  it('escribe el rango de la cohorte en espanol', () => {
    expect(formatCohortDates('2027-01-26', '2027-02-18')).toBe('Del 26 de enero al 18 de febrero de 2027');
  });

  it('repite el ano cuando el rango cruza de ano', () => {
    expect(formatCohortDates('2026-12-15', '2027-01-20')).toBe('Del 15 de diciembre de 2026 al 20 de enero de 2027');
  });

  it('muestra solo el inicio si el fin no esta definido', () => {
    expect(formatCohortDates('2027-01-26', null)).toBe('Desde el 26 de enero de 2027');
  });

  it('no inventa nada si falta el inicio o la fecha es invalida', () => {
    expect(formatCohortDates(null, '2027-02-18')).toBeNull();
    expect(formatCohortDates('26/01/2027', '2027-02-18')).toBeNull();
    expect(formatCohortDates('2027-13-45', null)).toBeNull();
    expect(formatCohortDates(undefined, undefined)).toBeNull();
  });
});
