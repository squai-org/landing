/**
 * Auditoría de accesibilidad con axe-core sobre el build de dist/.
 *
 *   pnpm build
 *   node docs/scripts/serve-dist.mjs &
 *
 *   mkdir -p .audit && (cd .audit && npm init -y && npm i axe-core playwright-core)
 *   AUDIT_MODULES=.audit/node_modules node docs/scripts/audit.mjs
 *
 * Contexto en docs/auditoria-seguridad-performance-accesibilidad.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Las dependencias de auditoría no forman parte del proyecto: se instalan
// aparte para no ensuciar package.json. AUDIT_MODULES apunta a ese node_modules.
const MODULES = path.resolve(process.env.AUDIT_MODULES ?? 'node_modules');
const require = createRequire(path.join(MODULES, 'noop.js'));

const { chromium } = require('playwright-core');
const AXE = fs.readFileSync(path.join(MODULES, 'axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE ?? 'http://127.0.0.1:8799';
const PAGES = ['/', '/servicios/squai-one', '/politica-de-privacidad', '/terminos-de-servicio'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

// Chromium viene preinstalado en el contenedor; playwright-core no lo descarga.
const EXECUTABLE = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const browser = await chromium.launch({ args: ['--no-sandbox'], executablePath: EXECUTABLE });

// `reducedMotion: 'reduce'` activa la media query de global.css que deja
// `.reveal` en opacity:1. Sin esto, 27 de 31 secciones están a opacity:0 al
// cargar y axe las ignora por invisibles, devolviendo un falso "0 errores".
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

let total = 0;

for (const route of PAGES) {
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: 'networkidle' });

  // El modal de contacto arranca oculto: axe no audita lo que no se renderiza.
  await page.evaluate(() => {
    const modal = document.querySelector('[data-modal]');
    if (modal) {
      modal.removeAttribute('hidden');
      modal.style.display = 'flex';
    }
  });

  await page.addScriptTag({ content: AXE });
  const res = await page.evaluate(
    (tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }),
    TAGS
  );

  total += res.violations.length;
  console.log(`\n## ${route} — ${res.violations.length} violaciones, ${res.incomplete.length} incompletas`);

  for (const v of res.violations) {
    console.log(`\n[${v.impact}] ${v.id} :: ${v.help}`);
    console.log(`  ${v.helpUrl}`);
    for (const node of v.nodes) {
      console.log(`   ${JSON.stringify(node.target)}`);
      console.log(`   ${node.failureSummary?.replace(/\n/g, '\n   ')}`);
    }
  }

  // Las formas decorativas impiden que axe resuelva el fondo, así que casi
  // todo el contraste cae aquí. Un informe que solo mire `violations` miente.
  const contrast = res.incomplete.filter((v) => v.id === 'color-contrast');
  if (contrast.length) {
    const nodes = contrast.reduce((n, v) => n + v.nodes.length, 0);
    console.log(`\n   aviso: ${nodes} elementos con contraste indeterminable — revisar a mano`);
  }

  await page.close();
}

await browser.close();
console.log(`\nTotal: ${total} violaciones`);
process.exit(total > 0 ? 1 : 0);
