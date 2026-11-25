import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');

describe('pagina de Squai One: inversion', () => {
  let page: string;

  beforeAll(async () => {
    page = await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8');
  });

  it('el Precio de referencia queda oculto hasta comparar con el precio vigente', () => {
    expect(page).toMatch(/<div[^>]*data-reference-offer[^>]*hidden/);
    expect(page).toContain('20% de descuento hasta el 31 de diciembre.');
  });

  it('el precio vigente espera a la base de datos con estado de carga', () => {
    expect(page).toMatch(/data-bold-price[^>]*data-state="loading"/);
  });

  it('cada mensaje de error de campo se anuncia', () => {
    const errors = page.match(/<span[^>]*data-field-error="[a-z_]+"[^>]*>/g) ?? [];
    const announced = errors.filter((tag) => tag.includes('role="alert"'));

    expect(announced.length).toBeGreaterThanOrEqual(5);
  });
});
