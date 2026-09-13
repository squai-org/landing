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
pnpm db:create            # wrangler d1 create squai
```

El comando imprime un bloque con `database_id`. Cópialo en `wrangler.jsonc`, en
`d1_databases[0].database_id`, reemplazando `REEMPLAZAR_CON_EL_ID_REAL`.

**Dashboard**

1. <https://dash.cloudflare.com> → cuenta → **Storage & Databases** → **D1 SQL Database**.
2. **Create database** → nombre `squai` → **Create**.
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

Los comandos apuntan al **binding** `DB`, no al nombre de la base, así que
siguen funcionando aunque la base se llame distinto en cada cuenta. Es la
recomendación de Cloudflare justamente para no romper el despliegue por un
nombre que no coincide.

En un entorno no interactivo (CI) Wrangler salta la confirmación y aplica las
migraciones directamente.

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
pnpm deploy    # astro build && pnpm db:migrate:remote && wrangler deploy
```

El script encadena las migraciones antes del deploy, así que el esquema nunca
queda por detrás del código. Si una migración falla, el deploy no ocurre.

`wrangler deploy` sube `./dist` como static assets y `src/server/index.ts` como
código del Worker. `assets.run_worker_first: ["/api/*"]` es lo que hace que
`/api/*` entre siempre al Worker en vez de buscar un archivo estático.

### Automatizarlo con Workers Builds

Dashboard → **Workers & Pages** → el Worker `landing-page` → **Settings** →
**Build**:

| Campo | Valor |
| :--- | :--- |
| Build command | `pnpm build` |
| Deploy command | `pnpm run deploy:ci` |
| Non-production branch deploy command | dejar el valor por defecto (`npx wrangler versions upload`) |

`deploy:ci` corre `db:migrate:remote && wrangler deploy`. No repite el build
porque el build command ya lo hizo. Si la migración falla, no hay despliegue.

Dos detalles que deciden si esto funciona:

1. **Solo la rama de producción ejecuta el deploy command.** Los commits a
   cualquier otra rama usan el *preview deploy command*, que por defecto sube
   una versión sin promoverla. Es decir: mientras el código viva en una rama
   que no es la de producción, las migraciones no se aplican. Revisa qué rama
   está configurada como producción en **Settings → Build**.
2. **No pongas migraciones en el comando de preview.** Apuntaría a la misma D1
   de producción desde cualquier rama.

También hay que definir `PUBLIC_TURNSTILE_SITE_KEY` como variable del build
(paso 4), porque Astro la inyecta en tiempo de compilación.

Docs: [Workers Builds · Configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) ·
[Static Assets](https://developers.cloudflare.com/workers/static-assets/) ·
[Routing · Worker script](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/) ·
[GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)

## 7. Dominio propio

Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain** →
`squai.io`. El front y la API quedan en el mismo origen, que es lo que evita
CORS.

Docs: [Custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

## 8. Rate limiting

Hay dos capas posibles. La primera ya viene implementada en el código; la
segunda es opcional.

### 8.1 Binding de rate limiting del Worker (ya activo)

`wrangler.jsonc` declara:

```jsonc
"ratelimits": [
  { "name": "API_RATE_LIMITER", "namespace_id": "1001", "simple": { "limit": 5, "period": 60 } }
]
```

5 peticiones por minuto y por IP sobre `/api/waitlist` y `/api/contact`; la
sexta recibe `429` con `{"error":{"code":"rate_limited"}}`. El conteo ocurre
antes de leer el cuerpo y antes de tocar D1, así que un abuso no gasta
escrituras de la cuota diaria.

No requiere configuración en el panel y no consume la regla de zona. `period`
solo admite `10` o `60` segundos. Requiere Wrangler 4.36.0 o superior.

Docs: [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) ·
[GA en septiembre de 2025](https://developers.cloudflare.com/changelog/post/2025-09-19-ratelimit-workers-ga/)

### 8.2 Regla de rate limiting del WAF (opcional)

**Es a nivel de zona, no de cuenta.** La sección "Application security → WAF"
del menú de la cuenta es un add-on Enterprise y no sirve aquí.

Dashboard → **Domains** → `squai.io` → **Security** → **WAF** →
**Rate limiting rules** → **Create rule**.

- **Expresión**:
  ```
  (starts_with(http.request.uri.path, "/api/") and http.request.method eq "POST")
  ```
- **Characteristics**: `IP` · **Period**: 1 minuto · **Requests**: 5
- **Action**: Block · **Duration**: 1 minuto

El plan Free incluye **una** regla de rate limiting por zona (Pro 2, Business 5),
así que conviene reservarla para una protección más amplia que `/api/*`, que ya
está cubierto por el binding del Worker.

Solo aplica al tráfico que pasa por el proxy de Cloudflare; con el Custom Domain
del paso 7, todo `squai.io` lo hace.

Docs: [Rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/) ·
[Parámetros](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/) ·
[Crear la regla en el dashboard](https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/)

## 9. Revisar logs y cuotas

- Logs en vivo: `pnpm wrangler tail`, o Worker → **Logs**. `observability` ya
  está activo en `wrangler.jsonc`.
- Consumo de D1: Dashboard → **Storage & Databases** → `squai` →
  **Metrics**.

Límites del plan Free relevantes: 100.000 peticiones/día en Workers, y en D1
5.000.000 filas leídas y 100.000 escritas por día con 5 GB de almacenamiento.

Docs: [Observability](https://developers.cloudflare.com/workers/observability/) ·
[Límites de Workers](https://developers.cloudflare.com/workers/platform/limits/) ·
[Precios de D1](https://developers.cloudflare.com/d1/platform/pricing/)

---

## Consultar los leads

```bash
pnpm wrangler d1 execute squai --remote \
  --command "SELECT created_at, full_name, email, phone_e164 FROM waitlist_signups ORDER BY created_at DESC LIMIT 20;"
```

Docs: [`wrangler d1 execute`](https://developers.cloudflare.com/workers/wrangler/commands/#d1-execute)
