import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.join(import.meta.dirname, '../..');
const css = readFileSync(path.join(root, 'src/styles/global.css'), 'utf8').replace(/\r\n/g, '\n');
const doc = readFileSync(path.join(root, 'docs/diseno/tokens-y-contraste.md'), 'utf8').replace(/\r\n/g, '\n');

const blocks = new Map<string, Map<string, string>>();
for (const [, selector = '', body = ''] of css.matchAll(/(?:^|\n)(:root|\[data-[^\]]+\])\s*\{([^}]*)\}/g)) {
  const declarations = new Map<string, string>();
  for (const [, name = '', value = ''] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) declarations.set(name, value.trim());
  blocks.set(selector, declarations);
}

const themeSelectors: Record<string, string> = {
  base: ':root',
  grow: "[data-service='squai-grow']",
  learn: "[data-service='squai-learn']",
};

const resolve = (token: string, theme: string): string => {
  if (token.startsWith('#')) return token;
  const value = blocks.get(themeSelectors[theme]!)?.get(token) ?? blocks.get(':root')!.get(token);
  if (!value) throw new Error(`Token sin definir: ${token}`);
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference ? resolve(reference[1]!, theme) : value;
};

const luminance = (hex: string) => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (foreground: string, background: string) => {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

const rows = doc
  .split('\n')
  .map((line) => /^\| (base|grow|learn) \| (.+?) \| `([^`]+)` \| `([^`]+)` \| ([\d.]+) \| ([\d.]+) \|$/.exec(line))
  .filter((match): match is RegExpExecArray => match !== null)
  .map(([, theme = '', use = '', foreground = '', background = '', documented = '', minimum = '']) => ({
    theme,
    use,
    foreground,
    background,
    documented: Number(documented),
    minimum: Number(minimum),
  }));

describe('tabla de contraste de docs/diseno/tokens-y-contraste.md', () => {
  it('documenta combinaciones en los tres temas', () => {
    expect(new Set(rows.map((row) => row.theme))).toEqual(new Set(['base', 'grow', 'learn']));
    expect(rows.length).toBeGreaterThan(40);
  });

  it.each(rows)('$theme: $use ($foreground sobre $background)', ({ theme, foreground, background, documented, minimum }) => {
    const ratio = contrast(resolve(foreground, theme), resolve(background, theme));
    expect(ratio).toBeGreaterThanOrEqual(minimum);
    expect(documented).toBeCloseTo(ratio, 1);
  });
});

describe('tema por servicio', () => {
  const roleTokens = ['--accent', '--accent-hover', '--accent-soft', '--accent-soft-strong', '--accent-line', '--accent-ink', '--accent-deep', '--on-accent'];

  it('Squai One usa Periwinkle por defecto', () => {
    expect(resolve('--accent', 'base').toLowerCase()).toBe('#8a8ef9');
  });

  it.each(['grow', 'learn'])('%s solo sobrescribe tokens de rol de acento', (theme) => {
    const overrides = [...blocks.get(themeSelectors[theme]!)!.keys()];
    expect(overrides.length).toBeGreaterThan(0);
    for (const token of overrides) expect(roleTokens).toContain(token);
  });

  it('Grow es Teal y Learn es Gold', () => {
    expect(resolve('--accent', 'grow').toLowerCase()).toBe('#44d4c8');
    expect(resolve('--accent', 'learn').toLowerCase()).toBe('#f9c24d');
  });

  it('las páginas de servicio declaran el tema con el slug del servicio', () => {
    const layout = readFileSync(path.join(root, 'src/layouts/Layout.astro'), 'utf8');
    const servicePage = readFileSync(path.join(root, 'src/pages/servicios/[slug].astro'), 'utf8');
    expect(layout).toContain('data-service={service}');
    expect(servicePage).toContain('service={service.slug}');
  });
});
