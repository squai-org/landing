import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');

describe('pagina de Squai One: inversion', () => {
  let page: string;

  beforeAll(async () => {
    page = await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8');
  });

  it('lista los medios de pago del contenido', () => {
    expect(page).toContain('Medios de pago');
    for (const method of ['PSE', 'Nequi', 'Botón Bancolombia']) expect(page).toMatch(new RegExp(`<li[^>]*>${method}</li>`));
  });

  it('no afirma Bre-B mientras el contenido no lo liste', () => {
    expect(page).not.toMatch(/Bre-?B/i);
  });

  it('sin Precio de referencia en el contenido no pinta tachado ni descuento', () => {
    expect(page).not.toContain('data-reference-offer');
    expect(page).not.toContain('class="discount-badge');
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
