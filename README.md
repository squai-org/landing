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

## Estructura

```
migrations/         Migraciones de D1 (wrangler d1 migrations)
public/
  fonts/            Familjen Grotesk, Atkinson Hyperlegible Next y Gloria Hallelujah (woff2, self-hosted)
  images/           Fotos del equipo (webp)
src/
  components/       Cada sección de la página + Logo, Badge y Turnstile
  data/landing.ts   Todos los textos, listas y rutas de la API
  layouts/          Layout base (head, meta, fuentes) y el script de los forms
  pages/index.astro Composición de la página y scripts de interacción
  styles/global.css @font-face, tokens de diseño y estados hover/focus
  server/           Backend del Worker (ver abajo)
test/server/        Tests de la API contra un D1 local
docs/               Runbook de configuración en Cloudflare
```

Los textos viven en `src/data/landing.ts`; el resto de las copias están inline
en el componente de su sección.

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
| `POST` | `/api/waitlist` | `Waitlist.astro` — lista de la cohorte     |
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
