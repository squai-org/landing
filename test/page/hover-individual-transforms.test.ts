import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const dist = path.join(import.meta.dirname, '../../dist');

type Rule = { selector: string; body: string };

const builtRules = (html: string): Rule[] => {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((block) => block[1]).join('\n');
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1]!.trim(),
    body: match[2]!,
  }));
};

const hoverDeclarations = (rules: Rule[], include: RegExp, exclude?: RegExp) =>
  rules
    .filter((rule) => include.test(rule.selector) && /:hover|:focus/.test(rule.selector) && !exclude?.test(rule.selector))
    .map((rule) => rule.body)
    .join(';');

describe('Hover de botones: propiedades individuales tras minificar', () => {
  let rules: Rule[] = [];

  beforeAll(async () => {
    const html = await readFile(path.join(dist, 'servicios/squai-one.html'), 'utf8').catch(() => {
      throw new Error('Falta dist/servicios/squai-one.html: ejecuta pnpm build antes de pnpm test:dist');
    });
    rules = builtRules(html);
  });

  it('el fondo del boton conserva scale junto a transform', () => {
    const declarations = hoverDeclarations(rules, /\.btn-bg/, /\.btn-ghost/);
    expect(declarations).toMatch(/(^|;)scale:\.955 \.925/);
    expect(declarations).toMatch(/transform:scale\(1\.047,\s*1\.081\)/);
  });

  it('el texto del boton conserva translate y rotate junto a transform', () => {
    const declarations = hoverDeclarations(rules, /\.btn-text/, /\.one-card-cta/);
    expect(declarations).toMatch(/(^|;)translate:\.25em \.125em/);
    expect(declarations).toMatch(/(^|;)rotate:4deg/);
    expect(declarations).toMatch(/transform:rotate\(-4deg\)/);
  });

  it('la flecha del boton conserva translate y rotate junto a transform', () => {
    const declarations = hoverDeclarations(rules, /\.btn-arrow/, /\.one-card-cta/);
    expect(declarations).toMatch(/(^|;)translate:-\.5em \.25em/);
    expect(declarations).toMatch(/(^|;)rotate:-18deg/);
    expect(declarations).toMatch(/transform:rotate\(18deg\)/);
  });

  it('la pildora y las redes conservan scale junto a transform', () => {
    const declarations = hoverDeclarations(rules, /\.pill-button-bg|\.social-button-bg/);
    expect(declarations).toMatch(/(^|;)scale:\.955 \.925/);
    expect(declarations).toMatch(/transform:scale\(1\.047,\s*1\.081\)/);
  });

  it('el texto del CTA de la tarjeta conserva rotate junto a transform', () => {
    const declarations = hoverDeclarations(rules, /\.one-card-cta .*\.btn-text|\.one-card-cta\s+\.btn-text/);
    expect(declarations).toMatch(/(^|;)rotate:-12deg/);
    expect(declarations).toMatch(/transform:rotate\(12deg\)/);
  });

  it('la flecha del CTA de la tarjeta conserva rotate junto a transform', () => {
    const declarations = hoverDeclarations(rules, /\.one-card-cta .*\.btn-arrow|\.one-card-cta\s+\.btn-arrow/);
    expect(declarations).toMatch(/(^|;)rotate:12deg/);
    expect(declarations).toMatch(/transform:rotate\(-12deg\)/);
  });
});
