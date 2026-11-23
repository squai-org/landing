import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.join(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const rule = (css: string, selector: string) => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? '' : css.slice(start, css.indexOf('}', start));
};

const faq = read('src/components/Faq.astro');
const faqCss = faq.slice(faq.indexOf('<style>'));
const audience = read('src/components/AudienceFit.astro');
const audienceCss = audience.slice(audience.indexOf('<style>'));

describe('preguntas frecuentes como landing-design', () => {
  it('la seccion se apila sobre la anterior y cierra con la esquina curva', () => {
    const section = rule(faqCss, '.faq-one');

    expect(section).toMatch(/z-index: 20/);
    expect(section).toMatch(/border-radius: 0 0 var\(--edge-r\) var\(--edge-r\)/);
    expect(section).toMatch(/padding: var\(--section-py\) var\(--gutter\)/);
  });

  it('define los tokens de la pregunta con las medidas del diseno', () => {
    const tokens = rule(faqCss, '.faq-one');

    expect(tokens).toContain('--faq-r: calc(var(--u) * 16)');
    expect(tokens).toContain('--faq-py: calc(var(--u) * 23)');
    expect(tokens).toContain('--faq-px: calc(var(--u) * 20)');
    expect(faqCss).toMatch(/--faq-r: calc\(var\(--u\) \* 24\);[\s\S]*--faq-py: calc\(var\(--u\) \* 28\.8\);[\s\S]*--faq-px: calc\(var\(--u\) \* 32\)/);
  });

  it('el item usa --faq-r y el signo gira 45 grados en 0.3 s', () => {
    expect(rule(faqCss, '.faq-item.is-one')).toContain('border-radius: var(--faq-r)');
    expect(rule(faqCss, ".faq-toggle[aria-expanded='true'] .faq-sign")).toContain('rotate: 45deg');
    expect(rule(faqCss, '.faq-sign')).toContain('transition: rotate 0.3s');
  });

  it('anima altura y grupos con las ayudas de motion.ts', () => {
    const script = faq.slice(faq.indexOf('<script>'), faq.indexOf('</script>'));

    expect(script).toContain('tweens.faqPanel');
    expect(script).toContain('tweens.faqItem');
    expect(script).toContain('prefersReducedMotion');
    expect(script).not.toMatch(/textContent = /);
  });

  it('el Layout ya no maneja las preguntas', () => {
    expect(read('src/layouts/Layout.astro')).not.toContain('data-faq-toggle');
  });

  it('usa la escala --u de la pagina y no las clases d-h*', () => {
    const markup = faq.slice(0, faq.indexOf('<style>'));

    expect(markup).toContain('one-u');
    expect(markup).toContain('one-h2');
    expect(markup).toContain('one-h3');
    expect(markup).toContain('one-lead');
  });
});

describe('Es para ti como landing-design', () => {
  it('se solapa con la seccion anterior y reserva la esquina de abajo', () => {
    const section = rule(audienceCss, '.one-fit');

    expect(section).toMatch(/border-radius: var\(--edge-r\) var\(--edge-r\) 0 0/);
    expect(section).toMatch(/margin-top: calc\(var\(--edge-r\) \* -1\)/);
    expect(section).toMatch(/padding: var\(--section-py\) var\(--gutter\) calc\(var\(--section-py\) \+ var\(--edge-r\)\)/);
  });

  it('el empuje al segundo vecino aplica tambien bajo 992 px', () => {
    const beforeDesktop = audienceCss.slice(0, audienceCss.indexOf('@media (min-width: 768px)'));

    expect(beforeDesktop).toMatch(/\.one-fit-item:hover \+ \.one-fit-item \+ \.one-fit-item \.one-fit-button \{ transform: translateY\(0\.6rem\)/);
    expect(beforeDesktop).toMatch(/\+ \.one-fit-item:hover\) \.one-fit-button \{ transform: translateY\(-0\.6rem\)/);
  });
});
