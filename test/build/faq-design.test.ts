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

  it('los tokens de la pregunta viven solo en global.css con las medidas del diseno', () => {
    const global = read('src/styles/global.css');

    expect(faqCss).not.toMatch(/--faq-(r|py|px):/);
    expect(global).toContain('--faq-r: calc(var(--u) * 16)');
    expect(global).toContain('--faq-py: calc(var(--u) * 23)');
    expect(global).toContain('--faq-px: calc(var(--u) * 20)');
    expect(global).toMatch(/--faq-r: calc\(var\(--u\) \* 24\);[\s\S]*--faq-py: calc\(var\(--u\) \* 28\.8\);[\s\S]*--faq-px: calc\(var\(--u\) \* 32\)/);
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
    expect(section).toMatch(/padding: 0 var\(--gutter\) var\(--edge-r\)/);
  });

  it('recorta el fondo sin overflow: hidden, que anularia el sticky', () => {
    const section = rule(audienceCss, '.one-fit');

    expect(section).not.toMatch(/overflow: hidden/);
    expect(section).toMatch(/overflow: clip/);
  });

  it('el contenido queda fijo a pantalla completa y conserva el aire de seccion', () => {
    const content = rule(audienceCss, '.one-fit-content');

    expect(content).toMatch(/position: sticky/);
    expect(content).toMatch(/top: 0/);
    expect(content).toMatch(/min-height: 100svh/);
    expect(content).toMatch(/padding-block: var\(--section-py\)/);
  });

  it('bajo 1024 px el aire vertical se ajusta al alto para que la vista fija quepa a 360x640, sin tocar la tipografia', () => {
    const compact = audienceCss.slice(audienceCss.indexOf('@media (max-width: 1023px)'));

    expect(compact).toMatch(/\.one-fit-content \{ padding-block: min\(var\(--section-py\), 5svh\); \}/);
    expect(compact).toMatch(/\.one-fit-heading \{ margin-bottom: min\(calc\(var\(--u\) \* 64\), 4svh\); \}/);
    expect(compact).toMatch(/\.one-fit-bottom \{ margin-top: min\(calc\(var\(--u\) \* 64\), 4svh\); \}/);
    expect(compact).not.toMatch(/font-size/);
  });

  it('con el navbar visible en movil y tablet, el contenido fijo empieza debajo de el y aprieta su aire para seguir cabiendo', () => {
    const tall = audienceCss.slice(audienceCss.indexOf('@media (max-width: 1023px) and (min-height: 560px)'));
    const visible = ":global(html:has(.site-header[data-hidden='false']))";

    expect(tall).toContain(`${visible} .one-fit-content { padding-block: calc(var(--header-pt) + var(--pill-h) + 12px) 2svh; }`);
    expect(tall).toContain(`${visible} .one-fit-heading { margin-bottom: min(calc(var(--u) * 64), 2.5svh); }`);
    expect(tall).toContain(`${visible} .one-fit-bottom { margin-top: min(calc(var(--u) * 64), 2.5svh); }`);
  });

  it('el ajuste por el navbar acompana su transicion y se quita con movimiento reducido', () => {
    const tall = audienceCss.slice(audienceCss.indexOf('@media (max-width: 1023px) and (min-height: 560px)'));
    const reduced = audienceCss.slice(audienceCss.indexOf('@media (prefers-reduced-motion: reduce)'));

    expect(tall).toMatch(/\.one-fit-content, \.one-fit-heading, \.one-fit-bottom \{ transition: padding \.3s var\(--ease-smooth\), margin \.3s var\(--ease-smooth\); \}/);
    expect(reduced).toMatch(/\.one-fit-content, \.one-fit-heading, \.one-fit-bottom \{ transition: none; \}/);
  });

  it('en pantallas de menos de 560px de alto deja de ser fija y vuelve al flujo normal sin tramo de scroll', () => {
    const short = audienceCss.slice(audienceCss.indexOf('@media (max-height: 559px)'));

    expect(short).toMatch(/^@media \(max-height: 559px\)/);
    expect(rule(short, '.one-fit-content')).toMatch(/position: relative/);
    expect(rule(short, '.one-fit-content')).toMatch(/min-height: 0/);
    expect(rule(short, '.one-fit-runway')).toMatch(/display: none/);
  });

  it('el tramo de scroll da 70svh por perfil', () => {
    expect(rule(audienceCss, '.one-fit')).toMatch(/--fit-step: 70svh/);
    expect(rule(audienceCss, '.one-fit-runway')).toMatch(/height: calc\(var\(--fit-profiles\) \* var\(--fit-step\)\)/);
    expect(audience).toMatch(/<div class="one-fit-runway" aria-hidden="true" data-fit-runway style=\{`--fit-profiles: \$\{fit\.profiles\.length\}`\}><\/div>/);
  });

  it('el scroll y el click se resuelven con el modulo puro del tramo', () => {
    expect(audience).toContain("import { profileAt, scrollDrivesProfile, scrollTopFor } from '../lib/fit-scroll'");
    expect(audience).toMatch(/behavior: reduced \? 'instant' : 'smooth'/);
  });

  it('el empuje al segundo vecino aplica tambien bajo 992 px', () => {
    const beforeDesktop = audienceCss.slice(0, audienceCss.indexOf('@media (min-width: 768px)'));

    expect(beforeDesktop).toMatch(/\.one-fit-item:hover \+ \.one-fit-item \+ \.one-fit-item \.one-fit-button \{ transform: translateY\(0\.6rem\)/);
    expect(beforeDesktop).toMatch(/\+ \.one-fit-item:hover\) \.one-fit-button \{ transform: translateY\(-0\.6rem\)/);
  });
});
