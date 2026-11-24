import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.join(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const css = read('src/styles/motion.css');
const component = read('src/components/MotionToggle.astro');
const client = read('src/lib/motion-client.ts');

const compactBlock = () => {
  const start = css.indexOf('@media (max-width: 639.98px)');
  expect(start).toBeGreaterThan(-1);
  const end = css.indexOf('\n}\n', start);
  return css.slice(start, end);
};

describe('pausa compacta en movil', () => {
  it('bajo 640px es un circulo de 44px', () => {
    const block = compactBlock();
    expect(block).toMatch(/\.motion-toggle \{[^}]*width: 44px/);
    expect(block).toMatch(/\.motion-toggle \{[^}]*height: 44px/);
    expect(block).toMatch(/\.motion-toggle \{[^}]*padding: 0/);
    expect(block).toMatch(/\.motion-toggle \{[^}]*border-radius: 50%/);
    expect(block).toMatch(/\.motion-toggle \{[^}]*justify-content: center/);
  });

  it('bajo 640px el texto no se ve pero sigue en el arbol accesible', () => {
    const block = compactBlock();
    const rule = /\.motion-toggle-label \{([^}]*)\}/.exec(block)?.[1] ?? '';
    expect(rule).toMatch(/position: absolute/);
    expect(rule).toMatch(/clip: rect\(0 0 0 0\)/);
    expect(rule).not.toMatch(/display: none/);
  });

  it('desde 640px conserva la pildora con texto', () => {
    const rule = css.slice(css.indexOf('.motion-toggle {'), css.indexOf('}', css.indexOf('.motion-toggle {')));
    expect(rule).toMatch(/padding: 0 18px 0 14px/);
    expect(rule).toMatch(/border-radius: var\(--radius-pill\)/);
    expect(rule).not.toMatch(/width: 44px/);
  });

  it('sigue oculto con movimiento reducido', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/\.motion-toggle \{ display: none; \}/);
  });

  it('el foco por teclado no se anula en el boton', () => {
    expect(css).not.toMatch(/\.motion-toggle[^{]*:focus[^{]*\{[^}]*outline: (none|0)/);
  });

  it('el boton nace con nombre accesible y el cliente lo actualiza al pausar y reanudar', () => {
    expect(component).toMatch(/aria-label=\{pauseLabel\}/);
    expect(component).toMatch(/class="motion-toggle-label"/);
    expect(client).toMatch(/setAttribute\('aria-label'/);
  });
});
