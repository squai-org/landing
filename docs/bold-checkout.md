# Checkout de Bold (Squai One)

El pago de Squai One usa la **integración personalizada de Bold** en modo
embebido (`renderMode: 'embedded'`): el botón es del sitio (clases `.btn
.btn-dark`, textos en `ui.checkout.button` del contenido) y la librería de Bold solo abre el
formulario de pago en un modal sobre `/servicios/squai-one`, sin sacar al
comprador del sitio. No se usa el botón con diseño de Bold (`<script
data-bold-button>`) porque no admite el estilo de la página.

Referencias: [integración manual][manual] · [ambiente de pruebas][pruebas] ·
[webhook][webhook] · [llaves de integración][llaves].

[manual]: https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-manual
[pruebas]: https://developers.bold.co/pagos-en-linea/boton-de-pagos/ambiente-pruebas
[webhook]: https://developers.bold.co/webhook
[llaves]: https://developers.bold.co/pagos-en-linea/llaves-de-integracion

## Cómo encaja

Doble validación: la vuelta del comprador confirma contra la API de Bold, y el
webhook cubre a quien nunca vuelve.

```
navegador                         Worker                         Bold
---------                         ------                         ----
formulario de inscripción
POST /api/checkout/session         -> Turnstile, valida campos,
                                      lee el precio vigente en la moneda
                                      elegida (program_prices),
                                      UPSERT customers, INSERT orders (pending),
                                      firma con BOLD_SECRET_KEY
                                   <- { apiKey, orderId, amount, firma }
new BoldCheckout({...}).open() ------------------------------->  modal de pago
                                                                      |
/gracias?bold-order-id=...  <-----------------------------------------+
GET /api/checkout/status           -> GET payments.api.bold.co
                                      /v2/payment-voucher/{orderId}
                                   <- payment_status
                                   -> orders.status
   (y en paralelo, pase lo que pase con el navegador)
POST /api/checkout/webhook        <- SALE_APPROVED / SALE_REJECTED / VOID_*
                                   -> bold_transactions + orders.status
```

Cuatro reglas que no se pueden relajar:

1. **La firma se calcula en el Worker.** Es `SHA-256` de
   `{orderId}{amount}{currency}{llaveSecreta}` concatenados sin separadores. Si
   el navegador firmara, cualquiera podría cambiar el monto.
2. **El monto sale de la base, no del navegador.** `POST /api/checkout/session`
   ignora cualquier `amount` que llegue en el cuerpo. El precio que se pinta en
   la tarjeta es el mismo que se firma.
3. **La orden se guarda antes de pagar.** El `order-id` es lo único que
   liga un pago con un cliente. Además deja rastro de quien empieza y no
   termina.
4. **La URL de retorno no decide nada.** Bold añade `bold-tx-status`, pero
   cualquiera puede escribirlo a mano y el propio Bold advierte de que ese
   estado puede no ser el definitivo. `/gracias` solo muestra lo que responde
   `GET /api/checkout/status`, que pregunta a Bold desde el servidor.

### Las tablas

`customers` guarda a cada cliente una sola vez, por su correo normalizado
(minúsculas y sin espacios); sus datos de contacto son los del último
formulario que envió. `orders` es el estado de negocio: una fila por intento,
con el `customer_id`, el `order_id`, el estado del pago y el contexto del
intento. `bold_transactions` es el registro crudo de lo que mandó el webhook,
para auditar un cobro disputado.

Los dos caminos de confirmación —la consulta de `/gracias` y el webhook—
escriben la misma fila con `applyOrderPayment`, que es idempotente y no
degrada: una orden ya aprobada solo cambia si llega una anulación. Da igual
quién llegue primero. `GET /api/checkout/status` responde
`{ ok, order: { status, programCode, amount, currency, fullName } }`, o 404
`order_not_found`.

### La consulta de estado

```
GET https://payments.api.bold.co/v2/payment-voucher/{data-order-id}
Authorization: x-api-key <LLAVE DE IDENTIDAD>
```

Ojo con la llave: esta consulta usa la **de identidad**, no la secreta. La
secreta solo firma.

`payment_status` puede ser `NO_TRANSACTION_FOUND` (aún no hay intento),
`PROCESSING`, `PENDING` (solo PSE), `APPROVED`, `REJECTED`, `FAILED` o
`VOIDED`. Bold avisa de dos límites: una venta tarda **hasta 10 minutos** en
aparecer y solo queda consultable **24 horas**. Por eso `/gracias` reintenta
unos dos minutos y, si para entonces no hay veredicto, muestra "en proceso" y
deja que el webhook termine el trabajo.

Si la orden ya tiene un estado final, el Worker responde desde D1 sin
volver a llamar a Bold.

## Dónde se configuran las llaves

Bold da dos llaves por integración, cada una con versión de pruebas y de
producción: **llave de identidad** (pública, identifica al comercio) y **llave
secreta** (privada, se queda en el servidor). Se sacan de
`bold.co → Integraciones → Llaves de integración → Botón de pagos`. Las dos
tienen que ser del mismo ambiente o Bold responde con un error.

| Entorno | Dónde | Cómo |
| --- | --- | --- |
| Local (`pnpm preview:worker`) | `.dev.vars` | `cp .dev.vars.example .dev.vars` y pegar las llaves **de pruebas** |
| Producción | Panel de Cloudflare | Workers & Pages → `landing-page` → Settings → **Variables and Secrets** → Add → tipo **Secret** |

Variables: `BOLD_IDENTITY_KEY` y `BOLD_SECRET_KEY`.

Por CLI, equivalente al panel:

```bash
wrangler secret put BOLD_IDENTITY_KEY
wrangler secret put BOLD_SECRET_KEY
```

**No van en `.env`.** El sitio se compila estático, así que cualquier variable
de `.env` acaba dentro del HTML publicado: la llave secreta quedaría a la vista.
La llave de identidad tampoco se compila: la sirve el Worker junto con la firma,
de modo que rotarla no obliga a reconstruir el sitio.

Si falta cualquiera de las dos, `/api/checkout/session` responde `503` con
`bold_not_configured` y la página muestra el mensaje de error en vez del botón.

### Webhook

En el Panel de Comercios de Bold, `Integraciones → Webhook`, registrar:

```
https://squai.io/api/checkout/webhook
```

Bold firma cada notificación en la cabecera `x-bold-signature`: HMAC-SHA256
sobre el **base64 del cuerpo crudo**, con la llave secreta, en hexadecimal. El
Worker verifica antes de leer el cuerpo y responde `401 invalid_signature` si no
cuadra. La llave que firma es la de `Botón de pagos`, la misma de
`BOLD_SECRET_KEY`.

## Programa, precios y moneda

El programa vive en la tabla `programs` de D1 (`code`, `description` que ve el
comprador en Bold) y sus precios en `program_prices`, no en `copies.json`. Cada
precio es una fila por programa, moneda (`COP` o `USD`) y `valid_from`; no hay
fecha de fin: rige el de mayor `valid_from` que ya llegó, hasta que empieza el
siguiente.

`valid_from` es ISO-8601 UTC con milisegundos y `Z`. Colombia es UTC−5 sin
horario de verano, así que las 00:00 de Colombia son las 05:00 UTC. La
cohorte de Squai One cobra 440.000 COP / 147 USD y el
`2027-01-01T05:00:00.000Z` (1 de enero de 2027, 00:00 en Colombia) pasa sola a
550.000 COP / 185 USD.

`GET /api/checkout/program/:code` responde
`{ ok, program: { code, description, prices: { COP?, USD? }, defaultCurrency, status } }`.
La moneda por defecto es COP si `CF-IPCountry` es `CO` y USD en cualquier otro
caso; si esa moneda no tiene precio vigente se propone la otra. La página
muestra ese precio y un selector de moneda (textos en `ui.checkout.currency`).
`POST /api/checkout/session` recibe `program` y `currency`; el monto sale de la
base para esa moneda, y una moneda sin precio vigente responde
`400 currency_not_available`.

Todo cobro declara a Bold `tax: 'vat-19'` (`src/config/checkout.ts`): el IVA
del 19 % va **incluido** en el monto, Bold no lo suma, y no entra en la firma.
La orden congela `amount`, `currency` y `tax`; un cambio de precio posterior no
la toca.

Para programar un precio nuevo, sin build:

```bash
wrangler d1 execute squai --remote \
  --command "INSERT INTO program_prices (program_code, currency, amount, valid_from) VALUES ('squai-one', 'COP', 600000, '2027-06-01T05:00:00.000Z')"
```

`amount` es un entero sin decimales, con impuestos incluidos: mínimo 1000 en
COP, mayor que 0 en USD (la base lo exige). En USD, Bold muestra dólares pero
procesa la venta en COP a la TRM del día, así que el webhook puede reportar el
total en pesos.

## Correo de confirmación (Brevo)

Cuando una orden pasa a `approved`, por el webhook o por `/status`, el cliente
queda inscrito y recibe **un solo** correo de confirmación: el acuse de recibo
de la Ley 1480 art. 50. `applyOrderPayment` detecta la transición (una orden ya
aprobada no vuelve a cambiar) y la ruta programa el envío con `waitUntil`
(`src/server/lib/background.ts`), así que el webhook responde a Bold sin
esperar a Brevo.

Antes de enviar, `sendConfirmation` (`src/server/services/email.service.ts`)
reclama la fila en `email_messages` con `INSERT ... ON CONFLICT DO NOTHING`
sobre `UNIQUE (order_id, kind)`: solo envía quien la creó, aunque el webhook y
`/status` lleguen juntos o se repitan. Después anota en esa fila `status`
(`sent` o `failed`), `attempts`, `provider_message_id` (el `messageId` de
Brevo), `last_error` y `sent_at`. D1 es la prueba de qué se envió, con qué
plantilla (`template_id`) y cuándo (ADR 0001). Un fallo de Brevo queda en
`failed` y no rompe la respuesta; el reintento es del cron (#56).

Sin `BREVO_API_KEY` o sin id de plantilla no se envía ni se crea la fila: la
orden queda aprobada y sin confirmación, y el cron la toma cuando esté
configurado.

### Llave y remitente

La API key es el secret **`BREVO_API_KEY`** del Worker (Brevo → SMTP & API →
API Keys). Igual que las llaves de Bold: en local va en `.dev.vars`
(`BREVO_API_KEY=...`) y en producción en Settings → **Variables and Secrets**
como tipo **Secret**, o por CLI:

```bash
wrangler secret put BREVO_API_KEY
```

Remitente `Squai <comunicaciones@squai.io>` (debe estar verificado en Brevo) y
respuesta a `team@squai.io`, en `src/config/email.ts`. El cliente
(`src/server/lib/brevo.ts`) es `fetch` contra `POST /v3/smtp/email` con
`templateId` y `params`, sin SDK.

### Plantilla

El HTML versionado es `src/emails/confirmation.html` (fuera de `public/`, no se
publica). Se construyó con `squai-org/brand-book` y `squai-org/landing-design`:
tablas de 600 px, estilos en línea, logo PNG absoluto y texto Midnight sobre
Periwinkle. Usa el New Template Language de Brevo: cada dato es
`{{ params.NOMBRE }}` y `test/build/email-templates.test.ts` comprueba que los
placeholders son exactamente `CONFIRMATION_PARAMS`.

Para publicarla: Brevo → Campaigns → Templates → New template → pegar el HTML,
guardar y poner su id en `email.templates.confirmation`
(`src/config/email.ts`). Mientras sea `null` el Worker no envía. Si el diseño
se ajusta en el editor de Brevo, devolver el HTML al repo para que el test lo
vigile.

Montos: el IVA del 19 % va incluido. `base = round(total / 1.19)` e
`IVA = total − base`, en enteros, así base + IVA siempre suma lo cobrado
(440.000 → 369.748 + 70.252). Las órdenes sin `tax` (anteriores a 0007) van
completas como base. Fechas y horario salen de `programs.starts_on`,
`ends_on` y `schedule`; si están vacíos el correo dice "Por confirmar".

### Pendientes del equipo

- Subir la plantilla a Brevo y poner su id en `src/config/email.ts`.
- **Dirección y teléfono de Squai**: en `email.company` quedan
  `[DIRECCION PENDIENTE]` y `[TELEFONO PENDIENTE]`, y así salen en el correo
  hasta que se reemplacen. Razón social y NIT son los de los Términos de
  Servicio.
- Llenar `starts_on`, `ends_on` y `schedule` del programa en D1.
- Probar la plantilla en clientes de correo reales (Gmail web y app, Outlook
  escritorio y web, Apple Mail/iOS), por ejemplo con el envío de prueba de
  Brevo. No está hecho: los tests solo validan los placeholders.

## Límites y estado del programa

Las ventas abren y cierran solas. Los límites viven en `program_limits` (una
fila por programa: `opens_at`, `closes_at` exclusivo, ambos ISO-8601 UTC, y
`capacity`) y el cierre manual en `programs.closed_manually` (0 o 1). Squai One
vende del `2026-12-01T05:00:00.000Z` al `2027-01-23T05:00:00.000Z` (1 de
diciembre a 22 de enero inclusive, hora de Colombia) con 30 cupos.

El estado no se guarda: el Worker lo calcula en cada consulta y lo expone en
`program.status`:

| `status` | Cuándo |
| --- | --- |
| `upcoming` | antes de `opens_at` |
| `open` | dentro de las fechas, con cupo y sin cierre manual |
| `closed` | desde `closes_at`, con tantas órdenes aprobadas como `capacity`, con `closed_manually = 1`, o sin fila en `program_limits` |

Solo cuentan las órdenes `approved`: una venta anulada (`voided`) libera su
cupo sola. Fuera de `open` la página cambia el botón por un aviso con textos de
`ui.checkout.status`.

`POST /api/checkout/session` no abre un pago si:

- el correo ya tiene una **inscripción** (una orden aprobada) en el programa:
  `409 already_enrolled`. La respuesta no lleva el order-id de esa orden; la
  página lleva a `/gracias?estado=inscrito` (textos
  `ui.checkout.thanks.enrolledTitle/enrolledBody`).
- el programa no está `open`: `409 program_not_open`. La página muestra el
  aviso de cerrado.

Para cerrar o reabrir las ventas a mano, o mover fechas y cupo, sin build:

```bash
wrangler d1 execute squai --remote \
  --command "UPDATE programs SET closed_manually = 1 WHERE code = 'squai-one'"
wrangler d1 execute squai --remote \
  --command "UPDATE program_limits SET capacity = 35 WHERE program_code = 'squai-one'"
```

## Cambiar precio, fechas y cupos sin desplegar

Precio, fechas, cupo y cierre manual viven en D1, no en el código ni en
`copies.json`: un cambio rige en la siguiente petición, sin build ni deploy. Se
corre en el panel de Cloudflare (Storage & Databases → D1 SQL Database →
`squai` → **Console**, que acepta el SQL tal cual) o con
`wrangler d1 execute squai --remote --command "<SQL>"`. `--remote` es
**producción**; `--local` es la base de `pnpm preview:worker`.

Las fechas van siempre en ISO-8601 UTC con milisegundos y `Z`
(`2027-01-23T05:00:00.000Z`): el Worker compara textos, y un `2027-01-23` a
secas queda antes de cualquier instante de ese día. Las 00:00 de Colombia son
las 05:00 UTC.

```sql
-- Precio: se agrega una fila, no se edita la vigente. Rige desde valid_from.
INSERT INTO program_prices (program_code, currency, amount, valid_from)
VALUES ('squai-one', 'USD', 199, '2027-06-01T05:00:00.000Z');

-- Corregir un precio programado que aún no rige (valid_from futuro).
UPDATE program_prices SET amount = 590000
WHERE program_code = 'squai-one' AND currency = 'COP' AND valid_from = '2027-01-01T05:00:00.000Z';

-- Ver el precio vigente en cada moneda.
SELECT currency, amount, valid_from FROM program_prices p
WHERE program_code = 'squai-one'
  AND valid_from = (SELECT max(valid_from) FROM program_prices q
                    WHERE q.program_code = p.program_code AND q.currency = p.currency
                      AND q.valid_from <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- Fechas de venta (closes_at es exclusivo: vende hasta el 29 de enero inclusive).
UPDATE program_limits
SET opens_at = '2026-12-01T05:00:00.000Z', closes_at = '2027-01-30T05:00:00.000Z'
WHERE program_code = 'squai-one';

-- Cupo.
UPDATE program_limits SET capacity = 35 WHERE program_code = 'squai-one';

-- Cerrar (1) o reabrir (0) las ventas a mano.
UPDATE programs SET closed_manually = 1 WHERE code = 'squai-one';

-- Fechas (YYYY-MM-DD) y horario del programa que salen en el correo de
-- confirmación. Valores entre <> a reemplazar por los confirmados.
UPDATE programs
SET starts_on = '<AAAA-MM-DD>', ends_on = '<AAAA-MM-DD>', schedule = '<días y horario, hora de Colombia>',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE code = 'squai-one';
```

Lo que la base rechaza sola: montos con decimales, menos de 1000 COP o 0 USD,
dos precios con la misma moneda y `valid_from`, un `closes_at` que no sea
posterior a `opens_at` y un cupo menor que 1. Las órdenes ya creadas no cambian:
congelan monto, moneda e impuesto. Para comprobar el efecto, `SELECT * FROM
v_program_seats` (abajo) o `GET /api/checkout/program/squai-one`.

## Seguimiento en D1

El embudo se consulta en D1, sin Brevo (ADR 0001). Tres vistas
(`migrations/0010_tracking_views.sql`, probadas en
`test/server/tracking-views.test.ts`) se calculan al consultarlas, así que
siempre están al día:

| Vista | Una fila por | Columnas |
| --- | --- | --- |
| `v_customers_without_enrollment` | cliente y programa con órdenes y **sin** orden aprobada | `customer_id`, `email`, `full_name`, `phone_e164`, `program_code`, `attempts`, `last_status`, `last_attempt_at` |
| `v_enrollments_by_program` | cliente inscrito por programa (aunque haya pagado dos veces) | `program_code`, `customer_id`, `email`, `full_name`, `phone_e164`, `order_id` y `enrolled_at` de su primera orden aprobada |
| `v_program_seats` | programa | `program_code`, `capacity`, `approved_orders`, `seats_left` (nunca menor que 0), `opens_at`, `closes_at`, `closed_manually` |

Una venta anulada (`voided`) deja de ser inscripción y libera su cupo, igual que
en el estado del programa. Un programa sin fila en `program_limits` sale con
`capacity` y `seats_left` en `NULL`: no se vende. `v_program_seats` no dice si
el programa está abierto por fechas, porque eso depende del instante; para eso
están `opens_at`, `closes_at` y `closed_manually`, o el `status` del API.

Consultas de uso, para pegar en la Console del panel:

```sql
-- Quién mostró intención de compra y no pagó, lo más reciente primero.
SELECT email, full_name, phone_e164, attempts, last_status, last_attempt_at
FROM v_customers_without_enrollment
WHERE program_code = 'squai-one'
ORDER BY last_attempt_at DESC;

-- Inscritos de Squai One, en orden de inscripción.
SELECT full_name, email, phone_e164, enrolled_at, order_id
FROM v_enrollments_by_program
WHERE program_code = 'squai-one'
ORDER BY enrolled_at;

-- Cuántos inscritos tiene cada programa.
SELECT program_code, count(*) AS inscritos
FROM v_enrollments_by_program
GROUP BY program_code;

-- Cupos que quedan.
SELECT program_code, capacity, approved_orders, seats_left, closed_manually
FROM v_program_seats;
```

Las mismas, por CLI (`--remote` lee producción; `--json` sirve para exportar):

```bash
wrangler d1 execute squai --remote \
  --command "SELECT email, full_name, phone_e164, attempts, last_status, last_attempt_at FROM v_customers_without_enrollment WHERE program_code = 'squai-one' ORDER BY last_attempt_at DESC"
wrangler d1 execute squai --remote \
  --command "SELECT full_name, email, phone_e164, enrolled_at FROM v_enrollments_by_program WHERE program_code = 'squai-one' ORDER BY enrolled_at"
wrangler d1 execute squai --remote \
  --command "SELECT * FROM v_program_seats"
```

## Correos, cron y retomar (resumen)

Resumen del diseño de #49; cada ticket detalla su parte.

- **Correo de confirmación (#55).** Un único correo por orden aprobada,
  registrado en `email_messages`; ver "Correo de confirmación (Brevo)".
- **Cron (#56).** Un `scheduled` del Worker reintenta las confirmaciones
  fallidas o colgadas, y envía la recuperación.
- **Recuperación (#58).** A las 2 horas de una orden sin pago, un único correo
  por cliente y programa con el enlace para retomar.
- **Retomar (#57).** `/retomar?order_id=<orderId>` (también el `origin-url`
  de Bold) abre otra orden del mismo cliente con el precio vigente, sin volver a
  llenar el formulario. Lleva a `/gracias` si ya está inscrito, y avisa si el
  programa cerró o si el enlace tiene más de 7 días.

Para ver qué se envió a quién:

```sql
SELECT m.kind, m.status, m.attempts, m.sent_at, c.email, m.order_id
FROM email_messages m JOIN customers c ON c.id = m.customer_id
ORDER BY m.created_at DESC;
```

## CI/CD en Cloudflare (sin GitHub Actions)

El repositorio está conectado a **Workers Builds**, así que el gate va en la
configuración del Worker, no en un `.yml`:

Workers & Pages → `landing-page` → Settings → **Builds**

| Campo | Valor | Por defecto traía |
| --- | --- | --- |
| Build command | `pnpm verify` | vacío |
| Deploy command | `pnpm deploy:ci` | `npx wrangler deploy` |
| Preview command | dejar el valor por defecto (`npx wrangler preview`) | `npx wrangler preview` |

**El Build command no lleva `pnpm install`.** Workers Builds instala las
dependencias por su cuenta antes de ejecutarlo; en el registro del build se ve
como `Installing project dependencies: pnpm install --frozen-lockfile`.
Repetirlo solo alarga el build.

`pnpm verify` corre `pnpm test` y `pnpm build`. Si un test falla, sale con
código distinto de cero y Workers Builds no ejecuta el deploy: producción se
queda en la versión anterior. `pnpm deploy:ci` aplica las migraciones pendientes
(`db:migrate:remote`) antes de `wrangler deploy`, así que
`0003_bold_checkout.sql` entra con el primer despliegue.

El **Preview command** corre en las ramas que no son la de producción. Su valor
por defecto, `npx wrangler preview`, crea un Preview de la rama bajo el mismo
Worker y **exige un bloque `previews` en `wrangler.jsonc`**, aunque esté vacío;
sin él el deploy de la rama falla con `missing a previews block`
(`test/build/wrangler-config.test.ts` lo protege). Según la
[documentación de Previews][prev], los Previews **no heredan** los bindings de
producción: con el bloque vacío la rama se despliega, pero `/api/*` no tiene D1,
rate limit ni llaves de Bold. Para probar el pago en una preview hay que darle
una base de pruebas en `previews.d1_databases` (con sus migraciones aplicadas) y
las llaves de **pruebas** con `npx wrangler preview base-config secret put`.

`npx wrangler versions upload` como Preview command **no** sirve aquí: en este
proyecto falló con `The name in your wrangler.jsonc file (landing-page) must
match the name of your Worker`. Es el error documentado de nombre de Worker; no
se arregla cambiando el nombre, sino usando el comando de Previews.

[prev]: https://developers.cloudflare.com/workers/previews/configuration/

### Versiones de la imagen de build

Según la [documentación de la imagen][img], la imagen fija **pnpm `9.10.0`** y
toma Node de `.node-version` (aquí `22.23.4`). Se cambian con las variables
`PNPM_VERSION` y `NODE_VERSION` en Settings → Build → Build variables, o con el
campo `packageManager` de `package.json`, que tiene prioridad sobre
`PNPM_VERSION`. La versión anotada en `pnpm-lock.yaml` **no** fija nada.

Dos consecuencias que ya rompieron un despliegue:

- **No versionar `pnpm-workspace.yaml`.** pnpm 11 lo crea solo en cada
  `pnpm install` con un stub de `allowBuilds`, y pnpm 9 exige en él un campo
  `packages:`: sin él el build muere con
  `ERROR packages field missing or empty` antes de instalar nada. Está en
  `.gitignore`. Los scripts de instalación permitidos viven en
  `pnpm.onlyBuiltDependencies`, dentro de `package.json`, que pnpm 9 sí lee.
- **Las Build variables no existen en runtime.** La documentación lo dice
  explícito, así que `BOLD_IDENTITY_KEY` y `BOLD_SECRET_KEY` van en
  Settings → **Variables and Secrets**, no en Settings → Build.

[img]: https://developers.cloudflare.com/workers/ci-cd/builds/build-image/

### Comprobar el gate antes de empujar

Un `pnpm verify` que pasa en local no prueba que el build de producción pase: la
pnpm y el Node locales suelen ser otros. La secuencia equivalente, en un clon
limpio y con las versiones de la imagen:

```bash
git clone -b <rama> <repo> /tmp/ci-check && cd /tmp/ci-check
# node 22.23.4 y pnpm 9.10.0 en el PATH
pnpm install --frozen-lockfile && pnpm verify
```

Las dos órdenes deben salir con código 0. Así se detectó que un
`pnpm-workspace.yaml` versionado rompía el install, y que Astro exige Node
`>=22.23.4` (un 22.23.0 falla el build aunque los tests pasen).

Lo que cubre el gate:

| Test | Qué protege |
| --- | --- |
| `test/server/bold.test.ts` | la firma reproduce el ejemplo publicado por Bold y rechaza montos con decimales |
| `test/server/bold-webhook-signature.test.ts` | la verificación de `x-bold-signature` acepta la firma de Bold y rechaza cuerpos alterados |
| `test/server/checkout.test.ts` | el monto sale de la base y no del navegador, la llave secreta nunca viaja en la respuesta, sin llaves responde 503 |
| `test/server/bold-webhook.test.ts` | una notificación forjada no entra a la base, un reenvío no duplica filas, una anulación queda como evento aparte |
| `test/build/csp-headers.test.ts` | la CSP de `dist/_headers` permite `checkout.bold.co` en `script-src` y `frame-src` |
| `test/server/tracking-views.test.ts` | las vistas de seguimiento cuentan clientes sin inscripción, inscritos y cupos como el estado del programa |
| `test/server/confirmation-email.test.ts` | webhook y `/status` en cualquier orden y repetidos envían una sola confirmación, sin esperar a Brevo; un fallo de Brevo queda registrado; una orden rechazada no envía nada |
| `test/build/email-templates.test.ts` | los placeholders de la plantilla coinciden con los parámetros que envía el Worker |

Las ramas que no son la de producción obtienen una URL de preview con el mismo
gate, así que el checkout se puede probar con llaves de pruebas antes de
mezclar.

## Prueba manual (lo que los tests no pueden cubrir)

El checkout real no se puede automatizar desde `workerd`: la pasarela corre en
el navegador. Esta lista se pasa sobre una preview o en local con llaves de
pruebas, antes de habilitar las llaves de producción.

```bash
cp .dev.vars.example .dev.vars   # pegar las llaves de PRUEBAS
pnpm db:migrate:local
pnpm preview:worker              # http://localhost:8787/servicios/squai-one
```

1. La tarjeta de inversión muestra el precio vigente de `program_prices` en la
   moneda por defecto, y el selector cambia entre COP y USD. Con
   `currency: USD`, monto entero y `tax: vat-19`, el modal de Bold debe abrir
   (verificar en el ambiente de pruebas de Bold).
2. Hay **un solo botón** de acción. Al enviar el formulario debe quedar una fila
   en `orders` con `status = 'pending'`, y el modal de Bold se abre **solo**,
   centrado sobre la página y con los datos de la persona prellenados (en
   `http://localhost` Bold responde `BTN-001` porque exige una URL de retorno
   `https`: probar en una preview):

   ```bash
   wrangler d1 execute squai --local --command "SELECT o.order_id, o.status, c.email FROM orders o JOIN customers c ON c.id = o.customer_id"
   ```
3. Con el modal abierto, el botón dice «Completa el pago en la ventana de Bold» y
   está deshabilitado. Al cerrar el modal sin pagar cambia de estilo (oscuro) y
   de texto a «Continuar con el pago»; al pulsarlo se reabre **la misma sesión**
   (mismo `order_id`, sin otra fila en `orders`). Si el comprador edita el
   formulario, vuelve a «Reservar» y el siguiente envío crea una orden
   nueva. Si la compra ya figura `approved`, el botón lleva a `/gracias` en vez
   de abrir otro pago.
4. El modal lleva la etiqueta amarilla **Modo de pruebas**.
5. La consola del navegador no reporta nada bloqueado por CSP.
6. Al terminar, el comprador llega a `/gracias?bold-order-id=...`, que debe
   confirmar contra Bold y dejar la inscripción en su estado final. Comprobar
   también que escribir `?bold-tx-status=approved` a mano **no** pinta la
   pantalla de éxito.
7. Pagar con cada dato de prueba de Bold y comprobar el resultado:

   | Dato | Resultado esperado |
   | --- | --- |
   | VISA `4111111111111111` | aprobado |
   | MasterCard `5100010000000015` | aprobado |
   | `4970110000000062` | rechazado |
   | `5204730000008404` | fallido |
   | PSE `BANCO QUE APRUEBA` | aprobado |
   | PSE `BANCO QUE RECHAZA` | rechazado |
   | PSE `BANCO QUE SIMULA UN ERROR` | error |

   Cualquier otro dato en modo de pruebas sale rechazado. Bold no publica CVV,
   fecha ni nombre para estas tarjetas: sirve cualquiera con formato válido.
6. En modo de pruebas Bold **no envía webhooks** por su cuenta. Al terminar una
   compra de prueba aparece el botón **Probar el webhook**: ahí se pega la URL
   del endpoint y Bold hace el POST. Debe responder `200` y dejar una fila en
   `bold_transactions`:

   ```bash
   wrangler d1 execute squai --local --command "SELECT payment_id, type, amount FROM bold_transactions"
   ```

### Un solo botón: fases

`src/lib/checkout-flow.ts` define las fases del botón (`idle` → `paying` →
`retry`) y `test/build/checkout-flow.test.ts` las fija. El Layout no toca el
botón mientras `data-checkout-phase` no sea `idle`. Al cerrarse el modal, Bold
avisa con `postMessage` (`BOLD_CHECKOUT_EVENT`).

### Si algo queda bloqueado por la CSP

El modal de Bold pinta su CSS en un `<style>` dentro de un shadow DOM, que
`style-src` solo deja pasar con hash: `BOLD_MODAL_STYLE_HASH` en
`src/integrations/csp-headers.mjs`. Si Bold cambia ese CSS, el modal vuelve a
salir sin posición. Para actualizarlo, bajar
`https://checkout.bold.co/library/boldPaymentButton.js` a
`test/fixtures/bold-library.js.txt`; `test/build/csp-headers.test.ts` falla y
da el hash nuevo que va en la constante.

La política se escribe en el build desde `src/integrations/csp-headers.mjs`. Si
la librería de Bold pide un origen que no está permitido, conviene descubrirlo
sin romper la página:

```bash
CSP_REPORT_ONLY=1 pnpm build
```

Eso emite `Content-Security-Policy-Report-Only`: el navegador informa en consola
de lo que habría bloqueado, pero no bloquea. Se añaden los orígenes que falten
al lado de `BOLD` en la integración y se vuelve a construir sin la variable.

## Lo que queda fuera

- **El comportamiento del modo embebido al terminar el pago no está claro en la
  documentación de Bold**: dice que el comprador "será dirigido al resumen de la
  compra dentro de tu sitio web **o** a la URL que hayas configurado". Hay que
  verificar en el ambiente de pruebas si la página padre llega de verdad a
  `/gracias`. Si no llegara, el webhook sigue registrando la venta, pero el
  comprador se quedaría sin confirmación en el sitio.
- **No se envía correo al comprador** desde el sitio. Bold notifica el pago;
  el correo con los datos del programa es manual por ahora.
