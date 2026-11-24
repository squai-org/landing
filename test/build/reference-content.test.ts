import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { serviceSchema } from '../../src/content/schema';

const root = path.join(import.meta.dirname, '../..');

const service = async () => JSON.parse(await readFile(path.join(root, 'src/content/services/squai-one.json'), 'utf8'));

describe('contenido del Precio de referencia', () => {
  it('el servicio sin campos de inversion es valido y no muestra nada', async () => {
    const parsed = serviceSchema.parse(await service());

    expect(parsed.investment).toBeUndefined();
  });

  it('acepta precio por moneda, porcentaje y fecha limite', async () => {
    const parsed = serviceSchema.parse({
      ...(await service()),
      investment: { referencePrice: { COP: 499000, USD: 159 }, discountPercent: 20, discountDeadline: '15 de diciembre' },
    });

    expect(parsed.investment).toEqual({
      referencePrice: { COP: 499000, USD: 159 },
      discountPercent: 20,
      discountDeadline: '15 de diciembre',
    });
  });

  it('los campos vacios del CMS cuentan como sin valor', async () => {
    const parsed = serviceSchema.parse({
      ...(await service()),
      investment: { referencePrice: { COP: '', USD: '' }, discountPercent: '', discountDeadline: '' },
    });

    expect(parsed.investment?.referencePrice).toEqual({});
    expect(parsed.investment?.discountPercent).toBeUndefined();
    expect(parsed.investment?.discountDeadline).toBeUndefined();
  });

  it('rechaza un porcentaje fuera de rango', async () => {
    const invalid = { ...(await service()), investment: { discountPercent: 100 } };

    expect(serviceSchema.safeParse(invalid).success).toBe(false);
  });

  it('el CMS edita los mismos campos que el esquema', async () => {
    const pages = await readFile(path.join(root, '.pages.yml'), 'utf8');
    const node = pages.slice(pages.indexOf('- name: one-inversion'));

    for (const field of ['investment', 'referencePrice', 'COP', 'USD', 'discountPercent', 'discountDeadline']) {
      expect(node.slice(0, node.indexOf('- name: one-faq'))).toContain(`- name: ${field}`);
    }
  });
});
