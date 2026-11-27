import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeHtml } from './content';

const dist = path.join(import.meta.dirname, '../../dist');
const root = path.join(import.meta.dirname, '../..');

const readDist = async (file: string) => {
  try {
    return await readFile(path.join(dist, file), 'utf8');
  } catch {
    throw new Error(`Falta dist/${file}: ejecuta pnpm build antes de pnpm test:dist`);
  }
};

const jsonLdNodes = (html: string) => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  return blocks.flatMap((block) => {
    const parsed = JSON.parse(block[1] ?? '');
    return parsed['@graph'] ?? [parsed];
  }) as Record<string, unknown>[];
};

const flagged = async () => {
  const copies = JSON.parse(await readFile(path.join(root, 'src/content/copies.json'), 'utf8')) as {
    site: { squadGrid: { name: string; founder?: boolean }[] };
  };
  return copies.site.squadGrid;
};

describe('Squai One: equipo y JSON-LD generado', () => {
  it('declara como fundadores exactamente a quienes tienen el campo founder', async () => {
    const html = await readDist('servicios/squai-one.html');
    const organization = jsonLdNodes(html).find((node) => String(node['@type']).includes('Organization'));
    const declared = ((organization?.founder ?? []) as { name: string }[]).map((person) => person.name);
    const expected = (await flagged()).filter((person) => person.founder).map((person) => person.name);

    expect(declared).toEqual(expected);
  });

  it('muestra en la pagina a los fundadores con su nombre y su cierre', async () => {
    const html = await readDist('servicios/squai-one.html');
    const names = (await flagged()).filter((person) => person.founder).map((person) => person.name);

    for (const name of names) expect(decodeHtml(html)).toContain(name);
    expect(html).toContain('id="equipo-one"');
  });

  it('muestra los testimonios del CMS como citas con autor', async () => {
    const html = await readDist('servicios/squai-one.html');
    const service = JSON.parse(await readFile(path.join(root, 'src/content/services/squai-one.json'), 'utf8')) as {
      testimonials: { quotes: { name: string }[] };
    };
    const start = html.indexOf('<section id="testimonios"');
    const section = html.slice(start, html.indexOf('</section>', start));

    expect(start).toBeGreaterThan(-1);
    expect(section.match(/<figure\b/g)).toHaveLength(service.testimonials.quotes.length);
    expect(section.match(/<blockquote\b/g)).toHaveLength(service.testimonials.quotes.length);
    for (const quote of service.testimonials.quotes) expect(decodeHtml(section)).toContain(quote.name);
  });

  it('no declara resenas, calificaciones, precios, fechas ni capacidad', async () => {
    const html = await readDist('servicios/squai-one.html');
    const serialized = JSON.stringify(jsonLdNodes(html));

    for (const forbidden of ['"review"', '"Review"', 'aggregateRating', '"offers"', '"price"', 'startDate', 'endDate', 'maximumAttendeeCapacity']) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

describe('Squai One: el nombre del mentor cabe en la tarjeta', () => {
  it('el nombre no rompe de linea y su cuerpo se ajusta al ancho de la cabecera de la tarjeta', async () => {
    const source = await readFile(path.join(root, 'src/components/OneTeam.astro'), 'utf8');

    expect(source).toMatch(/\.mentor-head \{[^}]*container-type: inline-size/);
    expect(source).toMatch(/\.mentor-head h3 \{[^}]*white-space: nowrap/);
    expect(source).toMatch(/\.mentor-head h3 \{[^}]*font-size: min\([^}]*cqw/);
    expect(source).toContain('--name-chars:');
  });

  it('la tarjeta publicada declara cuantas letras tiene cada nombre', async () => {
    const page = await readDist('servicios/squai-one.html');
    const names = [...page.matchAll(/<h3 id="one-team-\d+-name"[^>]*style="--name-chars:(\d+)"[^>]*>([^<]+)</g)];

    expect(names.length).toBeGreaterThan(0);
    for (const [, chars, name] of names) expect(Number(chars)).toBe(decodeHtml(name!).length);
  });
});
