# Configuración en Cloudflare

Pasos para dejar el backend de `/api/*` operativo. Cada paso cita la página
oficial que lo describe; los nombres de los menús del dashboard cambian cada
tanto, así que la documentación manda sobre el texto exacto del menú.

Salvo el paso 6, todo puede hacerse por CLI, que es reproducible y no depende
del layout del panel.

---

## 1. Crear la base de datos D1

**CLI (recomendado)**

```bash
pnpm wrangler login
pnpm db:create            # wrangler d1 create squai-leads
```

El comando imprime un bloque con `database_id`. Cópialo en `wrangler.jsonc`, en
`d1_databases[0].database_id`, reemplazando `REEMPLAZAR_CON_EL_ID_REAL`.

**Dashboard**

1. <https://dash.cloudflare.com> → cuenta → **Storage & Databases** → **D1 SQL Database**.
2. **Create database** → nombre `squai-leads` → **Create**.
3. Abre la base y copia el **Database ID** a `wrangler.jsonc`.

Docs: [D1 · Get started](https://developers.cloudflare.com/d1/get-started/) ·
[`wrangler d1 create`](https://developers.cloudflare.com/workers/wrangler/commands/#d1-create) ·
[Binding D1 en la configuración](https://developers.cloudflare.com/d1/worker-api/)

## 2. Aplicar las migraciones

```bash
pnpm db:migrate:local     # D1 local, para desarrollo
pnpm db:migrate:remote    # D1 de producción
```

Crea `waitlist_signups` y `contact_requests` desde `migrations/0001_init_leads.sql`.

Docs: [D1 · Migrations](https://developers.cloudflare.com/d1/reference/migrations/)

## 3. Crear el widget de Turnstile

1. Dashboard → cuenta → **Turnstile** → **Add widget**.
2. Nombre: `squai-landing`. **Hostnames**: `squai.io` (y cualquier dominio de
   preview que uses).
3. **Widget Mode**: `Managed`.
4. Guarda y copia las dos claves: **Site Key** (pública) y **Secret Key**.

Docs: [Turnstile · Get started](https://developers.cloudflare.com/turnstile/get-started/) ·
[Widget types](https://developers.cloudflare.com/turnstile/concepts/widget/)

Para probar sin resolver el desafío, Cloudflare publica sitekeys y secrets de
prueba (siempre pasa / siempre falla):
[Testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

## 4. Publicar la Site Key en el build

La Site Key es pública pero se inyecta en el HTML **en tiempo de build**, así que
tiene que existir como variable de entorno del build, no del runtime:

- Build local: copia `.env.example` a `.env` y rellena
  `PUBLIC_TURNSTILE_SITE_KEY`.
- Workers Builds (CI de Cloudflare): Worker → **Settings** → **Build** →
  variables de entorno del build → `PUBLIC_TURNSTILE_SITE_KEY`.

Si la variable no existe, el sitio compila sin widget y el backend omite la
verificación (queda registrado con un `console.warn`).

Docs: [Astro · Variables de entorno](https://docs.astro.build/en/guides/environment-variables/) ·
[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)

## 5. Guardar la Secret Key como secret del Worker

```bash
pnpm wrangler secret put TURNSTILE_SECRET_KEY
```

O en el dashboard: Worker → **Settings** → **Variables and Secrets** → **Add** →
tipo **Secret** → nombre `TURNSTILE_SECRET_KEY`.

Nunca como `var` en `wrangler.jsonc`: las vars viajan en texto plano en la
configuración.

Docs: [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) ·
[Validar el token](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

## 6. Desplegar el Worker

```bash
pnpm deploy               # astro build && wrangler deploy
```

`wrangler deploy` sube `./dist` como static assets y `src/server/index.ts` como
código del Worker. `assets.run_worker_first: ["/api/*"]` es lo que hace que
`/api/*` entre siempre al Worker en vez de buscar un archivo estático.

Alternativa con CI de Cloudflare: Dashboard → **Workers & Pages** → **Create** →
**Import a repository** → elige `squai-org/landing` → rama de producción →
build command `pnpm build`, deploy command `pnpm wrangler deploy`.

Docs: [Static Assets](https://developers.cloudflare.com/workers/static-assets/) ·
[Routing · Worker script](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/) ·
[`wrangler deploy`](https://developers.cloudflare.com/workers/wrangler/commands/#deploy)

## 7. Dominio propio

Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain** →
`squai.io`. El front y la API quedan en el mismo origen, que es lo que evita
CORS.

Docs: [Custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

## 8. Rate limiting en el WAF

Dashboard → selecciona la zona `squai.io` → **Security** → **WAF** →
**Rate limiting rules** → **Create rule** (en la navegación nueva:
**Security** → **Security rules**).

- **Expresión** (editor de expresiones):
  ```
  (starts_with(http.request.uri.path, "/api/") and http.request.method eq "POST")
  ```
- **Characteristics**: `IP` (IP source address).
- **Period**: 1 minuto.
- **Requests per period**: 5.
- **Action**: Block.
- **Duration** (mitigation timeout): 1 minuto.

> **Verificar en el panel**: el plan Free incluye reglas de rate limiting sin
> costo extra, pero **no pude confirmar** cuántas reglas permite hoy ni si los
> valores *period = 60s* y *duration = 60s* están habilitados en Free (la
> documentación dice que no todos los periodos están disponibles en todos los
> planes). Si el selector no ofrece 1 minuto, usa el valor más cercano
> disponible y ajusta el umbral proporcionalmente.

Docs: [Rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/) ·
[Parámetros](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/) ·
[Crear la regla en el dashboard](https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/) ·
[Buenas prácticas](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/)

## 9. Revisar logs y cuotas

- Logs en vivo: `pnpm wrangler tail`, o Worker → **Logs**. `observability` ya
  está activo en `wrangler.jsonc`.
- Consumo de D1: Dashboard → **Storage & Databases** → `squai-leads` →
  **Metrics**.

Límites del plan Free relevantes: 100.000 peticiones/día en Workers, y en D1
5.000.000 filas leídas y 100.000 escritas por día con 5 GB de almacenamiento.

Docs: [Observability](https://developers.cloudflare.com/workers/observability/) ·
[Límites de Workers](https://developers.cloudflare.com/workers/platform/limits/) ·
[Precios de D1](https://developers.cloudflare.com/d1/platform/pricing/)

---

## Consultar los leads

```bash
pnpm wrangler d1 execute squai-leads --remote \
  --command "SELECT created_at, full_name, email, phone_e164 FROM waitlist_signups ORDER BY created_at DESC LIMIT 20;"
```

Docs: [`wrangler d1 execute`](https://developers.cloudflare.com/workers/wrangler/commands/#d1-execute)
