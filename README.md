# Squai — Fundamentos de Inteligencia Artificial Generativa

Landing page estática construida con [Astro](https://astro.build), a partir del
diseño `Landing Fundamentos de IA`, más un backend de captura de leads sobre
Cloudflare Workers + D1.

Un único Worker sirve el sitio estático desde `./dist` y atiende `/api/*` con
[Hono](https://hono.dev): mismo origen, sin CORS y sin infraestructura aparte.

## Requisitos

- Node.js 18.20.8 o superior
- pnpm

## Comandos

| Comando                   | Acción                                                        |
| :------------------------ | :------------------------------------------------------------ |
| `pnpm install`            | Instala las dependencias                                      |
| `pnpm dev`                | Servidor de Astro en `localhost:4321` (solo front, sin `/api`) |
| `pnpm build`              | Compila el sitio estático en `./dist/`                        |
| `pnpm og`                 | Regenera la imagen social y los iconos desde el logo vectorial |
| `pnpm preview`            | Sirve localmente el resultado de `pnpm build`                  |
| `pnpm preview:worker`     | Build + `wrangler dev`: front y `/api/*` con D1 local          |
| `pnpm test`               | Tests del backend en workerd (vitest)                          |
| `pnpm typecheck`          | `tsc` sobre el código del Worker                               |
| `pnpm cf-typegen`         | Regenera `worker-configuration.d.ts` desde `wrangler.jsonc`     |
| `pnpm db:create`          | Crea la base de datos D1 `squai`                         |
| `pnpm db:migrate:local`   | Aplica `migrations/` en el D1 local                            |
| `pnpm db:migrate:remote`  | Aplica `migrations/` en el D1 de producción                    |
| `pnpm deploy`             | Build + migraciones remotas + `wrangler deploy`                |
| `pnpm deploy:ci`          | Migraciones + deploy, sin build (lo usa Workers Builds)        |
| `pnpm version:upload`     | Build + sube una versión candidata, sin tocar producción        |
| `pnpm version:promote`    | Promueve una versión candidata al 100% del tráfico             |

## Estructura

```
.pages.yml          Modelo editorial de Pages CMS (ver docs/pages-cms.md)
migrations/         Migraciones de D1 (wrangler d1 migrations)
public/
  fonts/            Familjen Grotesk, Atkinson Hyperlegible Next y Gloria Hallelujah (woff2, self-hosted)
  images/           Fotos del equipo (webp)
  og/               Imagen social (1200x630) y logo para schema.org — generados
  robots.txt        Reglas de rastreo, incluidos los bots de IA
scripts/            generate-og.mjs + el lockup vectorial del que sale la imagen
src/
  components/       Cada sección de la página + Logo, Badge, Turnstile y Seo
  config/           Configuración de runtime (endpoints de la API)
  content/          Contenido editorial: copies.json + schema.ts (contrato Zod)
  content.config.ts Colección `copies` del Content Layer (loader `file`)
  lib/content.ts    getSiteContent(): único punto de acceso al contenido
  lib/seo.ts        Dominio canónico, URL canónica y constructores de JSON-LD
  layouts/          Layout base (head, meta, fuentes) y el script de los forms
  pages/index.astro Composición de la página y scripts de interacción
  pages/llms.txt.ts /llms.txt generado desde el contenido
  styles/global.css @font-face, tokens de diseño y estados hover/focus
  server/           Backend del Worker (ver abajo)
test/server/        Tests de la API contra un D1 local
docs/               Runbook de Cloudflare y documentación de Pages CMS
```

## Contenido

Todos los textos viven en `src/content/copies.json` y se cargan con el Content
Layer de Astro (`src/content.config.ts`). Los componentes nunca leen el JSON
directo: usan `getSiteContent()` de `src/lib/content.ts`.

- `src/content/schema.ts` es el contrato editorial. Se valida en build: si falta
  un campo o un link es inválido, el build falla.
- Para migrar a un CMS basta cambiar el `loader` de la colección; el schema y los
  componentes no cambian.
- Los campos de texto largo (`statement.body`, `whatWeDo.body`, `impact.body`,
  `originStory`, `faqs[].a`, `ui.team.intro`, `ui.finalCta.body`, `ui.follow.copy`,
  `ui.waitlist.copy`, `ui.waitlist.investment.copy`) aceptan una lista de párrafos o un string donde una línea
  en blanco separa párrafos. Cada párrafo se renderiza como su propio `<p>`.
- Rutas de la API y otra configuración de runtime van en `src/config/`, no en el
  contenido.
- El contenido se edita desde [Pages CMS](docs/pages-cms.md), que escribe
  directamente en `copies.json`. `.pages.yml` traduce el contrato a formularios:
  si cambia `schema.ts`, cambia `.pages.yml` en el mismo commit. El inventario
  campo a campo está en [`docs/pages-cms-inventario.md`](docs/pages-cms-inventario.md).

## SEO

Las copias de buscador viven con el resto del contenido (`src/content/copies.json`):
`seo.title` y `seo.description` para la home, `seo.serviceTitle` como plantilla y
`seoTitle` / `seoDescription` por servicio. La mecánica está en `src/lib/seo.ts`
(dominio canónico y constructores de JSON-LD) y en `src/components/Seo.astro`
(las etiquetas del `<head>`).

| Pieza | Dónde | Qué hace |
| :---- | :---- | :------- |
| Canónicas | `src/components/Seo.astro` | Una URL por página, sin `.html` ni barra final, idéntica a la del sitemap |
| Open Graph / Twitter | `src/components/Seo.astro` | Tarjeta con imagen 1200x630 al compartir el enlace |
| `robots` meta | `src/components/Seo.astro` | `max-snippet:-1` y `max-image-preview:large`: sin límite a lo que se puede citar |
| JSON-LD | `src/lib/seo.ts` | Un `@graph` por página: Organization, WebSite, WebPage, Course/Service, FAQPage, BreadcrumbList |
| Sitemap | `@astrojs/sitemap` | `/sitemap-index.xml`, generado en cada build |
| `robots.txt` | `public/robots.txt` | Permite explícitamente a los buscadores clásicos y a los bots de IA |
| `/llms.txt` | `src/pages/llms.txt.ts` | Resumen del sitio en Markdown para agentes y asistentes |

Reglas para mantenerlo:

- **Nada de datos sin verificar en JSON-LD.** No hay precios, fechas de programa
  ni direcciones porque el contenido no las declara. `sameAs` aparece solo
  cuando `socials[].href` deje de estar vacío.
- El dominio está en dos lugares y tienen que coincidir: `site` en
  `astro.config.mjs` y `SITE_URL` en `src/lib/seo.ts`.
- Al añadir una página nueva, pásale `title`, `description` y `schemas` al
  layout; el sitemap la recoge sola.
- Después de tocar el logo, `pnpm og` regenera `public/og/*` y el
  `apple-touch-icon.png`.

Los sitelinks (el bloque de subenlaces bajo el resultado de una marca) no se
marcan: Google los genera solo a partir de la estructura del sitio y de los
enlaces internos. Lo que sí está bajo nuestro control ya está hecho: títulos
únicos por página, `BreadcrumbList`, navegación y footer con enlaces de texto
estables, y sitemap.

Comprobaciones tras cada despliegue: [Rich Results
Test](https://search.google.com/test/rich-results),
[Schema Markup Validator](https://validator.schema.org/),
[PageSpeed Insights](https://pagespeed.web.dev/) y el informe de cobertura de
Search Console.

## Backend

```
src/server/
  index.ts          Entry del Worker: monta /api con Hono
  types.ts          Env (bindings) y tipos del contexto
  routes/           Un archivo por endpoint, handlers inline
  schemas/          Validación con Zod de cada formulario
  services/         Reglas de negocio: Turnstile y teléfono
  repositories/     Única capa que habla con D1, siempre con prepared statements
  middleware/       Errores JSON, guard de mismo origen, Content-Type, cabeceras
  lib/              Utilidades puras: normalización, E.164 y siteverify
```

Dependencia en un solo sentido: `routes → services → repositories → D1`. No hay
SQL fuera de `repositories/`.

### Endpoints

| Método | Ruta            | Origen                                    |
| :----- | :-------------- | :---------------------------------------- |
| `POST` | `/api/waitlist` | `Waitlist.astro` — lista del programa     |
| `POST` | `/api/contact`  | `ContactModal.astro` — Grow y Learn        |
| `GET`  | `/api/health`   | Sonda de salud                             |

Respuesta de éxito: `{ "ok": true, "id": 1, "created": true }`.
Respuesta de error: `{ "ok": false, "error": { "code", "message", "fields"? } }`,
donde `fields` mapea campo → mensaje para pintarlo en el formulario.

`/api/waitlist` hace upsert por correo (un correo = un lugar en la lista);
`/api/contact` guarda cada solicitud como una fila nueva.

### Seguridad

- **Bots**: Turnstile en los dos formularios, validado contra `siteverify` en el
  Worker. Sin `TURNSTILE_SECRET_KEY` la verificación se omite con un warning.
- **Inyección SQL**: todas las consultas son prepared statements con `.bind()`.
- **Validación**: Zod en el edge; normaliza nombre, correo (minúsculas) y
  teléfono a E.164. Los formularios aceptan cualquier proveedor de correo
  siempre que la dirección tenga un formato válido.
- **Origen**: la API no emite cabeceras CORS y rechaza cualquier `Origin`
  distinto al host de la petición.
- **Rate limiting**: 5 peticiones por minuto y por IP con el binding nativo de
  Workers (`ratelimits` en `wrangler.jsonc`), contadas antes de leer el cuerpo y
  de tocar D1. La regla del WAF queda como capa opcional.
- **Privacidad**: se guarda el país (`CF-IPCountry`), no la IP del visitante.

### Configuración en Cloudflare

Paso a paso en [`docs/cloudflare-setup.md`](docs/cloudflare-setup.md): crear D1,
aplicar migraciones, widget de Turnstile, secrets, deploy, dominio y regla de
rate limiting.
