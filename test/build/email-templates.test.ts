import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONFIRMATION_PARAMS, RECOVERY_PARAMS } from '../../src/server/services/email.service';

const TEMPLATES = [
  { file: 'src/emails/confirmation.html', params: CONFIRMATION_PARAMS },
  { file: 'src/emails/recovery.html', params: RECOVERY_PARAMS },
];

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
    const all = [...html.matchAll(/\{\{([^}]*)\}\}/g)].map((match) => (match[1] ?? '').trim());

    expect(all.filter((inner) => !/^params\.[A-Z0-9_]+$/.test(inner))).toEqual([]);
  });

  it('no publica recursos que los clientes de correo bloquean', async () => {
    const html = await readTemplate(file);

    expect(html).toContain('lang="es"');
    expect(html).not.toMatch(/<svg|<script|\.svg["')]/i);
  });
});

describe('plantilla de recuperacion', () => {
  it('lleva el enlace para retomar en el boton', async () => {
    const html = await readTemplate('src/emails/recovery.html');

    expect(html).toMatch(/<a href="\{\{ params\.RESUME_URL \}\}"/);
  });
});
