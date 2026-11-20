import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONFIRMATION_PARAMS } from '../../src/server/services/email.service';

/**
 * Las plantillas viven versionadas en src/emails/ y se suben a Brevo. Si el
 * HTML pide un {{ params.X }} que el Worker no manda, el cliente ve un hueco;
 * si el Worker manda uno que el HTML no usa, sobra o se renombro a medias.
 */
const TEMPLATES = [{ file: 'src/emails/confirmation.html', params: CONFIRMATION_PARAMS }];

const readTemplate = (file: string) => readFile(path.join(import.meta.dirname, '../..', file), 'utf8');

const placeholders = (html: string) =>
  new Set([...html.matchAll(/\{\{\s*params\.([A-Z0-9_]+)\s*\}\}/g)].map((match) => match[1]));

describe.each(TEMPLATES)('plantilla $file', ({ file, params }) => {
  it('usa exactamente los parametros que envia el Worker', async () => {
    const html = await readTemplate(file);

    expect([...placeholders(html)].sort()).toEqual([...params].sort());
  });

  it('no tiene placeholders con otra forma que Brevo no reemplazaria', async () => {
    const html = await readTemplate(file);
    const all = [...html.matchAll(/\{\{([^}]*)\}\}/g)].map((match) => match[1].trim());

    expect(all.filter((inner) => !/^params\.[A-Z0-9_]+$/.test(inner))).toEqual([]);
  });

  it('no publica recursos que los clientes de correo bloquean', async () => {
    const html = await readTemplate(file);

    expect(html).toContain('lang="es"');
    expect(html).not.toMatch(/<svg|<script|\.svg["')]/i);
  });
});
