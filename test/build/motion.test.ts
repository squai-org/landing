import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.join(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const css = read('src/styles/motion.css');
const baseCss = css.slice(0, css.indexOf('@media (prefers-reduced-motion'));
const animatedSelectors = [...baseCss.matchAll(/([^{}]+)\{[^{}]*\banimation:[^{}]*\}/g)].map(([, selector = '']) => selector.trim());
const reducedMotion = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*)\n\}\s*$/.exec(css)?.[1] ?? '';

describe('movimiento decorativo', () => {
  it('detecta los selectores que animan', () => {
    expect(animatedSelectors).toEqual(expect.arrayContaining(['.backdrop-block', '.drift-block-motion', '.marquee-track']));
  });

  it.each(['.backdrop-block', '.drift-block-motion', '.marquee-track'])('con movimiento reducido %s no se anima', (selector) => {
    const disabling = /([^{}]+)\{\s*animation: none;\s*\}/.exec(reducedMotion)?.[1] ?? '';
    expect(disabling).toContain(selector);
  });

  it('con movimiento reducido el reveal no oculta ni mueve nada', () => {
    expect(read('src/styles/global.css')).toMatch(/\.js-reveal \.reveal \{ opacity: 1; transform: none; transition: none; \}/);
  });

  it('el JS no activa el movimiento ambiental con movimiento reducido', () => {
    const client = read('src/lib/motion-client.ts');
    expect(client).toMatch(/matchMedia\(reducedMotionQuery\)\.matches[^\n]*\) return;/);
  });

  it('toda animación ambiental se pausa desde el control global', () => {
    expect(css).toContain("html[data-motion='paused'] .ambient { --ambient-state: paused !important; }");
    for (const selector of animatedSelectors.filter((s) => !s.startsWith('@'))) {
      const rule = css.slice(css.indexOf(selector));
      expect(rule.slice(0, rule.indexOf('}'))).toContain('var(--ambient-state, paused)');
    }
  });

  it('las piezas decorativas se ocultan a lectores de pantalla', () => {
    for (const file of ['BackdropShape', 'DriftBlock', 'CornerBlocks']) {
      expect(read(`src/components/${file}.astro`)).toContain('aria-hidden="true"');
    }
    expect(read('src/components/Marquee.astro')).toContain('class="marquee-track ambient" aria-hidden="true"');
  });

  it('el texto del botón de pausa viene del contenido editable', () => {
    const copies = JSON.parse(read('src/content/copies.json')) as { site: { ui: { motion: { pause: string; resume: string } } } };
    expect(copies.site.ui.motion.pause.length).toBeGreaterThan(0);
    expect(copies.site.ui.motion.resume.length).toBeGreaterThan(0);
    expect(read('.pages.yml')).toContain('name: motion');
  });
});
