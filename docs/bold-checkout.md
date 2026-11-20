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

Si la inscripción ya tiene un estado final, el Worker responde desde D1 sin
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

## Retomar una orden sin pagar

Quien llenó el formulario y no pagó vuelve con un enlace,
`https://squai.io/retomar?order_id=<orderId>`, sin llenar nada otra vez. El
enlace solo lleva el `order_id`, que es opaco (programa + UUID) y no tiene
datos personales. Es el `originUrl` que el checkout manda a Bold en cada pago
(a donde vuelve quien abandona o cancela el modal) y el enlace del correo de
recuperación. Lo arma `resumeUrl()` en `src/lib/bold-checkout.ts`; la ruta y
el plazo viven en `src/config/checkout.ts` (`resumePath`, `resumeExpiryDays`).

`src/pages/retomar.astro` (con `noindex` y fuera del sitemap) llama a
`POST /api/checkout/resume` con `{ order_id }`. El endpoint no pide Turnstile:
lo protegen el mismo origen y el límite por IP. El Worker:

1. Busca la orden (`404 order_not_found`). Si ya estaba aprobada responde
   `200 { enrolled: true, orderId }` y la página lleva a
   `/gracias?bold-order-id=<orderId>`.
2. Si la orden se creó hace más de 7 días: `410 resume_expired`.
3. Si la orden no tiene estado final, pregunta a Bold y aplica el veredicto con
   `applyOrderPayment`. Bold solo responde por una orden durante unas 24 horas:
   si no contesta, o contesta `NO_TRANSACTION_FOUND`, vale el estado guardado
   en D1 y la orden cuenta como no pagada (nunca como aprobada). Si Bold dice
   `APPROVED`: `200 { enrolled: true, orderId }`.
4. Verifica que el programa siga `open` (`409 program_not_open`) y que el
   cliente no tenga otra orden aprobada en el programa (`409 already_enrolled`;
   la página lleva a `/gracias?estado=inscrito`).
5. Crea una **orden nueva** del mismo cliente (sin tocar `customers`), con el
   precio vigente hoy en la moneda de la orden anterior, y responde
   `201 { session }`. La página abre Bold directo con esa sesión. Si el
   comprador cierra el modal, un botón «Continuar con el pago» reabre la misma
   sesión.

La respuesta nunca lleva datos de contacto: el enlace se puede reenviar. Por la
misma razón el modal de Bold no sale prellenado desde `/retomar`. Los avisos de
expirado, cerrado, no encontrado y error son textos de `ui.checkout.resume`,
con un enlace al programa.

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
7. Cerrar el modal sin pagar y abrir `/retomar?order_id=<ese order_id>`: debe
   abrir Bold directo con una orden nueva (otra fila en `orders`, mismo
   `customer_id`). Comprobar también a qué página lleva Bold al cancelar dentro
   del modal (`originUrl`).

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
