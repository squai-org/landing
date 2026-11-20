# Checkout de Bold (Squai One)

El pago de Squai One usa la **integración personalizada de Bold** en modo
embebido (`renderMode: 'embedded'`): el botón es del sitio (clases `.btn
.btn-dark`, texto en `src/config/checkout.ts`) y la librería de Bold solo abre el
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
                                      lee el precio de payment_plans,
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

## Cambiar el precio sin desplegar

El precio vive en la tabla `payment_plans` de D1, no en `copies.json`. Dos
caminos, ninguno pasa por un build:

1. **Panel de Cloudflare:** Workers & Pages → D1 → `squai` → `payment_plans` →
   editar `amount`.
2. **CLI:**

   ```bash
   wrangler d1 execute squai --remote \
     --command "UPDATE payment_plans SET amount = 450000, updated_at = datetime('now') WHERE code = 'squai-one'"
   ```

`amount` es un entero en pesos, sin decimales, con impuestos incluidos, y el
mínimo que acepta Bold son 1000 COP. El siguiente visitante ve el precio nuevo y
firma con él.

Para dejar de vender el plan: `UPDATE payment_plans SET active = 0 WHERE code =
'squai-one'`. La página pasa a mostrar el error en vez del botón.

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

1. La tarjeta de inversión muestra el precio que tiene `payment_plans`.
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
- **La tabla `waitlist_signups` sigue existiendo** con los registros de la lista
  de espera, aunque `/api/waitlist` ya no exista. No se borra para no perder esos
  datos.
- **No se envía correo al comprador** desde el sitio. Bold notifica el pago;
  el correo con los datos del programa es manual por ahora.
