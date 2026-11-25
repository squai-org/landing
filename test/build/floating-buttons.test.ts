import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { whatsappUrl } from '../../src/lib/whatsapp';

const root = path.join(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const copies = JSON.parse(read('src/content/copies.json')) as {
  site: {
    company: { phone: string };
    ui: {
      whatsapp: { panel: { title: string; subtitle: string; close: string; topics: { label: string; message: string }[] } };
      scrollTop: { label: string };
    };
  };
};
const { panel } = copies.site.ui.whatsapp;

describe('panel de WhatsApp: contenido', () => {
  it('tiene tres temas con mensaje propio', () => {
    expect(panel.topics).toHaveLength(3);
    for (const topic of panel.topics) {
      expect(topic.label.length).toBeGreaterThan(0);
      expect(topic.message.length).toBeGreaterThan(0);
    }
    expect(new Set(panel.topics.map((topic) => topic.message)).size).toBe(3);
  });

  it('cada tema apunta a wa.me/573143802400 con su mensaje precargado', () => {
    for (const topic of panel.topics) {
      expect(whatsappUrl(copies.site.company.phone, topic.message)).toBe(
        `https://wa.me/573143802400?text=${encodeURIComponent(topic.message)}`,
      );
    }
  });

  it('el contrato editorial admite el panel y el texto de volver arriba', () => {
    const schema = read('src/content/schema.ts');
    expect(schema).toMatch(/whatsapp: z\.object\(\{[^\n]*panel:/);
    expect(schema).toMatch(/scrollTop: /);
    const cms = read('.pages.yml');
    expect(cms).toContain('name: panel');
    expect(cms).toContain('name: scrollTop');
  });

  it('el texto de volver arriba existe', () => {
    expect(copies.site.ui.scrollTop.label).toBe('Volver arriba');
  });
});

describe('panel de WhatsApp: componente', () => {
  const source = read('src/components/WhatsAppButton.astro');

  it('replica medidas y color del diseño', () => {
    expect(source).toContain('#075E54');
    expect(source).toContain('310px');
    expect(source).toContain('340px');
    expect(source).toMatch(/border-radius: 24px/);
  });

  it('usa z-40 y no z-index 50', () => {
    expect(source).toMatch(/z-index: 40/);
    expect(source).not.toMatch(/z-index: 50/);
  });

  it('anima con el tween popover de motion.ts', () => {
    expect(source).toContain('tweens.popover');
    expect(source).toContain('animateIn');
    expect(source).toContain('animateOut');
  });

  it('es accesible: aria-expanded, Escape, clic fuera y diálogo', () => {
    expect(source).toContain('aria-expanded');
    expect(source).toContain('aria-controls');
    expect(source).toContain('role="dialog"');
    expect(source).toContain("'Escape'");
    expect(source).toMatch(/contains\(/);
  });

  it('sigue ocultándose con un formulario visible', () => {
    expect(source).toContain('data-away');
    expect(source).toContain('IntersectionObserver');
  });

  it('no deja comentarios de código', () => {
    expect(source).not.toMatch(/\/\*|\n\s*\/\/|<!--/);
  });
});

describe('volver arriba', () => {
  const source = read('src/components/ScrollTopButton.astro');

  it('es un círculo canvas de 48 px abajo a la izquierda desde md', () => {
    expect(source).toMatch(/width: 48px/);
    expect(source).toMatch(/height: 48px/);
    expect(source).toMatch(/border-radius: 50%/);
    expect(source).not.toMatch(/position: fixed/);
    expect(source).toContain('background: var(--canvas);');
    expect(source).not.toContain('var(--surface)');
    expect(source).toMatch(/@media \(min-width: 768px\)/);
  });

  it('aparece tras 520 px con opacity 0, y 12 y scale .9', () => {
    expect(source).toContain('scrollY > 520');
    expect(source).toMatch(/opacity: 0, y: 12, scale: 0\.9/);
    expect(source).toContain('gestures.scrollTop');
  });

  it('lleva la etiqueta del contenido y vuelve arriba con desplazamiento suave', () => {
    expect(source).toContain('ui.scrollTop.label');
    expect(source).toMatch(/scrollTo\(\{ top: 0, behavior/);
  });

  it('no deja comentarios de código', () => {
    expect(source).not.toMatch(/\/\*|\n\s*\/\/|<!--/);
  });

  it('el layout lo monta', () => {
    expect(read('src/layouts/Layout.astro')).toContain('<ScrollTopButton');
  });
});

describe('esquina inferior izquierda', () => {
  const css = read('src/styles/motion.css');
  const layout = read('src/layouts/Layout.astro');
  const client = read('src/lib/motion-client.ts');

  it('Pausar animaciones va primero y volver arriba despues, dentro de un mismo contenedor fijo', () => {
    const dock = layout.indexOf('class="float-dock"');
    const toggle = layout.indexOf('<MotionToggle');
    const top = layout.indexOf('<ScrollTopButton');

    expect(dock).toBeGreaterThan(-1);
    expect(toggle).toBeGreaterThan(dock);
    expect(top).toBeGreaterThan(toggle);
    expect(layout.indexOf('</div>', top)).toBeGreaterThan(top);
    expect(css).toMatch(/\.float-dock \{[^}]*position: fixed/);
    expect(css).toMatch(/\.float-dock \{[^}]*left: 12px/);
    expect(css).toMatch(/@media \(min-width: 768px\) \{\s*\.float-dock \{[^}]*left: 20px/);
  });

  it('el boton de pausa ya no se posiciona por su cuenta', () => {
    const rule = css.slice(css.indexOf('.motion-toggle {'), css.indexOf('}', css.indexOf('.motion-toggle {')));
    expect(rule).not.toMatch(/position: fixed|left:|bottom:/);
    expect(css).not.toMatch(/left: 80px/);
  });

  it('el boton de pausa se activa en toda pagina, sin depender de los elementos ambientales', () => {
    expect(client).toMatch(/^  bindPauseToggle\(\);/m);
  });
});
