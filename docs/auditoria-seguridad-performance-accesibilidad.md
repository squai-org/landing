# Auditoría de seguridad, performance y accesibilidad

Documento de trabajo para resolver los hallazgos de los informes externos de
`squai.io`. Cada hallazgo se acompaña de: **evidencia** (medida o citada),
**causa en este repositorio** (archivo y línea) y **solución** respaldada por
documentación oficial enlazada.

---

## 0. Alcance y método

### 0.1 Qué se pudo verificar y qué no

El entorno donde se hizo esta auditoría **no tiene salida de red hacia
`squai.io`** (el proxy de egreso devuelve `403 host_not_allowed`), así que no
fue posible releer los informes en vivo ni re-ejecutar los escáneres contra el
dominio. Se trabajó de dos formas complementarias:

1. **Los informes aportados** (capturas de Security Headers, MDN HTTP
   Observatory, Qualys SSL Labs, PageSpeed Insights y WAVE) se usan como
   *fuente de los síntomas*.
2. **La auditoría de la causa se rehízo localmente contra el artefacto que se
   despliega**: se compiló el sitio (`pnpm build`) y se analizó `dist/` con
   Chromium y axe-core. Esto es lo que sustituye al acceso en vivo y es
   reproducible por cualquiera.

Donde una conclusión no se pudo confirmar, se marca explícitamente como
**pendiente de verificar** en lugar de darla por cierta.

### 0.2 Cómo reproducir la auditoría local

```bash
pnpm install
pnpm build

# Servidor estático que replica el routing de Astro (trailingSlash: 'never'
# + build.format: 'file', es decir /ruta -> dist/ruta.html). Ver §7.1.
node docs/scripts/serve-dist.mjs &

# Las dependencias de auditoría se instalan aisladas para no tocar
# package.json ni el lockfile del proyecto.
mkdir -p .audit
cd .audit
printf '{ "name": "squai-audit", "version": "0.0.0", "private": true }' > package.json
printf 'package-lock=true\nworkspaces=false\n' > .npmrc
npm i axe-core playwright-core
cd ..

AUDIT_MODULES=.audit/node_modules node docs/scripts/audit.mjs   # ver §7.2
```

Dos detalles que hacen falta para que esto funcione:

- `npm` falla con `Cannot read properties of null (reading 'matches')` si se
  ejecuta directamente sobre la raíz del repo, porque este proyecto usa pnpm.
  De ahí el `package.json` y el `.npmrc` propios dentro de `.audit/`.
- Chromium ya viene instalado en el contenedor
  (`/opt/pw-browsers/chromium-1194/`), por eso se usa `playwright-core` y no
  `playwright` completo, y el script apunta al ejecutable con
  `executablePath`. Fuera de este contenedor, sobreescribir con
  `CHROMIUM=/ruta/al/chrome`.

Salida esperada con el código actual:

```
## / — 0 violaciones, 2 incompletas
## /servicios/squai-one — 1 violaciones, 2 incompletas
[serious] color-contrast :: .waitlist-promise — contraste 2.66, se exige 4.5
## /politica-de-privacidad — 0 violaciones, 1 incompletas
## /terminos-de-servicio — 0 violaciones, 1 incompletas
Total: 1 violaciones
```

Herramientas de referencia:

- [axe-core](https://github.com/dequelabs/axe-core) — motor de reglas de
  accesibilidad que usan Lighthouse y las extensiones de Deque.
- [Documentación de reglas de axe](https://dequeuniversity.com/rules/axe/4.13/)
- [WebAIM WAVE](https://wave.webaim.org/) — el motor del informe aportado.

---

## 1. Seguridad — cabeceras HTTP

### 1.1 Diagnóstico

Los dos informes coinciden:

| Informe | Resultado | Cabeceras ausentes |
|---|---|---|
| Security Headers | **F** | `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| MDN HTTP Observatory | **D−, 25/100** (7/12 tests) | CSP (−25), HSTS (−20), XFO (−20), SRI (−5), X-Content-Type-Options (−5) |

### 1.2 Causa exacta en este repositorio

El proyecto **sí** tiene middleware de cabeceras de seguridad, pero solo se
aplica a la API:

`src/server/middleware/security-headers.ts`

```ts
export const securityHeaders = (): MiddlewareHandler<AppBindings> => async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'same-origin');
};
```

Y en `src/server/index.ts` solo se monta bajo `/api`:

```ts
api.use('*', securityHeaders());
...
app.route('/api', api);
```

Mientras tanto, `wrangler.jsonc` declara:

```jsonc
"assets": {
  "directory": "./dist",
  "run_worker_first": ["/api/*"]
}
```

Es decir: **el HTML y los assets los sirve directamente la capa de static
assets de Cloudflare, sin pasar por el Worker**, por lo que ninguna de esas
cabeceras llega a las páginas que escanean Security Headers y Observatory. El
middleware no está mal; está aplicado a un ámbito que los escáneres no miden.

### 1.3 Solución: archivo `_headers`

Cloudflare Workers permite sobrescribir las cabeceras de los assets estáticos
con un archivo de texto plano llamado `_headers`, sin extensión, ubicado en el
directorio de assets. El archivo no se sirve como asset: Workers lo interpreta
y aplica sus reglas a las respuestas de assets estáticos.

> Referencia: [Headers — Cloudflare Workers docs](https://developers.cloudflare.com/workers/static-assets/headers/)
> y el equivalente de Pages, [Headers — Cloudflare Pages docs](https://developers.cloudflare.com/pages/configuration/headers/).

En un proyecto con framework, el archivo se escribe en el directorio que se
copia tal cual al build. En este repo eso es **`public/_headers`**, que Astro
copia a `dist/_headers`.

> Referencia: [Static assets — Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/)

**Límite importante:** las cabeceras de `_headers` aplican **solo a assets
estáticos**, no a las respuestas que genera el código del Worker. Por eso
`src/server/middleware/security-headers.ts` debe seguir existiendo para
`/api/*`; no lo reemplaza, lo complementa.

#### Contenido propuesto para `public/_headers`

```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), usb=(), xr-spatial-tracking=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable
```

#### Justificación de cada cabecera

**`Strict-Transport-Security`** — Obliga al navegador a usar HTTPS para el
dominio durante el `max-age` indicado.

- [Strict-Transport-Security — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security)
- Observatory recomienda explícitamente empezar con periodos cortos antes de
  subir a un año, tal como sugiere [hstspreload.org](https://hstspreload.org/).
- Para entrar en la lista de precarga hacen falta `max-age` ≥ 31536000,
  `includeSubDomains` y `preload`. **Recomendación: no añadir `preload`
  todavía.** La precarga es difícil de revertir y obliga a que *todos* los
  subdominios sirvan HTTPS válido. Primero confirmar que ningún subdominio
  interno se rompe, y recién entonces añadir `preload` y enviar el dominio.
- Alternativa sin tocar código: Cloudflare puede emitir HSTS desde el
  dashboard (SSL/TLS → Edge Certificates → HSTS). Si se activa allí, **no**
  duplicar la cabecera en `_headers`.

**`X-Content-Type-Options: nosniff`** — Impide que el navegador adivine el tipo
MIME y lo fuerza a respetar el `Content-Type` declarado. Es el único valor
válido.
[X-Content-Type-Options — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options)

**`X-Frame-Options` + `frame-ancestors`** — Defensa contra clickjacking. La
especificación de CSP declara que `frame-ancestors` **obsoleta**
`X-Frame-Options`: cuando ambas están presentes, los navegadores con CSP nivel 2
aplican solo `frame-ancestors`. `X-Frame-Options` se mantiene únicamente como
respaldo para navegadores muy antiguos. Observatory pide justamente
`frame-ancestors`, no XFO.

- [Clickjacking — MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Clickjacking)
- [Clickjacking Defense Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)

El sitio no se embebe en ningún iframe propio, así que `DENY` /
`frame-ancestors 'none'` es correcto.

**`Referrer-Policy: strict-origin-when-cross-origin`** — Es el valor que
Observatory pide "como mínimo". Envía la URL completa en navegación
same-origin, solo el origen hacia otros orígenes en HTTPS, y nada al degradar a
HTTP.
[Referrer-Policy — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)

Nota: el middleware de la API usa `same-origin`, que es *más* restrictivo y
correcto para endpoints de API. No hace falta unificarlos.

**`Permissions-Policy`** — Una política es una directiva, `=`, y una lista de
orígenes entre paréntesis. `()` (lista vacía) desactiva la función en todos los
contextos de navegación, incluidos los `<iframe>`, sin importar su origen. El
sitio no usa cámara, micrófono, geolocalización ni pagos, así que la lista
vacía es la opción segura.
[Permissions-Policy — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy)

**`Cross-Origin-Opener-Policy: same-origin`** y
**`Cross-Origin-Resource-Policy: same-origin`** — Observatory los marca como
recomendados (`COOP` → `same-origin`, `CORP` → deja `cross-origin` por defecto
si no se declara).

- [Cross-Origin-Opener-Policy — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy)
- [Cross-Origin-Resource-Policy — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Resource-Policy)

**Cuidado con `CORP: same-origin`:** bloquea que otros sitios incrusten
recursos de `squai.io`. Si en algún momento se quiere que el logo o una imagen
OG se carguen desde otro dominio, hay que relajarlo a `cross-origin` para esas
rutas. Las imágenes de Open Graph las descargan los crawlers por HTTP directo,
no como subrecurso, así que no se ven afectadas.

**No se propone `Cross-Origin-Embedder-Policy`.** Observatory lo puntúa con 0
(no penaliza su ausencia) y `require-corp` rompe la carga de recursos de
terceros como el widget de Turnstile. El coste supera al beneficio aquí.

---

## 2. Seguridad — Content Security Policy

Es el hallazgo de mayor peso: **−25 puntos** en Observatory y la mayor parte de
la F en Security Headers.

### 2.1 Punto de partida medido

Sobre `dist/index.html` del build actual:

- **6 elementos `<script>` en línea** (sin `src`).
- **0 elementos `<style>` en línea** (Astro extrae todo el CSS a
  `/_astro/*.css`).
- Orígenes externos referenciados en el HTML: `mcp.figma.com`, `www.linkedin.com`,
  `www.youtube.com`, `schema.org` (este último solo como identificador de
  vocabulario en JSON-LD, no se carga).
- En producción se añade `challenges.cloudflare.com` (Turnstile), que en el
  build local no aparece porque `PUBLIC_TURNSTILE_SITE_KEY` no está definida
  (`src/layouts/Layout.astro`).

Los 6 scripts en línea son la razón por la que no se puede activar una CSP
estricta de un día para otro: una política sin `'unsafe-inline'` ni hashes los
bloquearía y rompería la navegación, el modal y Turnstile.

### 2.2 Astro genera los hashes por sí solo

Astro 7 (este repo usa **7.2.10**) incluye soporte de CSP bajo
`security.csp`. Genera un `<meta http-equiv="Content-Security-Policy">` con los
hashes de todos los scripts y estilos de la página, incluidos los que se cargan
dinámicamente.

- [Content Security Policy — Astro Docs](https://docs.astro.build/en/reference/experimental-flags/csp/)
- [Astro 5.9 — anuncio de la función](https://astro.build/blog/astro-590/)

```js
// astro.config.mjs
export default defineConfig({
  // ...
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ],
      scriptDirective: {
        resources: ["'self'", 'https://challenges.cloudflare.com'],
      },
      styleDirective: {
        resources: ["'self'"],
      },
    },
  },
});
```

Astro controla `script-src` y `style-src` (ahí inyecta los hashes); el resto de
directivas se declaran en `csp.directives`.

### 2.3 Limitación del `<meta>`: `frame-ancestors` se ignora

Una política entregada por `<meta>` **no** puede usar `frame-ancestors`,
`report-uri` ni `sandbox`: la especificación obliga a descartar esas directivas
al parsear una política entregada por meta, y no existe modo *report-only* en
`<meta>`.

> La especificación lo fija en [CSP Level 2 §3.3, W3C](https://www.w3.org/TR/CSP2/)
> y lo resume el [Content Security Policy Cheat Sheet de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).

Esto tiene dos consecuencias prácticas:

1. `frame-ancestors` **tiene que ir en la cabecera HTTP**, es decir en
   `public/_headers`. Si se escribe en el meta, el navegador lo descarta en
   silencio: no hay error en consola y la página sigue siendo embebible.
2. Security Headers y Observatory puntúan la **cabecera**. Una CSP entregada
   solo por `<meta>` puede no sumar en la nota aunque sí proteja al usuario.

### 2.4 Plan de despliegue en tres fases

Activar una CSP estricta de golpe es la forma más rápida de romper el sitio en
producción. El despliegue recomendado:

**Fase 1 — Observar sin bloquear.** Añadir a `public/_headers` una política en
modo informe. `Content-Security-Policy-Report-Only` **sí** funciona como
cabecera HTTP (solo está prohibido en `<meta>`):

```
/*
  Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```

Con esto el navegador reporta en consola todo lo que *habría* bloqueado, sin
bloquear nada. Es el mecanismo que documenta
[Content-Security-Policy-Report-Only — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only).
Navegar el sitio completo (home, cada servicio, abrir el modal, enviar los dos
formularios, páginas legales) y anotar cada violación.

**Fase 2 — Eliminar los scripts en línea.** Es lo que permite pasar a una
política estricta sin `'unsafe-inline'`. En `src/layouts/Layout.astro` hay tres
bloques `is:inline`:

- El de captura de Figma (`https://mcp.figma.com/mcp/html-to-design/capture.js`).
  **Recomendación: eliminarlo del build de producción.** Es una herramienta de
  diseño, y tal como está, cualquiera que abra `https://squai.io/#figmacapture`
  provoca la carga y ejecución de un script de un tercero. Es superficie de
  ataque sin contrapartida para el visitante.
- El callback `window.squaiTurnstileSync`. Puede vivir en un `<script>` normal
  (sin `is:inline`): Astro lo empaqueta como módulo externo y la asignación a
  `window` sigue funcionando.
- El bloque `<style is:global>` de `html[data-figma-capture]` desaparece junto
  con el primero.

Queda el JSON-LD de `src/components/Seo.astro`
(`<script type="application/ld+json">`). Los hashes de Astro lo cubren; si se
quisiera una política puramente externa habría que moverlo a un endpoint, lo
cual perjudica al SEO. **Mantenerlo y cubrirlo con hash es la opción correcta.**

**Fase 3 — Hacer cumplir.** Cuando Report-Only no reporte violaciones durante
un ciclo de despliegue, cambiar el nombre de la cabecera a
`Content-Security-Policy`.

### 2.5 Verificación de las directivas propuestas

| Directiva | Por qué | Referencia |
|---|---|---|
| `default-src 'self'` | Base restrictiva; todo lo no declarado cae aquí | [MDN default-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/default-src) |
| `object-src 'none'` | Desactiva plugins embebidos; el sitio no usa ninguno | [MDN object-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/object-src) |
| `base-uri 'self'` | Impide que un `<base>` inyectado reescriba las URLs relativas | [MDN base-uri](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/base-uri) |
| `form-action 'self'` | Los dos formularios envían a `/api/*`, mismo origen | [MDN form-action](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/form-action) |
| `frame-ancestors 'none'` | Anti-clickjacking; solo válido en cabecera | [MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors) |
| `frame-src https://challenges.cloudflare.com` | Turnstile se renderiza dentro de un iframe | [Turnstile — Cloudflare](https://developers.cloudflare.com/turnstile/) |
| `img-src 'self' data:` | Hay SVG y WebP locales; `data:` cubre inlines de build | [MDN img-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/img-src) |

`connect-src 'self'` es suficiente porque las llamadas van a `/api/waitlist` y
`/api/contact`, del mismo origen (`src/config/endpoints.ts`).

---

## 3. Seguridad — Subresource Integrity (SRI)

Observatory descuenta **−5**: *"Subresource Integrity (SRI) not implemented,
but all external scripts are loaded over HTTPS"*.

### 3.1 Esta penalización no se puede eliminar del todo

El único script externo del sitio en producción es
`https://challenges.cloudflare.com/turnstile/v0/api.js`. **No admite SRI**, por
dos motivos independientes y ambos documentados:

1. El host no envía la cabecera CORS que SRI exige para un recurso de otro
   origen.
   [Subresource integrity/CORS for Turnstile JavaScript link — Cloudflare Community](https://community.cloudflare.com/t/subresource-integrity-cors-for-turnstile-javascript-link/440769)
2. Es un script que cambia por diseño. SRI requiere que el contenido de la URL
   no cambie nunca; añadir `integrity` a un script dinámico lo rompe en cuanto
   el proveedor publica una actualización — el mismo motivo por el que no se
   pone SRI a Google Analytics o Stripe.js.
   [Subresource Integrity — MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)

**Conclusión honesta: esos −5 puntos se quedan mientras se use Turnstile.** La
mitigación real es la de §2: restringir `script-src` a `'self'` y
`https://challenges.cloudflare.com`, de modo que aunque el CDN sirviera algo
inesperado, ningún otro origen pueda inyectar scripts.

### 3.2 Dónde sí aplicar SRI

Si en el futuro se añade cualquier script o hoja de estilo de un CDN con
versión fijada (por ejemplo `cdn.jsdelivr.net/npm/paquete@1.2.3/dist/x.js`),
ahí SRI **sí** corresponde y es de una línea:

```html
<script src="https://cdn.example.com/lib@1.2.3/lib.js"
        integrity="sha384-..." crossorigin="anonymous"></script>
```

Hoy el sitio no tiene ninguno: el resto del JS y el CSS son locales y
versionados por hash de contenido en `/_astro/`.

---

## 4. Seguridad — TLS (Qualys SSL Labs: B)

### 4.1 Diagnóstico

El informe muestra **B en las cuatro direcciones IP** (dos IPv6 y dos IPv4) del
mismo edge de Cloudflare. Que las cuatro coincidan indica una configuración de
zona, no un problema de un servidor concreto.

### 4.2 Causa documentada

Qualys cambió la calificación en 2020: **un servidor que soporta TLS 1.0 o
TLS 1.1 queda topado en B**, por bien configurado que esté lo demás.

- [Grade change for TLS 1.0 and TLS 1.1 protocols — Qualys blog](https://blog.qualys.com/product-tech/2018/11/19/grade-change-for-tls-1-0-and-tls-1-1-protocols)
- [Key Changes in SSL Labs Grading — Qualys](https://notifications.qualys.com/product/2025/02/26/key-changes-in-ssl-labs-grading-and-qualys-certview)

La configuración por defecto de Cloudflare acepta TLS 1.0 en adelante, lo que
produce exactamente esa B.
[This server supports TLS 1.0 and TLS 1.1 — Cloudflare Community](https://community.cloudflare.com/t/this-server-supports-tls-1-0-and-tls-1-1-grade-will-be-capped-to-b-from-january-2020/141156)

**Pendiente de verificar:** abrir el informe de SSL Labs, sección
*Configuration → Protocols*, y confirmar que `TLS 1.0` y/o `TLS 1.1` aparecen
como `Yes`. Si aparecen como `No`, la B viene de otra causa (cadena de
certificados, suites de cifrado) y hay que releer la sección que Qualys marque
en rojo. No se pudo comprobar desde este entorno.

### 4.3 Solución

Cloudflare dashboard → **SSL/TLS → Edge Certificates → Minimum TLS Version →
`TLS 1.2`**.

- [Minimum TLS Version — Cloudflare SSL docs](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/minimum-tls/)

Tras el cambio, volver a ejecutar el test usando el enlace **"Clear cache"** de
SSL Labs; si no, devuelve el resultado almacenado.

**Impacto en usuarios:** TLS 1.2 es de 2008 y está soportado por todo navegador
en uso. El cambio no afecta al tráfico real. Es la misma recomendación que
Cloudflare aplica por defecto a zonas nuevas.

Esto no requiere ningún cambio en el repositorio: es configuración de zona.

---

## 5. Performance

### 5.1 Diagnóstico de PageSpeed (móvil)

| Métrica | Valor | Estado |
|---|---|---|
| Performance | 78 | a mejorar |
| First Contentful Paint | 1.7 s | bien |
| **Largest Contentful Paint** | **5.0 s** | **falla** |
| Total Blocking Time | 0 ms | bien |
| Cumulative Layout Shift | 0.014 | bien |
| Speed Index | 4.5 s | a mejorar |

Accesibilidad, Best Practices y SEO están en 100. **El único problema real de
performance es el LCP**, y TBT en 0 ms indica que no es un problema de
JavaScript: es de entrega de recursos críticos.

### 5.2 Qué es exactamente el elemento LCP (medido)

Medido con `PerformanceObserver` sobre el build, en viewport móvil (390×844):

```
LCP element: span.hero-line.hero-line-last
LCP text:    "Habilidades."
LCP url:     ""   (sin URL -> es un nodo de texto, no una imagen)
```

**El LCP es texto del hero, no una imagen.** Esto cambia por completo el
diagnóstico: optimizar imágenes no mueve la aguja. Lo que gobierna el LCP es
cuándo puede pintarse ese texto, y eso depende del CSS bloqueante y de la
fuente `Familjen Grotesk`.

Es el caso que web.dev describe como *render delay*: cuando la fuente web no ha
cargado, el navegador retrasa el renderizado del texto, lo que puede retrasar
FCP y, en ciertas situaciones, LCP.

- [Optimize Largest Contentful Paint — web.dev](https://web.dev/articles/optimize-lcp)
- [Best practices for fonts — web.dev](https://web.dev/articles/font-best-practices)
- [How To Fix LCP For Text Elements And H1 Headings — DebugBear](https://www.debugbear.com/docs/largest-contentful-paint-text-h1)

### 5.3 Lo que ya está bien hecho

Conviene dejarlo escrito para no "arreglarlo" por error:

- `font-display: swap` en las seis declaraciones `@font-face`
  (`src/styles/global.css:10-64`). web.dev señala que con cualquier valor
  distinto de `auto` o `block` el texto siempre es visible durante la carga y
  el LCP no queda bloqueado por una petición de red adicional.
- Las dos fuentes críticas están precargadas
  (`src/layouts/Layout.astro:41-42`) con `as="font" type="font/woff2"
  crossorigin`, exactamente como pide
  [Preload critical assets — web.dev](https://web.dev/articles/preload-critical-assets).
- Formato WOFF 2.0 y subconjuntos por `unicode-range` (latin / latin-ext), que
  es lo que web.dev recomienda para no retrasar el LCP.
- Las seis fotos del equipo llevan `loading="lazy"`, `decoding="async"` y
  atributos `width`/`height` explícitos — de ahí el CLS de 0.014.
- El script de Figma no se carga salvo que la URL lleve `#figmacapture`.

### 5.4 Pesos reales del build

```
index.html                  64.2 kB
_astro/Footer.css           20.5 kB
_astro/index.css            17.8 kB
_astro/ContactModal.css      4.7 kB
_astro/Layout...js           8.5 kB
_astro/CountryCodeSelect.js  7.6 kB
fonts/familjen-grotesk-latin.woff2          18.5 kB
fonts/atkinson-hyperlegible-next-latin.woff2 33.2 kB
6 SVG decorativos            ~6.6 kB en total
```

El sitio es ligero (~150 kB en la ruta crítica). Con estos pesos, **un LCP de
5.0 s no se explica por el tamaño**: apunta a la cadena de peticiones y a la
latencia, que es justo lo que PageSpeed emula (4G lento, ~150 ms de RTT).

### 5.5 Acciones ordenadas por impacto esperado

**A. Cachear los assets con hash de forma agresiva.** Todo lo que hay en
`/_astro/` y `/fonts/` tiene el contenido versionado en la URL o no cambia
nunca. El patrón documentado es servir el HTML con revalidación corta y los
assets con huella digital con `max-age=31536000, immutable`; `immutable` evita
incluso la revalidación al recargar.

[Cache-Control — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)

Ya está incluido en el `_headers` propuesto en §1.3. Beneficia a la segunda
visita y a la navegación entre páginas, no a la primera carga.

**B. Reducir la cadena crítica de CSS.** La home carga tres hojas
(`index.css`, `Footer.css`, `ContactModal.css`, ~43 kB). `ContactModal.css` es
para un modal que arranca oculto: no es CSS crítico. Opciones, de menor a mayor
riesgo:

- Comprobar en el panel *Coverage* de DevTools cuánto de esos 43 kB se usa
  above-the-fold antes de tocar nada.
- Evaluar `build.inlineStylesheets` de Astro, que decide si el CSS pequeño se
  incrusta en el HTML en lugar de generar una petición extra.
  [build.inlineStylesheets — Astro](https://docs.astro.build/en/reference/configuration-reference/#buildinlinestylesheets)

**Medir antes de cambiar.** No modificar la estrategia de CSS a ciegas.

**C. `<link rel="preconnect">` a Cloudflare Turnstile.** Ya existe en
`src/layouts/Layout.astro:79`, condicionado a que haya site key. Correcto.
Verificar en producción que el `preconnect` se emite.

**D. Confirmar el LCP con datos de campo.** El LCP local (172 ms, sin
throttling) no es comparable con el de PageSpeed. Antes de optimizar más, mirar
la sección de **datos de campo (CrUX)** del informe de PageSpeed: si el p75 de
campo está en verde, el 5.0 s del laboratorio es una condición sintética y no
justifica cambios agresivos.
[Core Web Vitals — web.dev](https://web.dev/articles/vitals)

**E. Atributos `width`/`height` en los SVG decorativos.** Los seis
`img.brand-shape` no los declaran (verificado en el DOM del build). El CLS
actual es bueno (0.014) porque están en `position: absolute`, pero declararlos
es barato y previene regresiones.
[Optimize CLS — web.dev](https://web.dev/articles/optimize-cls)

---

## 6. Accesibilidad

WAVE reporta sobre `squai.io`: **1 error, 3 errores de contraste, 6 alertas**,
101 elementos ARIA y una puntuación AIM de 9/10. La base es sólida; los
hallazgos son concretos.

### 6.1 Error: "1 Missing form label" — **confirmado y localizado**

Se enumeraron todos los controles de formulario del build y se calculó su
nombre accesible. **Exactamente un control carece de nombre accesible**, lo que
coincide con el conteo de WAVE:

```
input[text] name=team_size  required=true  aria-hidden=true
            tabindex=-1     label=null      <<< SIN NOMBRE ACCESIBLE
```

Origen: `src/components/CustomSelect.astro:37`

```html
<input type="text" name={name} data-select-value class="sr-only"
       tabindex="-1" aria-hidden="true" required={required} />
```

El comentario del código explica el porqué: los `input type="hidden"` están
excluidos de la validación de restricciones, así que se necesitaba un control
renderizado aunque invisible.

**Pero el patrón introduce un fallo real, no solo una advertencia de WAVE.**
Verificado en Chromium sobre el build:

```json
{ "formValida": false, "teamSizeValido": false,
  "mensajeValidacion": "Please fill out this field.",
  "ariaHidden": "true", "tabindex": "-1", "required": true }
```

Es decir: hay un campo **obligatorio**, **oculto a las tecnologías de asistencia**
(`aria-hidden="true"`) y **fuera del orden de foco** (`tabindex="-1"`) que puede
invalidar el envío del formulario. Un usuario de lector de pantalla no tiene
forma de percibir ni corregir ese campo. Esto incumple:

- [WCAG 2.2 SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [WCAG 2.2 SC 3.3.2 Labels or Instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)
- La regla de ARIA de que `aria-hidden="true"` no debe usarse en elementos
  enfocables ni que reciban interacción:
  [aria-hidden — MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-hidden)

**Solución recomendada — usar el patrón ARIA de combobox completo.** El
componente ya tiene casi todo: `role="listbox"`, `aria-haspopup`,
`aria-expanded`, `aria-controls`, `aria-labelledby`. Lo que falta es dejar de
apoyarse en un input fantasma:

1. Quitar `aria-hidden="true"` y `required` del input espejo y darle un nombre
   accesible (`aria-labelledby={`${fieldId}-label`}`), o
2. Mejor: eliminar el input espejo y **validar la selección en el envío**, junto
   con el resto de la validación de cliente, escribiendo el error en el `<span
   id={errorId} class="field-error">` que el componente ya renderiza y que ya
   está referenciado por `aria-describedby` desde el botón disparador.

La opción 2 es la que sigue el patrón oficial:
[Combobox Pattern — WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
y
[Select-Only Combobox Example](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/)

El mismo patrón aparece en `src/components/CountryCodeSelect.astro:42`, pero ahí
el input es `type="hidden"` y no `required`, así que no se ve afectado.

### 6.2 Los 3 errores de contraste — hallazgo parcial y una causa estructural

Se midió el contraste de dos formas independientes:

**Medición 1 — axe-core sobre el build.** Resultado en la home:
**0 violaciones, 24 resultados "incomplete"**, todos con el mismo motivo:

```
Element's background color could not be determined because
element contains an image node
```

La causa son los `img.brand-shape` decorativos que se superponen al texto en
cada sección. **axe no puede determinar el fondo, así que no puede fallar ni
aprobar**, y lo deja en incompleto. Esto es importante: significa que las
herramientas automáticas **no están cubriendo el contraste de este sitio**, y
que un "0 errores" de axe aquí no es una aprobación.

**Medición 2 — muestreo de píxeles reales.** Se capturó cada elemento de texto
y se tomó el color de fondo dominante del recorte renderizado. Resultados en la
home (desktop 1280):

```
pasa  .hero-eyebrow-status   4.76  (mín 4.5)  #4c50d8 sobre #e1e3ed  14px/700
pasa  .service-eyebrow-text  5.29  (mín 4.5)  #4c50d8 sobre #eceeff  14px/700
pasa  .service-eyebrow-text  5.43  (mín 4.5)  #4c50d8 sobre #e6f4fb  14px/700
pasa  .service-eyebrow-text  5.47  (mín 4.5)  #4c50d8 sobre #f5f2f1  14px/700
pasa  .impact-title         11.90  (mín 3)    #0a0c1a sobre #f9c24d
pasa  .final-copy           18.02  (mín 4.5)  #f4f6ff sobre #0a0c1a
pasa  .hero-subtitle        10.29  (mín 4.5)  #b7bcd0 sobre #0a0c1a
```

**No se reprodujeron los 3 errores de contraste en la home.** Nota:
`.hero-eyebrow-status` pasa por un margen estrecho (4.76 frente a 4.5 exigido),
así que cualquier retoque del color de fondo de esa píldora puede tumbarlo.

**Sí se reprodujo un fallo real, en otra página:**

```
/servicios/squai-one
[serious] color-contrast
  target: .waitlist-promise
  "Prometemos no enviarte correos diarios de spam."
  contraste 2.66  (fg #8a8ef9 sobre bg #f4f6ff, 18px, peso 400) — se exige 4.5
```

Origen: `src/components/Waitlist.astro:90`

```css
.waitlist-promise { font-family: var(--font-hand); font-weight: 100; color: var(--periwinkle); }
```

`--periwinkle` es `#8A8EF9` (`src/styles/global.css:74`). Sobre `--canvas`
(`#F4F6FF`) da **2.66:1**. WCAG 2 AA exige 4.5:1 para texto normal y 3:1 para
texto grande, definido como ≥18 pt (≈24 px) o ≥14 pt (≈19 px) en negrita. A
18 px y peso 100 **no** califica como texto grande.

- [WCAG 2.2 SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Contrast and Color Accessibility — WebAIM](https://webaim.org/articles/contrast/)
- [Contrast Checker — WebAIM](https://webaim.org/resources/contrastchecker/)

**Solución:** usar el token oscuro que ya existe en el sistema de diseño,
`--periwinkle-ink` (`#4C50D8`, `src/styles/global.css:85`), que sobre `--canvas`
da **5.65:1** (y 6.09:1 sobre `--surface`). Es el mismo color que ya se usa en `.hero-eyebrow-status` y
`.service-eyebrow-text`, así que no introduce un color nuevo.

```css
.waitlist-promise { font-family: var(--font-hand); font-weight: 100; color: var(--periwinkle-ink); }
```

**Tokens que nunca deben usarse como color de texto sobre fondo claro**
(ratios calculados sobre `--surface` `#FFFFFF` y `--canvas` `#F4F6FF`):

| Token | Hex | sobre `--surface` | sobre `--canvas` |
|---|---|---|---|
| `--periwinkle` | `#8A8EF9` | 2.87 | 2.66 |
| `--teal` | `#44D4C8` | 1.83 | 1.69 |
| `--gold` | `#F9C24D` | 1.63 | 1.52 |
| `--periwinkle-soft` | `#B4B7FB` | 1.89 | 1.75 |
| `--periwinkle-dark` | `#6C71F4` | 3.96 | 3.67 |

Los tres primeros son colores de **fondo**, y sobre ellos `--midnight` da
11.9–10.6:1. `--periwinkle-dark` solo sirve para texto grande (≥3:1), y hoy se
usa en `a:hover` (`src/styles/global.css:175`) — un enlace en hover sobre fondo
claro a 3.96:1 **no cumple AA para texto normal**. Sustituirlo por
`--periwinkle-ink` (5.65:1 sobre `--canvas`, 6.09:1 sobre `--surface`) resuelve ese caso.

**Causa estructural que probablemente explica los 3 errores de WAVE.** Medido
en el build, cargando la home sin hacer scroll:

```
reducedMotion=no-preference -> .reveal totales: 31, con opacity<0.5 sin scroll: 27
reducedMotion=reduce        -> .reveal totales:  0, con opacity<0.5 sin scroll:  0
```

`src/styles/global.css:514` define `.reveal { opacity: 0 }` y el
`IntersectionObserver` de `src/layouts/Layout.astro` añade `.is-in` al entrar en
viewport. **27 de 31 secciones están a `opacity: 0` en el momento en que un
escáner analiza la página cargada.** Un motor de contraste que tenga en cuenta
la opacidad mezcla el color del texto con el del fondo y obtiene ratios
cercanos a 1:1 — exactamente el perfil de "Very low contrast".

Esto se confirmó de forma indirecta: una primera pasada de axe sin
`prefers-reduced-motion` reportó 12 nodos con contrastes de **1.01** y **1.03**
sobre fondos como `#f2f4fd`, colores que no existen en el sistema de diseño y
que solo pueden salir de mezclar por opacidad.

**Pendiente de verificar:** confirmar en WAVE cuáles son los 3 elementos
exactos, usando el panel *Details* y el botón de cada error, para saber si son
elementos `.reveal` o texto real con color insuficiente. No fue posible ejecutar
WAVE desde este entorno.

**Solución — mejora progresiva del reveal.** Con independencia de lo que diga
WAVE, el patrón actual tiene un riesgo real: si el JS falla, si
`IntersectionObserver` no existe, o si un rastreador no ejecuta JS, **el
contenido queda invisible de forma permanente**. El CSS ya contempla
`prefers-reduced-motion` (`src/styles/global.css:523-527`), lo cual es
correcto; falta el caso "el JS no llegó a correr".

El patrón recomendado es no ocultar nada hasta que el JS confirme que puede
revelarlo:

```css
/* Solo se oculta si el JS ya marcó el documento. */
html.js-reveal .reveal {
  opacity: 0;
  transform: translateY(26px);
  transition: opacity .7s cubic-bezier(.22,.8,.3,1), transform .7s cubic-bezier(.22,.8,.3,1);
}
html.js-reveal .reveal.is-in { opacity: 1; transform: none; }
```

y en el `<head>`, antes de pintar:

```js
if ('IntersectionObserver' in window &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('js-reveal');
}
```

Referencias del criterio:
[WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
y, sobre depender de JS para mostrar contenido,
[Understanding Conformance — WCAG, sobre tecnologías "accessibility supported"](https://www.w3.org/WAI/WCAG22/Understanding/conformance.html).

### 6.3 Las 6 alertas "Possible heading"

WAVE marca como *alerta* (no error) el texto que parece un encabezado pero no
está marcado como tal. Se buscaron en el build los elementos con texto corto,
tamaño ≥20 px o peso ≥700, que no son `h1`–`h6` ni están dentro de un elemento
interactivo. **La coincidencia exacta con el conteo de WAVE son los 6 roles del
equipo:**

```
p.team-member-role  "Estratega de Adopción de IA & Co-fundadora"   14px/700
p.team-member-role  "Ingeniero de IA & Co-fundador"                14px/700
p.team-member-role  "Analista de Procesos de Negocio"              14px/700
p.team-member-role  "Especialista en Gestión de Talento Humano"    14px/700
p.team-member-role  "Analista de Datos"                            14px/700
p.team-member-role  "Especialista en Seguridad de la Información"  14px/700
```

Origen: `src/components/Team.astro` (el nombre de cada persona ya es un `h3` en
la línea 103; el rol es el `<p>` en negrita que le sigue).

**Recomendación: no convertirlos en encabezados.** Un rol no es el título de
una sección de contenido, y promoverlo a `h4` rompería la jerarquía del
documento. Es una alerta, no un error, y el marcado actual —`h3` con el nombre,
`p` con el rol— es semánticamente correcto.

- [Headings — WAVE Documentation, WebAIM](https://wave.webaim.org/api/docs)
- [Semantic structure: Regions, headings, and lists — WebAIM](https://webaim.org/techniques/semanticstructure/)
- [WCAG 2.2 SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)

**Qué sí conviene revisar:** que la jerarquía no salte niveles. Verificado en el
build: la home tiene un único `h1` (el hero), las secciones usan `h2` y las
tarjetas `h3`. No hay saltos. Los `div.footer-heading` y `span.field-label`
también aparecieron en la búsqueda, y también están bien: son etiquetas de
grupo, no encabezados de sección.

### 6.4 Lo que la auditoría automática confirmó como correcto

axe-core con el conjunto completo de reglas
(`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`) sobre
home, `/servicios/squai-one` y `/politica-de-privacidad`, con el modal de
contacto abierto: **la única violación es `.waitlist-promise`** de §6.2.

En particular están correctos: el `skip-link`, `lang="es"` en `<html>`, el
`alt=""` + `aria-hidden` de las formas decorativas, los `<label for>` de los 8
campos con etiqueta, el `aria-label` del buscador de países, los
`aria-describedby` hacia los mensajes de error, y el botón de pausa de la
animación del hero (`src/components/Hero.astro:18-31`) con `aria-pressed` — que
además cubre
[WCAG 2.2 SC 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).

---

## 7. Anexos

### 7.1 `docs/scripts/serve-dist.mjs`

Servidor estático mínimo que replica el routing de producción
(`trailingSlash: 'never'` + `build.format: 'file'`). Sin él, `/servicios/squai-one`
devuelve 404 y la auditoría analiza una página de error en lugar de la real —
un fallo que ocurrió en la primera pasada de esta auditoría.

```js
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = new URL('../../dist/', import.meta.url).pathname;
const MIME = { '.html':'text/html;charset=utf-8', '.css':'text/css', '.js':'text/javascript',
  '.svg':'image/svg+xml', '.woff2':'font/woff2', '.png':'image/png', '.webp':'image/webp',
  '.xml':'application/xml', '.txt':'text/plain', '.json':'application/json' };
http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, p);
  if (p === '/') f = path.join(ROOT, 'index.html');
  else if (!path.extname(f)) f += '.html';
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404 ' + p); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(8799, () => console.log('http://127.0.0.1:8799'));
```

### 7.2 `docs/scripts/audit.mjs`

El script vive en el repositorio; se ejecuta como se indica en §0.2. Dos
decisiones suyas merecen explicación, porque sin ellas el informe miente:

**`reducedMotion: 'reduce'` en el contexto del navegador.** Activa la media
query de `src/styles/global.css:523-527`, que deja `.reveal` en `opacity: 1`.
Sin esto, 27 de 31 secciones están a `opacity: 0` al cargar, axe las considera
invisibles y no las audita: el informe sale en 0 errores por no haber mirado
casi nada.

**Se imprime también `res.incomplete`, no solo `res.violations`.** Como se
explica en §6.2, en este sitio buena parte del contraste cae en `incomplete`
porque las formas decorativas impiden a axe resolver el color de fondo. Un
informe que solo mire `violations` da un falso "todo bien".

Además abre el modal de contacto antes de auditar (`[data-modal]` arranca con
`hidden`), porque axe no audita lo que no se renderiza — que es la razón por la
que el input sin etiqueta de §6.1 no aparece en una pasada ingenua.

El script sale con código 1 si hay violaciones, así que sirve tal cual en CI.

### 7.3 Orden de trabajo sugerido

| # | Acción | Dónde | Esfuerzo | Efecto |
|---|---|---|---|---|
| 1 | `Minimum TLS Version = 1.2` | Dashboard Cloudflare | minutos | SSL Labs B → A |
| 2 | Crear `public/_headers` sin CSP (§1.3) | repo | bajo | Security Headers F → A o superior; Observatory +45 |
| 3 | Corregir `.waitlist-promise` a `--periwinkle-ink` | `src/components/Waitlist.astro:90` | trivial | 1 error WCAG AA menos |
| 4 | Corregir `a:hover` a `--periwinkle-ink` | `src/styles/global.css:175` | trivial | AA en enlaces en hover |
| 5 | Reveal con mejora progresiva (§6.2) | `global.css` + `Layout.astro` | medio | contenido visible sin JS; probables 3 errores WAVE |
| 6 | Rehacer `CustomSelect` sin input fantasma | `src/components/CustomSelect.astro:37` | medio | 1 error WAVE; corrige fallo real de formulario |
| 7 | CSP en `Report-Only` (§2.4 fase 1) | `public/_headers` | bajo | ninguno visible; recoge datos |
| 8 | Quitar el script de captura de Figma de producción | `src/layouts/Layout.astro:44-55` | bajo | menos superficie de ataque; CSP más estricta |
| 9 | Externalizar los scripts `is:inline` restantes | `src/layouts/Layout.astro` | medio | permite CSP sin `unsafe-inline` |
| 10 | CSP en modo enforce | `public/_headers` | bajo | Observatory +25 |
| 11 | Medir CSS con *Coverage* y decidir sobre `inlineStylesheets` | — | medio | posible mejora de LCP |

Los puntos 1–4 son de bajo riesgo y cubren la mayor parte de la diferencia de
puntuación. Los puntos 7–10 deben hacerse **en ese orden**: activar CSP sin la
fase de observación previa es la vía más rápida a un sitio roto en producción.

### 7.4 Cómo verificar cada cambio

```bash
# cabeceras en produccion
curl -sSI https://squai.io/ | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy|cross-origin'

# cache de assets con hash
curl -sSI https://squai.io/_astro/index.5ByTK-mi.css | grep -i cache-control
```

Reescaneos:

- [Security Headers](https://securityheaders.com/?q=squai.io&followRedirects=on)
- [MDN HTTP Observatory](https://developer.mozilla.org/en-US/observatory/analyze?host=squai.io) — botón *Rescan*
- [Qualys SSL Labs](https://www.ssllabs.com/ssltest/analyze.html?d=squai.io) — usar *Clear cache*
- [PageSpeed Insights](https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fsquai.io)
- [WAVE](https://wave.webaim.org/report#/squai.io)

---

## 8. Fuentes

**Cabeceras y CSP**
- [Headers — Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Headers — Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/headers/)
- [Static assets — Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/)
- [Strict-Transport-Security — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security)
- [HSTS Preload List Submission](https://hstspreload.org/)
- [X-Content-Type-Options — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options)
- [Referrer-Policy — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)
- [Permissions-Policy — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy)
- [Content-Security-Policy — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
- [Content-Security-Policy-Report-Only — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only)
- [Content Security Policy Level 2 — W3C](https://www.w3.org/TR/CSP2/)
- [Content Security Policy Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Clickjacking Defense Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)
- [Clickjacking — MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Clickjacking)
- [Content Security Policy — Astro Docs](https://docs.astro.build/en/reference/experimental-flags/csp/)
- [Astro 5.9 — anuncio de CSP](https://astro.build/blog/astro-590/)

**SRI**
- [Subresource Integrity — MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [Subresource integrity/CORS for Turnstile JavaScript link — Cloudflare Community](https://community.cloudflare.com/t/subresource-integrity-cors-for-turnstile-javascript-link/440769)

**TLS**
- [Grade change for TLS 1.0 and TLS 1.1 protocols — Qualys](https://blog.qualys.com/product-tech/2018/11/19/grade-change-for-tls-1-0-and-tls-1-1-protocols)
- [Key Changes in SSL Labs Grading — Qualys](https://notifications.qualys.com/product/2025/02/26/key-changes-in-ssl-labs-grading-and-qualys-certview)
- [Minimum TLS Version — Cloudflare SSL](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/minimum-tls/)
- [TLS 1.0/1.1 y calificación B — Cloudflare Community](https://community.cloudflare.com/t/this-server-supports-tls-1-0-and-tls-1-1-grade-will-be-capped-to-b-from-january-2020/141156)

**Performance**
- [Optimize Largest Contentful Paint — web.dev](https://web.dev/articles/optimize-lcp)
- [Best practices for fonts — web.dev](https://web.dev/articles/font-best-practices)
- [Preload critical assets — web.dev](https://web.dev/articles/preload-critical-assets)
- [Optimize Cumulative Layout Shift — web.dev](https://web.dev/articles/optimize-cls)
- [Core Web Vitals — web.dev](https://web.dev/articles/vitals)
- [Cache-Control — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
- [LCP for text elements and H1 headings — DebugBear](https://www.debugbear.com/docs/largest-contentful-paint-text-h1)
- [build.inlineStylesheets — Astro](https://docs.astro.build/en/reference/configuration-reference/#buildinlinestylesheets)

**Accesibilidad**
- [WCAG 2.2 SC 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)
- [WCAG 2.2 SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG 2.2 SC 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- [WCAG 2.2 SC 3.3.2 Labels or Instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)
- [WCAG 2.2 SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- [Understanding Conformance — WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/conformance.html)
- [Combobox Pattern — WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [Select-Only Combobox Example — APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/)
- [aria-hidden — MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-hidden)
- [Contrast and Color Accessibility — WebAIM](https://webaim.org/articles/contrast/)
- [Contrast Checker — WebAIM](https://webaim.org/resources/contrastchecker/)
- [Semantic structure — WebAIM](https://webaim.org/techniques/semanticstructure/)
- [Reglas de axe-core](https://dequeuniversity.com/rules/axe/4.13/)
