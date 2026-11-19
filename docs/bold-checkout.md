# Checkout de Bold (Squai One)

El pago de Squai One usa el **Botón de pagos de Bold en modo embebido**
(`data-render-mode="embedded"`): el formulario de pago se abre en un modal sobre
`/servicios/squai-one`, sin sacar al comprador del sitio.

Referencias: [integración manual][manual] · [ambiente de pruebas][pruebas] ·
[webhook][webhook] · [llaves de integración][llaves].

[manual]: https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-manual
[pruebas]: https://developers.bold.co/pagos-en-linea/boton-de-pagos/ambiente-pruebas
[webhook]: https://developers.bold.co/webhook
[llaves]: https://developers.bold.co/pagos-en-linea/llaves-de-integracion

## Cómo encaja

```
navegador                         Worker                         Bold
---------                         ------                         ----
GET  /api/checkout/plan/squai-one  -> lee payment_plans (D1)
                                   <- { amount, currency }        (pinta el precio)
POST /api/checkout/session         -> lee el plan + firma con
                                      BOLD_SECRET_KEY
                                   <- { apiKey, orderId, amount,
                                        currency, signature }
<script data-bold-button ...>  ------------------------------->  abre el modal
POST /api/checkout/webhook        <- SALE_APPROVED / SALE_REJECTED / VOID_*
                                   -> bold_transactions (D1)
```

Dos reglas que no se pueden relajar:

1. **La firma se calcula en el Worker.** Es `SHA-256` de
   `{orderId}{amount}{currency}{llaveSecreta}` concatenados sin separadores. Si
   el navegador firmara, cualquiera podría cambiar el monto.
2. **El monto sale de la base, no del navegador.** `POST /api/checkout/session`
   ignora cualquier `amount` que llegue en el cuerpo. El precio que se pinta en
   la tarjeta es el mismo que se firma.

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

| Campo | Valor |
| --- | --- |
| Build command | `pnpm install --frozen-lockfile && pnpm verify` |
| Deploy command | `pnpm deploy:ci` |

Workers Builds detecta la versión de pnpm por su cuenta (hoy `pnpm@9.10.0`) y
lee los scripts de instalación permitidos de `pnpm.onlyBuiltDependencies` en
`package.json`. **No agregar `pnpm-workspace.yaml`**: pnpm 9 exige en ese archivo
un campo `packages:` y, sin él, `pnpm install` muere con
`ERROR packages field missing or empty` antes de instalar nada. Con pnpm 11 en
local el mismo `install` avisa `ERR_PNPM_IGNORED_BUILDS` y sale con código 1,
cosa que rompe los comandos `pnpm <script>` posteriores; mientras local y CI no
usen la misma versión, en local conviene invocar los binarios directamente
(`npx vitest run`, `npx astro build`).

`pnpm verify` corre `pnpm test` y `pnpm build`. Si un test falla, el comando
sale con código distinto de cero, Workers Builds no ejecuta el deploy y
producción se queda en la versión anterior. `pnpm deploy:ci` aplica las
migraciones pendientes (`db:migrate:remote`) antes de `wrangler deploy`, así que
`0003_bold_checkout.sql` entra con el primer despliegue.

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
2. El botón de Bold aparece y abre el modal **sobre la página**, sin navegar.
3. El modal lleva la etiqueta amarilla **Modo de pruebas**.
4. La consola del navegador no reporta nada bloqueado por CSP.
5. Pagar con cada dato de prueba de Bold y comprobar el resultado:

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

### Si algo queda bloqueado por la CSP

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

- **No hay página de confirmación propia.** El comprador ve el resumen de compra
  de Bold dentro del modal y vuelve a `/servicios/squai-one`, donde Bold añade
  `bold-order-id` y `bold-tx-status` a la URL. Ese estado puede no ser
  definitivo: el registro que vale es el del webhook.
- **La tabla `waitlist_signups` sigue existiendo** con los registros de la lista
  de espera, aunque `/api/waitlist` ya no exista. No se borra para no perder esos
  datos.
- **No se envía correo al comprador** desde el sitio. Bold notifica el pago;
  el correo con los datos del programa es manual por ahora.
