/**
 * Cuenta los reflujos forzados de la home, que es lo que PageSpeed reporta
 * bajo "Forced reflow".
 *
 *   pnpm build
 *   node docs/scripts/serve-dist.mjs &
 *   AUDIT_MODULES=.audit/node_modules node docs/scripts/reflow.mjs
 *
 * Un reflujo forzado ocurre cuando el JavaScript pide una propiedad geometrica
 * despues de haber invalidado el estilo: el navegador no puede posponer el
 * calculo del layout y lo hace de forma sincrona, dentro del script.
 * https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Reflow
 *
 * Como se detectan: en el trace de Chrome, un evento `Layout` solo lleva
 * `args.beginData.stackTrace` cuando lo pidio el script. Hace falta la
 * categoria `disabled-by-default-devtools.timeline.stack` para que esa pila se
 * registre; sin ella el contador sale siempre en cero y parece que no hay nada.
 */
import path from 'node:path';
import { createRequire } from 'node:module';

const MODULES = path.resolve(process.env.AUDIT_MODULES ?? 'node_modules');
const { chromium } = createRequire(path.join(MODULES, 'noop.js'))('playwright-core');

const BASE = process.env.BASE ?? 'http://127.0.0.1:8799';
const RUNS = Number(process.env.RUNS ?? 7);
const EXECUTABLE = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const CATEGORIES = [
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.stack',
].join(',');

const browser = await chromium.launch({ args: ['--no-sandbox'], executablePath: EXECUTABLE });
const runs = [];

for (let i = 0; i < RUNS; i++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const events = [];
  cdp.on('Tracing.dataCollected', ({ value }) => events.push(...value));
  await cdp.send('Tracing.start', { categories: CATEGORIES, transferMode: 'ReportEvents' });

  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  // Recorrer la pagina: es cuando se disparan los manejadores de scroll.
  await page.evaluate(async () => {
    for (let y = 0; y < 4000; y += 120) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(r));
    }
  });
  await page.waitForTimeout(400);

  const complete = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end');
  await complete;

  const forced = events.filter((e) => e.name === 'Layout' && e.args?.beginData?.stackTrace?.length);
  const ms = forced.reduce((total, e) => total + (e.dur ?? 0), 0) / 1000;

  const byOrigin = {};
  for (const e of forced) {
    const frame = e.args.beginData.stackTrace[0];
    const key = `${(frame.url || '[sin url]').split('/').pop().slice(0, 48)}:${frame.columnNumber}`;
    byOrigin[key] = (byOrigin[key] ?? 0) + (e.dur ?? 0) / 1000;
  }

  runs.push({ count: forced.length, ms: +ms.toFixed(1), byOrigin });
  await ctx.close();
}

await browser.close();

const median = (key) => {
  const values = runs.map((r) => r[key]).sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
};

console.log(`n=${RUNS}  mediana: ${median('count')} reflujos forzados, ${median('ms')} ms`);
console.log('por ejecucion:', runs.map((r) => `${r.count}/${r.ms}ms`).join('  '));

const worst = [...runs].sort((a, b) => b.ms - a.ms)[0];
if (worst.count) {
  console.log('origenes (peor ejecucion):');
  Object.entries(worst.byOrigin)
    .sort((a, b) => b[1] - a[1])
    .forEach(([where, ms]) => console.log(`   ${ms.toFixed(1)} ms  ${where}`));
}

process.exit(median('count') > 0 ? 1 : 0);
