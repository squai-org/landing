# Squai One: formulario, flujo de inscripción y pago — qué no se puede romper

Investigación de solo lectura sobre la rama `feat/squai-one` (HEAD `f7a7170`, que ya incluye #53 límites del programa y #55 correo de confirmación por Brevo). Todas las afirmaciones citan `ruta:línea`. Las secciones separan **Hechos** (lo que dice el código) de **Recomendaciones** (lo que conviene hacer en el restyle).

## Resumen ejecutivo

- La página es `src/pages/servicios/[slug].astro`, compartida por los tres servicios. Squai One no tiene `cta.modal`, así que en lugar del bloque de contacto pinta `<Checkout />` (`src/pages/servicios/[slug].astro:76-90`). Todo el formulario, la tarjeta de precio y el script del pago viven en `src/components/Checkout.astro`.
- El envío del formulario **no** lo hace `Checkout.astro`: lo hace el script global de `src/layouts/Layout.astro:593-716` para todo `form[data-form]`. Los dos scripts se comunican por eventos de `document` (`squai:checkout-session`, `squai:checkout-rejected`, `squai:form-sync`) y por el atributo `data-checkout-phase` del `<form>`. Es el acoplamiento más frágil para un restyle.
- Campos que viajan a `POST /api/checkout/session` (nombres = contrato de la API): `program` (oculto), `full_name`, `email`, `country_code` (oculto, del selector de indicativo), `phone`, `referral_source` (oculto, del select propio), `currency` (radios **fuera** del `<form>`, unidos con `form="checkout-form"`), `terms_consent`, `privacy_consent` y `cf-turnstile-response` (lo inyecta Turnstile). El servidor valida con Zod todos menos las dos casillas, que solo exige el navegador (`src/server/schemas/checkout.schema.ts:16-34`).
- No hay honeypot, ni captura de UTM, ni analítica en el código. Brevo no interviene al enviar el formulario: solo envía el correo cuando una orden pasa a `approved` (webhook o `/status`).
- Un solo botón conduce todo el flujo con tres fases (`idle` → `paying` → `retry`) definidas en `src/lib/checkout-flow.ts:13-52`; cambia clase (`btn-primary`/`btn-dark`) y texto del `<span class="btn-label">`. Bold se abre en modal embebido; la vuelta es `/gracias?bold-order-id=…`, que confirma contra el Worker.
- Lo que más fácil rompe un restyle: mover los radios de moneda o el botón fuera del contenedor esperado, quitar `id="checkout-form"`, `id="inscripcion"`, `.btn-label`, `[data-form-status]`, los `data-*` de los selects propios, la regla global `[hidden] { display: none !important; }`, o meter recursos externos / `onclick=` / estilos inyectados en runtime que la CSP bloquea.
- Ningún test cubre el DOM de la página: los tests fijan la lógica pura del flujo, los textos del CMS y el contrato de la API. Un restyle que rompa el cableado pasaría `pnpm verify` sin aviso.

---

## 1. Cómo se arma la página hoy

### Hechos

**Ruta y layout.** `getStaticPaths` genera una página por archivo de `src/content/services/*.json` (`src/pages/servicios/[slug].astro:28-31`); el slug es el nombre del archivo (`src/lib/content.ts:189-196`). La página usa `Layout` (`[slug].astro:57`), que pinta `<Seo>` (`src/layouts/Layout.astro:28-36`), carga Turnstile solo si existe `PUBLIC_TURNSTILE_SITE_KEY` (`Layout.astro:20, 58-65`) y deja los textos de cliente en `<body data-client-copy>` (`Layout.astro:67`).

**Orden de render** (`src/pages/servicios/[slug].astro:57-100`):

| # | Componente | Línea | Contenido que consume | ¿Compartido? |
|---|---|---|---|---|
| 1 | `Header` | 59 | `navLinks`, `services`, `ui.navigation.oneCta` (en Squai One el CTA es `#inscripcion` con `data-scroll-to`, `src/components/Header.astro:10, 91`) | Sí, todas las páginas |
| 2 | `ServiceHero` | 62 | `labels.services`; `service.name`, `service.accent` (como `style="color:…"`), `service.slogan`, `service.cta.{label,target,modal}`; solo en Squai One `program.status` y `program.name` (`src/components/ServiceHero.astro:15-40`) | Sí, los 3 servicios |
| 3 | `ServicePayback` | 66-70 | `ui.services.payback`, `service.payback.{headline,body}`, `cta` con `label = ctaSecondary` y `href="#inscripcion"` (`src/components/ServicePayback.astro:21-33`) | Sí, los 3 servicios |
| 4 | `ServiceBento` | 72 | `labels.challenge` (como título, inyectado en `src/lib/content.ts:193`), `service.challenge.cards[].{t,d}`; sección `night` (`src/components/ServiceBento.astro`) | Sí |
| 5 | `ServiceCapabilities` | 74 | `labels.capabilities`, `service.capabilities.groups[].{t,items,tone}` | Sí |
| 6 | `Checkout` | 88 | ver tabla siguiente | **Solo Squai One** (lo decide `service.cta.modal` vacío) |
| 7 | `Faq` | 92 | `labels.faq`, `service.faqs[].{q,a}`; `section id="faq"` (`src/components/Faq.astro:15`) | Sí, también la home |
| 8 | `Footer` | 96 | `footerCols`, `socials`, etc. | Sí, todas |
| 9 | `ContactModal` | 99 | `ui.modal`, formularios de contacto | Sí; en Squai One se renderiza pero ningún botón lo abre (el Header solo pone `data-open-modal` en grow/learn, `Header.astro:9`) |

**Lo que consume `Checkout.astro`** (`src/components/Checkout.astro:25-177`):

| Bloque | Fuente | Ubicación del texto |
|---|---|---|
| Título y párrafos | `ui.checkout.title`, `ui.checkout.copy[]` (el último lleva `.checkout-promise`) | `Checkout.astro:33-40`; `src/content/copies.json:151-157` |
| Cabecera de la tarjeta | `ui.checkout.formTitle`, `formSubtitle` | `Checkout.astro:53-56`; `copies.json:158-159` |
| Etiquetas de campos | `ui.forms.{required,fullName,email,countryCode,phone,referralSourceProgram,select,referralSources,countrySearch,countryEmpty}` | `Checkout.astro:60-91`; `copies.json:84-134` |
| Casillas | `ui.forms.termsConsent{Prefix,Link,Suffix}`, `privacyConsent{Prefix,Link,Suffix}` | `Checkout.astro:96-114`; `copies.json:102-104, 131-133` |
| Botón (fase idle) | `labels.reserve` | `Checkout.astro:117`; `copies.json:221` |
| Botón (paying/retry) | `ui.checkout.button.{paying,retry}` vía `data-paying-label`/`data-retry-label` | `Checkout.astro:50-51`; `copies.json:182-185` |
| Avisos de venta | `ui.checkout.status.{upcomingTitle,upcomingBody,closedTitle,closedBody}` | `Checkout.astro:122-129`; `copies.json:191-196` |
| Tarjeta de inversión | `ui.checkout.investment.{eyebrow,copy}`, `ui.checkout.currency.{label,cop,usd}`; el **precio no es contenido**: lo pinta JS desde la API | `Checkout.astro:137-162`; `copies.json:175-190` |
| Tres tarjetas del programa | `ui.program.{duration,schedule,modality}` + `program.{duration,schedule,modality}` | `Checkout.astro:163-174`; `copies.json:146-150, 751` |
| Mensajes de cliente | `ui.feedback.*` vía `data-client-copy` | `Checkout.astro:195`; `Layout.astro:67`; `copies.json:135-145` |
| Configuración (no CMS) | `checkout.program`, `libraryUrl`, `returnPath`; `endpoints.checkout*` | `src/config/checkout.ts:6-20`; `src/config/endpoints.ts:1-7` |

**SEO / JSON-LD.** `serviceSeo` usa `seoTitle`/`seoDescription` o la plantilla `seo.serviceTitle` (`src/lib/seo.ts:48-51`). Para Squai One el `offering` es `courseSchema` (`[slug].astro:39-41`; `src/lib/seo.ts:143-173`), sin precios. El grafo incluye `organizationSchema`, `websiteSchema`, `webPageSchema`, `breadcrumbSchema` y `faqSchema(service.faqs)` (`[slug].astro:43-54`); se emite como `<script type="application/ld+json" is:inline>` (`src/components/Seo.astro:93`), que la CSP cubre por hash en el build.

**Campos del JSON que Squai One no usa en su página:** `contactCopy`, `contactAside`, `contactCta` (solo en la rama modal, `[slug].astro:77-86`); `cardCopy`, `discoverLabel`, `span`, `tone`, `order`, `audience`, `menuAudience` sirven a la home y al menú. La variable `capabilitiesHeadline` se calcula y no se usa (`[slug].astro:37`).

**CMS.** `.pages.yml` tiene un grupo «Squai One» para `squai-one.json` (`.pages.yml:453-455` en adelante) y la «Sección de inscripción» para `ui.checkout` (`.pages.yml:1806`), con `currency` (`:1902`) y `button` (`:1920`). `ui.forms.referralSources` y `referralSourceProgram` **no** aparecen en `.pages.yml` (búsqueda de `referral` sin resultados): esas etiquetas solo se editan en el JSON.

### Recomendaciones

- Si el diseño nuevo es solo para Squai One, encapsularlo en `Checkout.astro` o en componentes nuevos condicionados por `service.slug === 'squai-one'` (patrón ya usado en `[slug].astro:37-41` y `ServiceHero.astro:22`). Tocar `ServiceHero`, `ServicePayback`, `ServiceBento`, `ServiceCapabilities`, `Faq`, `Header`, `Footer` o `global.css` cambia también Grow, Learn y la home.
- Cualquier texto nuevo va a `copies.json`/`squai-one.json` **y** a `src/content/schema.ts` **y** a `.pages.yml` en el mismo commit (AGENTS.md). Cambiar `schema.ts` exige preguntar antes.

---

## 2. El formulario

### Hechos: campos

`<form id="checkout-form" data-form="checkout" data-endpoint="/api/checkout/session" novalidate>` (`Checkout.astro:58`). El `novalidate` deja la validación al JS de `Layout`.

| `name` | Elemento | Etiqueta (fuente) | Obligatorio en cliente | Validación en servidor (Zod) | Cita |
|---|---|---|---|---|---|
| `program` | `input hidden`, valor `squai-one` | — (`config/checkout.ts:8`) | — | trim + minúsculas + `/^[a-z0-9-]{2,60}$/`; además debe existir con precio vigente | `Checkout.astro:59`; `checkout.schema.ts:20-23`; `program.service.ts:63-74` |
| `full_name` | `input type=text`, `autocomplete=name` | `ui.forms.fullName` | `required` | colapsa espacios, 2–120 | `Checkout.astro:63-67`; `common.ts:6-9` |
| `email` | `input type=email`, `autocomplete=email` | `ui.forms.email` | `required` + `typeMismatch` | ≤254, trim+minúsculas, `z.email` | `Checkout.astro:68-72`; `common.ts:11-15` |
| `country_code` | `input hidden` dentro de `CountryCodeSelect`, valor inicial `+57` | `ui.forms.countryCode` | siempre tiene valor | `/^\+?\d{1,3}$/` | `CountryCodeSelect.astro:42`; `common.ts:17-20` |
| `phone` | `input type=tel`, `autocomplete=tel-national`, `inputmode=tel` | `ui.forms.phone` | `required` | `/^[\d\s().+-]{6,20}$/` y luego `normalizePhone` (≥6 dígitos, E.164 ≤16) → `400 invalid_phone` | `Checkout.astro:77-81`; `common.ts:22-25`; `phone.ts:10-21`; `checkout.service.ts:65-71` |
| `referral_source` | `input hidden` dentro de `CustomSelect` (botón + listbox) | `ui.forms.referralSourceProgram`, opciones `ui.forms.referralSources` | `data-select-required="true"`, validado por `invalidCustomSelects` | enum `instagram, linkedin, tiktok, youtube, google, otras` | `Checkout.astro:85-91`; `CustomSelect.astro:17-46`; `Layout.astro:580-583`; `common.ts:27-29` |
| `currency` | 2 `input radio` (`COP` marcado en el HTML, `USD`) **fuera del form**, con `form="checkout-form"` | `ui.checkout.currency.*` | siempre hay uno marcado | trim + mayúsculas + enum `COP`/`USD`; sin precio vigente → `400 currency_not_available` | `Checkout.astro:150-160`; `checkout.schema.ts:24-27`; `program.service.ts:89-99` |
| `terms_consent` | `input checkbox required` | `ui.forms.termsConsent*`, enlace a `/terminos-de-servicio` | `required`; además el botón no se habilita sin ella | **No se valida ni se guarda** (Zod descarta claves desconocidas) | `Checkout.astro:96-104`; `checkout.schema.ts:16-17` |
| `privacy_consent` | `input checkbox required` | `ui.forms.privacyConsent*`, enlace a `/politica-de-privacidad` | ídem | **No se valida ni se guarda** | `Checkout.astro:106-114`; `checkout.schema.ts:16-17` |
| `cf-turnstile-response` | `input hidden` que inyecta Turnstile dentro de `[data-turnstile-widget]` | — | el botón espera el token si hay widget | `string ≤2048` opcional; si hay `TURNSTILE_SECRET_KEY`: falta → `400 turnstile_missing`, Siteverify falla → `403 turnstile_failed`, acción ≠ `checkout` → `403 turnstile_action_mismatch`, hostname ≠ `TURNSTILE_HOSTNAME` → `403 turnstile_hostname_mismatch` | `Turnstile.astro:29-40`; `common.ts:39`; `human.ts:12-45` |

El input de búsqueda del selector de país (`data-country-search`) está dentro del form pero no tiene `name`, así que no viaja (`CountryCodeSelect.astro:46-54`).

**Casillas (commits `24fb3de`, `58e3f42`).** Son dos casillas independientes (`Checkout.astro:96-114`). El JS de `Layout` las incluye en `consentSelector` (`Layout.astro:477`) y deshabilita el botón si alguna no está marcada (`Layout.astro:490-492`); el flujo de pago aplica la misma regla en `buttonView` (`checkout-flow.ts:49-52`) y en `render` (`Checkout.astro:285`). Marcar o desmarcar una casilla en fase `retry` no descarta la sesión firmada (`Checkout.astro:386-392`). Los textos del botón pasaron al CMS (`58e3f42`): `labels.reserve` y `ui.checkout.button.*`; un test exige que `src/config/checkout.ts` no tenga claves `label` (`test/build/checkout-content.test.ts:36-38`).

**Turnstile.** Contenedor `[data-turnstile-widget]` con `data-sitekey` y `data-action="checkout"` (`Checkout.astro:94`; `Turnstile.astro:31-37`). Se renderiza en modo explícito desde `Layout` (`Layout.astro:502-540`) con `theme: 'light'`, `language: 'es'`, `size: 'flexible'` (`Layout.astro:513-515`), al recibir `squai:turnstile-ready` (`Layout.astro:53-57, 547`). Callbacks de error/expirado/no soportado escriben `feedback.turnstileError`/`turnstileUnsupported` en el estado (`Layout.astro:523-535`). Tras cada envío el widget se resetea (`Layout.astro:495-500, 712`). Sin `PUBLIC_TURNSTILE_SITE_KEY` no se pinta nada y, sin `TURNSTILE_SECRET_KEY`, el Worker no verifica (`Turnstile.astro:8-9`; `human.ts:18-23`).

**Honeypot, UTM, analítica.** No existen: no hay campo trampa en `Checkout.astro`, ni código de UTM, `gtag`, `dataLayer` o similares en `src/` (búsqueda sin resultados). Lo único parecido es `orders.source_page`, que guarda la cabecera `Referer` (`request-meta.ts:6`; `order.repository.ts:30-35`). Por inferencia: como `public/_headers:19` fija `Referrer-Policy: strict-origin-when-cross-origin` y el `fetch` es same-origin, el `Referer` lleva la URL completa con su query string, así que unos UTM en la URL de la página acabarían en `source_page` de forma incidental, no diseñada. También se guardan `ip_country` (`CF-IPCountry`) y `user_agent` (≤512) (`request-meta.ts:4-10`); nunca la IP.

**Validación en cliente** (`Layout.astro:604-629`): `checkValidity()` + selects propios obligatorios vacíos. Mensajes: `feedback.fieldRequired` para `valueMissing`, `feedback.fieldEmail` para email mal formado, si no `validationMessage` del navegador (`Layout.astro:565-571`); se escriben en `[data-field-error="<name>"]` y el campo recibe `aria-invalid="true"` (`Layout.astro:573-578`); el estado general dice `feedback.invalid` y se enfoca el primer inválido en orden de documento (`Layout.astro:614-619`). Para el select propio el mensaje es su `data-select-message` (el placeholder `ui.forms.select`) y el `aria-invalid` va al botón disparador (`Layout.astro:585-591`). Al escribir en un campo se limpia su error (`Layout.astro:596-602`).

**Errores del servidor en el formulario** (`Layout.astro:669-682`): cada `error.fields[name]` va a su `[data-field-error]`; el estado muestra el primer mensaje de campo, o `error.message`, o `feedback.error`. `currency` y `program` no tienen ranura `data-field-error`, así que su mensaje solo sale en el estado general.

### Hechos: botón, estados y textos

| Situación | Clase | Texto | Habilitado | Quién lo decide |
|---|---|---|---|---|
| Carga sin JS | `btn btn-primary btn-block` | `labels.reserve` | sí (HTML no lo deshabilita) | `Button.astro:24-32`; `Checkout.astro:117` |
| `idle` con JS | `btn-primary` | `labels.reserve` | solo con token Turnstile (si hay widget) **y** las 2 casillas **y** sin envío en curso | `Layout.astro:479-493` |
| Enviando | igual | `feedback.sending` (también en el estado) | no, `aria-busy="true"` | `Layout.astro:648-656` |
| `paying` (modal abierto) | `btn-dark` | `ui.checkout.button.paying` | no | `checkout-flow.ts:45`; `Checkout.astro:276-293` |
| `retry` (modal cerrado sin pagar) | `btn-dark` | `ui.checkout.button.retry` | con las 2 casillas | `checkout-flow.ts:46, 49-52` |
| Programa `upcoming`/`closed` | — | el contenedor `[data-sales-panel="form"]` se oculta y aparece el aviso | no | `Checkout.astro:280-284, 295-301` |

Errores visibles: `[data-form-status]` con `data-state="error"|"ok"` (`Layout.astro:460-468`; estilos `src/styles/global.css:438-440`). `feedback.checkoutError` si la librería de Bold no carga (`Checkout.astro:343-346`).

### Recomendaciones

- Conservar exactamente los `name`, tipos, `required`, `autocomplete` e `inputmode`. Mantener `novalidate`.
- Mantener las dos casillas como `input type=checkbox` reales dentro del `<form>` (un toggle visual puede envolverlas, pero el `input` debe seguir ahí y emitir `change`).
- Si el diseño pide Turnstile oscuro u otro tamaño, eso es un cambio en `Layout.astro:510-515`, que afecta también al modal de contacto: pedir aprobación (AGENTS.md: «Ask before touching Turnstile»).

---

## 3. El flujo de punta a punta

### Hechos: secuencia

```mermaid
sequenceDiagram
  autonumber
  participant N as Navegador (Checkout.astro + Layout.astro)
  participant W as Worker /api
  participant D as D1
  participant B as Bold
  participant R as Brevo

  N->>W: GET /api/checkout/program/squai-one
  W->>D: programs, program_prices vigentes, program_limits, órdenes approved
  W-->>N: 200 {ok, program:{code, description, prices:{COP?,USD?}, defaultCurrency, status}}
  Note over N: pinta precio, oculta monedas sin precio, marca defaultCurrency;<br/>si status upcoming/closed cambia el botón por el aviso
  N->>N: usuario llena campos, Turnstile entrega token, marca 2 casillas → botón habilitado
  N->>W: POST /api/checkout/session (JSON con todos los name del form + currency)
  W->>W: jsonRequest, sameOrigin, Zod, llaves Bold, Turnstile, teléfono
  W->>D: precio vigente, ¿ya inscrito?, ¿programa open?
  W->>D: UPSERT customers, INSERT orders (pending)
  W-->>N: 201 {ok, session:{apiKey, orderId, amount, currency, description, tax, integritySignature}}
  N->>N: evento squai:checkout-session → fase paying, pinta monto firmado
  N->>B: carga boldPaymentButton.js y new BoldCheckout({... renderMode:'embedded', redirectionUrl:'https://<origen>/gracias'}).open()
  alt cierra el modal sin pagar
    B-->>N: postMessage {type:'BOLD_CHECKOUT_EVENT'} → fase retry
    N->>W: (al pulsar) GET /api/checkout/status?order_id=…
    W-->>N: si approved → location /gracias?bold-order-id=…; si no → reabre la MISMA sesión
  else paga
    B-->>N: redirige a /gracias?bold-order-id=…&bold-tx-status=…
    loop cada 6 s, máx. 20
      N->>W: GET /api/checkout/status?order_id=…
      W->>B: GET payments.api.bold.co/v2/payment-voucher/{orderId} (llave de identidad)
      W->>D: applyOrderPayment (idempotente)
      W-->>N: {ok, order:{status, programCode, amount, currency, fullName}}
    end
  end
  B->>W: POST /api/checkout/webhook (x-bold-signature)
  W->>D: bold_transactions + applyOrderPayment
  W-)R: si la orden acaba de pasar a approved: correo de confirmación (waitUntil)
```

**Detalle en el navegador:**

1. Al cargar, `loadPrice` pide el programa (`Checkout.astro:231-253`), llama a `showSalesPanel(salesPanel(status))` y ajusta los radios: deshabilita y oculta (`hidden` en `[data-currency-option]`) las monedas sin precio y marca `defaultCurrency`. Si falla, queda COP marcado del HTML y el precio se pinta al recibir la sesión (`Checkout.astro:250-252, 427`).
2. `submit` lo intercepta `Layout` (`Layout.astro:604-716`): valida, arma `payload` con `FormData(form)` recortando espacios (`:637-640`) — por eso los radios con `form=` viajan —, deshabilita el botón y hace `POST` con `Content-Type: application/json` (`:660-665`).
3. Error: pinta errores y despacha `squai:checkout-rejected` con `error.code` (`Layout.astro:678-680`). `Checkout` decide con `rejectionAction` (`checkout-flow.ts:79-83`): `already_enrolled` → `/gracias?estado=inscrito` (`Checkout.astro:414-415`; `checkout-flow.ts:89-92`); `program_not_open` → aviso «cerrado» (`Checkout.astro:416-418`); el resto se queda en el formulario.
4. Éxito: `Layout` **no** limpia el formulario (sus datos prellenan Bold), limpia el estado y despacha `squai:checkout-session` con `data.session` (`Layout.astro:686-695`). En `finally` no devuelve el texto del botón si la fase ya no es `idle` y resetea Turnstile (`Layout.astro:704-714`).
5. `Checkout` recibe la sesión, pinta `amount`/`currency` firmados, arma `customerData` con `full_name`, `email`, `phone` (solo dígitos) y `country_code`, pasa a `paying` y abre el pago (`Checkout.astro:423-442`). `openPayment` inyecta una sola vez `<script src="https://checkout.bold.co/library/boldPaymentButton.js">` (`:315-329`) y llama a `new window.BoldCheckout(boldCheckoutConfig(...)).open()` (`:336-347`). La configuración (`src/lib/bold-checkout.ts:30-42`) lleva `apiKey, orderId, amount` (texto), `currency, description, tax, integritySignature, redirectionUrl, renderMode:'embedded'` y `customerData` (JSON).
6. Cierre del modal: `message` con `origin === https://checkout.bold.co` y `data.type === 'BOLD_CHECKOUT_EVENT'` → `retry` (`Checkout.astro:258, 379-382`).
7. Reintento: el `click` en fase ≠ `idle` hace `preventDefault` (no reenvía el form, no crea otra orden); en `retry` consulta `/status` y, si ya está `approved` (`canReopen`, `checkout-flow.ts:58`), redirige a `/gracias?bold-order-id=…`; si no, reabre con la misma sesión (`Checkout.astro:351-376`).
8. Edición en `retry`: cualquier `input`/`change` del form (salvo casillas) o el cambio de moneda descarta la sesión y vuelve a `idle` (`Checkout.astro:388-407`); el siguiente envío crea otra orden. En `idle` el render despacha `squai:form-sync` y `Layout` recalcula el botón (`Checkout.astro:292`; `Layout.astro:548-550`).
9. `/gracias` (`src/pages/gracias.astro`): `thanksStart` lee `estado=inscrito` o `bold-order-id` (`checkout-flow.ts:97-102`); nunca lee `bold-tx-status`. Sondea `/status` cada 6 s hasta 20 veces (`gracias.astro:113-148`) y muestra uno de `checking|approved|pending|rejected|enrolled|error` (`gracias.astro:40-67`); `rejected` agrupa `rejected|failed|voided` (`:134`). Muestra el `orderId` en `[data-thanks-order-id]` (`:69-71, 105-108`).

### Hechos: endpoints

Todos montados en `/api` con `securityHeaders` (`Cache-Control: no-store`, `nosniff`, `Referrer-Policy: same-origin`), `sameOrigin` y `requestMeta` (`src/server/index.ts:19-21`; `security-headers.ts:4-9`). Respuestas: éxito `{ ok: true, ... }` (`http.ts:29-30`); error `{ ok: false, error: { code, message, fields? } }` (`middleware/error.ts:6-9`).

| Endpoint | Request | 2xx | Errores (código HTTP `code`) | Cita |
|---|---|---|---|---|
| `GET /api/checkout/program/:code` | — | `200 {ok, program:{code, description, prices:{COP?,USD?}, defaultCurrency, status}}` (`status`: `upcoming`, `open` o `closed`) | `404 program_not_found`; `403 cross_origin_blocked` | `routes/checkout.ts:24-28`; `program.service.ts:24-31, 63-86` |
| `POST /api/checkout/session` | JSON ≤16 KiB, campos de la tabla de §2 | `201 {ok, session:{apiKey, orderId, amount, currency, description, tax, integritySignature}}` | `400 unsupported_content_type`, `400 payload_too_large`, `403 cross_origin_blocked`, `400 invalid_json`, `400 validation_failed` + `fields`, `503 bold_not_configured`, `400 turnstile_missing`, `403 turnstile_failed`/`turnstile_action_mismatch`/`turnstile_hostname_mismatch`, `400 invalid_phone` + `fields.phone`, `404 program_not_found`, `409 already_enrolled`, `409 program_not_open`, `400 currency_not_available` + `fields.currency`, `500 internal_error` | `index.ts:26`; `json-request.ts:7-19`; `routes/checkout.ts:40-52`; `validate.ts:4-16`; `checkout.service.ts:47-113`; `program.service.ts:89-116` |
| `GET /api/checkout/status?order_id=` | query | `200 {ok, order:{status, programCode, amount, currency, fullName}}` | `400 order_id_missing`, `404 order_not_found`, `503 bold_not_configured`, `500 internal_error` si Bold falla | `routes/checkout.ts:33-39`; `checkout.service.ts:234-272`; `bold.ts:134-158` |
| `POST /api/checkout/webhook` | cuerpo crudo de Bold + `x-bold-signature` | `200 {ok, type, paymentId}` | `401 invalid_signature`, `400 invalid_json`/`validation_failed`, `503 bold_not_configured` | `routes/checkout.ts:59-68`; `checkout.service.ts:140-199` |

Orden de comprobaciones en `/session`: Zod se evalúa antes que nada (`routes/checkout.ts:45-50`); luego llaves de Bold (`checkout.service.ts:53-61`), Turnstile (`:63`), teléfono (`:65-71`), programa (`:73`), inscripción y estado (`:74`), precio (`:76`).

### Hechos: qué se escribe y dónde

- **`POST /session`:** `upsertCustomer` por correo normalizado con `full_name`, `country_code`, `phone` nacional y `phone_e164` (`customer.repository.ts:16-37`); `insertOrder` con `order_id` = `squai-one-<uuid sin guiones>` (`checkout.service.ts:41`), `customer_id`, `program_code`, `referral_source`, `amount`, `currency`, `tax='vat-19'`, `source_page`, `ip_country`, `user_agent` (`checkout.service.ts:84-103`; `order.repository.ts:30-35`); `status` nace `pending` (`migrations/0006_customers_orders.sql:49-50`). Las casillas no se guardan. El monto sale de `program_prices`, nunca del cuerpo (`docs/bold-checkout.md:50`).
- **`/status` y webhook:** `applyOrderPayment`, idempotente y sin degradar una orden aprobada salvo anulación (`order.repository.ts:79-110`); el webhook además guarda `bold_transactions` (`checkout.service.ts:168-181`).
- **Brevo:** solo cuando `applyOrderPayment` informa `becameApproved`, en segundo plano con `waitUntil` (`routes/checkout.ts:16-17`; `checkout.service.ts:196, 269`; `src/server/lib/background.ts:12-22`), registrado en `email_messages` (`migrations/0009_email_messages.sql:21`). Hoy no envía: `email.templates.confirmation` es `null` (`src/config/email.ts:23-24`). El formulario no toca Brevo.

### Hechos: configuración del pago

`checkout.program='squai-one'`, `tax='vat-19'`, `libraryUrl='https://checkout.bold.co/library/boldPaymentButton.js'`, `returnPath='/gracias'` (`src/config/checkout.ts:6-20`). Llaves `BOLD_IDENTITY_KEY` y `BOLD_SECRET_KEY` como secretos del Worker, nunca en `.env` (`docs/bold-checkout.md:97-125`; `.dev.vars.example`). `redirectionUrl` se construye con `window.location.origin` + `returnPath` (`Checkout.astro:341`); en `http://localhost` Bold responde `BTN-001` porque exige `https` (`docs/bold-checkout.md:405-407`).

---

## 4. Contrato de acoplamiento para el restyle

Leyenda: **CARGA** = algo lo lee (JS, servidor, test o CSS funcional); cambiarlo rompe el flujo. **LIBRE** = solo presentación.

### 4.1 Atributos y estructura que lee el JS de la página

| Selector / atributo | Dónde está | Quién lo lee | Estado | Nota |
|---|---|---|---|---|
| `[data-bold-checkout]` + `data-program`, `data-program-endpoint`, `data-library-url`, `data-return-path`, `data-status-endpoint`, `data-paying-label`, `data-retry-label` | `Checkout.astro:42-52` | `Checkout.astro:203, 233, 258, 264-265, 319, 341, 349, 355, 415` | **CARGA** | El `<form>` y `[data-form-status]` deben ser **descendientes** de este elemento (`:206, 257`). |
| `id="checkout-form"` | `Checkout.astro:58` | radios `form="checkout-form"` (`:153, 157`) | **CARGA** | Sin él la moneda no viaja y el servidor responde `validation_failed`. |
| `form[data-form="checkout"]`, `data-endpoint` | `Checkout.astro:58` | `Layout.astro:542, 593, 631-635`; `Checkout.astro:206` | **CARGA** | |
| `data-checkout-phase` (lo escribe JS en el form) | — | escrito `Checkout.astro:281, 290`; leído `Layout.astro:487, 709` | **CARGA** | Debe seguir en el mismo `<form>`. |
| Un único `button[type="submit"]` dentro del form | `Checkout.astro:116-118` | `Checkout.astro:255`; `Layout.astro:483, 648` | **CARGA** | Un segundo submit en el form rompería la lógica (`querySelector` toma el primero). |
| `.btn-label` dentro del botón | `Button.astro:32` | `Checkout.astro:256, 288`; `Layout.astro:649-655, 709-711` | **CARGA** | Si se deja de usar `Button.astro`, replicar el `<span class="btn-label">`. |
| Clases `btn-primary` / `btn-dark` del botón | `global.css:253, 262` | `Checkout.astro:286-287` (toggle) | **CARGA** (nombres) / LIBRE (aspecto) | Se pueden restilizar, no renombrar. |
| `:disabled` y `aria-busy` del botón | `global.css:243` | `Layout.astro:492, 652-653` | **CARGA** | El estado deshabilitado es funcional (espera Turnstile/casillas): debe verse. |
| `[data-form-status]` (+ opcional `[data-form-status-text]`), `data-state` | `Checkout.astro:131` | `Layout.astro:461-467`; `Checkout.astro:257, 308-313` | **CARGA** | Mantener `role="status" aria-live="polite"`. |
| `[data-field-error="<name>"]` por campo | `Checkout.astro:66, 71, 80, 103, 113`; `CustomSelect.astro:46`; `CountryCodeSelect.astro:43` | `Layout.astro:561, 575, 600` | **CARGA** | El valor debe ser igual al `name`. |
| `aria-invalid="true"` en campos | — | escrito `Layout.astro:576, 588`; estilo `global.css:360` | **CARGA** | |
| `[data-currency-picker] input[name="currency"]`, `[data-currency-option]` | `Checkout.astro:150-160` | `Checkout.astro:218-220, 243-248, 402-407` | **CARGA** | Cada radio debe estar dentro de su `[data-currency-option]` (`closest`, `:246`). Los radios están ocultos visualmente con `opacity:0` (`:529-534`); el foco se ve en el `span` hermano (`:536`). |
| `[data-bold-price]`, `[data-bold-currency]` | `Checkout.astro:145` | `Checkout.astro:207-213` (búsqueda en `document`) | **CARGA** | Pueden moverse a cualquier parte de la página; si se duplican solo se actualiza el primero. |
| `[data-sales-panel]` con valor `form`, `upcoming` o `closed` | `Checkout.astro:116, 122, 126` | `Checkout.astro:297-299` (en `document`) | **CARGA** | `form` debe envolver el botón. Cualquier otro bloque con el atributo también se mostrará/ocultará. |
| `input[name="terms_consent"]`, `input[name="privacy_consent"]` dentro del form | `Checkout.astro:98, 108` | `Checkout.astro:271-274`; `Layout.astro:477, 482, 553-557` | **CARGA** | `Layout` usa `target.form`: deben pertenecer al form. |
| `[data-turnstile-widget]` (`data-sitekey`, `data-action`, `data-turnstile-id`) dentro del form | `Turnstile.astro:32-37` | `Layout.astro:480-481, 496-509, 538, 623-624` | **CARGA** | El token debe quedar dentro del form. |
| `data-custom-select`, `data-select-name`, `data-select-required`, `data-select-message`, `data-select-trigger`, `data-select-trigger-label`, `data-select-value`, `data-select-panel`, `data-select-option` + `data-value` | `CustomSelect.astro:17-58` | `CustomSelect.astro:100-152`; `Layout.astro:580-591` | **CARGA** | El JS alterna `.dropdown-trigger-placeholder` e `.is-active` (`:124, 126, 150-151`). El componente se comparte con el modal de contacto. |
| `data-country-select` (`data-default-dial`, `data-default-iso2`), `data-country-trigger`, `data-country-trigger-label`, `data-country-value`, `data-country-panel`, `data-country-search` (`data-empty-copy`), `data-country-list` | `CountryCodeSelect.astro:25-56` | `CountryCodeSelect.astro:134-269` | **CARGA** | El JS crea `.country-option`, `.country-option-name`, `.country-option-dial`, `.country-empty`, `.is-active` (`:148-161, 170-173`): el CSS nuevo debe apuntar a esas clases. Compartido con el modal. |
| `id="inscripcion"` | `Checkout.astro:29` (en el `.shell`) | `Header.astro:91`; `ServiceHero.astro:38` (vía `squai-one.json:6`); `ServicePayback.astro:31`; `Hero.astro:53` (home: `/servicios/squai-one#inscripcion`); `Layout.astro:85-128` (scroll) | **CARGA** | `scrollToSection` suma el `padding-top` del elemento (`Layout.astro:88`). |
| `data-scroll-to` | Header, ServiceHero | `Layout.astro:121-128` | **CARGA** | |
| `[data-header]`, `.nav-bar`, `[data-hero]` | `Header.astro:13-14`; `ServiceHero.astro:13` | `Layout.astro:81, 130-157` | **CARGA** | El header cambia a `over-hero` mientras se ve el hero. |
| `data-faq-toggle`, `data-faq-panel`, `data-faq-sign` | `Faq.astro:25-34` | `Layout.astro:355-370` | **CARGA** | Componente compartido con la home. |
| `body[data-client-copy]` | `Layout.astro:67` | `Layout.astro:76`; `Checkout.astro:195` | **CARGA** | |
| Eventos `squai:checkout-session`, `squai:checkout-rejected`, `squai:form-sync`, `squai:turnstile-ready`, `window.squaiTurnstileLoad`, `postMessage BOLD_CHECKOUT_EVENT` | — | `Layout.astro:53-57, 547-550, 679, 691-693`; `Checkout.astro:292, 379-382, 412, 423` | **CARGA** | Contrato interno entre los dos scripts. |
| Regla global `[hidden] { display: none !important; }` | `global.css:386` | todo lo que se alterna con `hidden` (paneles de venta, monedas, dropdowns, estados de `/gracias`) | **CARGA** | Si el CSS nuevo pone `display:flex` sin esta regla, se verían paneles que deberían estar ocultos. |
| Clases de reveal: `.section`, `.bento-card`, `.checkout-column`, `:scope > .shell`, `.service-hero-inner` | varios | `Layout.astro:159-213` | LIBRE (solo animación) | Cambiar la estructura cambia qué se anima; `.checkout-column` se anima como bloque (`:175-176`). |
| `.checkout-card`, `.checkout-grid`, `.investment-card`, `.program-detail-card`, `.field-grid-*`, `.consent-row`, `.sales-notice`, ids `checkout-full-name`, `checkout-email`… | `Checkout.astro` y `global.css:325-363` | solo CSS y `for`/`aria-describedby` internos | LIBRE | Si se cambian ids, mantener coherentes `label for`, `aria-describedby` y el `id` del error. |

### 4.2 Lo que lee el servidor

| Dependencia | Estado | Cita |
|---|---|---|
| Nombres y valores de campos (enum de `referral_source`, `COP`/`USD`, regex de `program`) | **CARGA** (contrato público `/api/*`: preguntar antes) | `checkout.schema.ts:19-34`; `common.ts:6-39` |
| `Content-Type: application/json`, cuerpo ≤16 KiB | **CARGA** | `json-request.ts:7-19` |
| `Origin` igual al host | **CARGA** | `same-origin.ts:5-23` |
| Acción Turnstile `checkout` | **CARGA** | `Checkout.astro:94`; `checkout.service.ts:63` |
| Rutas de `src/config/endpoints.ts` y `returnPath` | **CARGA** | `endpoints.ts:1-7`; `checkout.ts:19` |

### 4.3 Lo que leen los tests

| Test | Depende de | Cita |
|---|---|---|
| Textos exactos del CMS | `ui.navigation.program = 'Empieza aquí'`, `ui.checkout.button`, prefijos de casillas, `ui.checkout.status.upcomingTitle/closedTitle`, `thanks.enrolled*` | `test/build/checkout-content.test.ts:18-109` |
| Estructura de `.pages.yml` | etiqueta literal `label: Sección de inscripción`, nodos `currency`, `status`, `thanks` | `checkout-content.test.ts:65-73, 97-108` |
| Sin textos en `src/config/checkout.ts` | ninguna clave con `label` | `checkout-content.test.ts:36-38` |
| Vocabulario prohibido | `test/build/open-program.test.ts` escanea `src`, `public`, `docs`… y falla con ciertas palabras del flujo anterior | `test/build/open-program.test.ts:12-13, 25-39` |
| Ningún test lee el HTML de la página ni sus `data-*` | — | — |

---

## 5. Tests que cubren el flujo

### Hechos

| Archivo | Qué afirma | Capa |
|---|---|---|
| `test/build/checkout-flow.test.ts` | transiciones `idle→paying→retry→paying/idle` y eventos ignorados (`:17-39`); vista del botón por fase y con las dos casillas (`:41-90`); `canReopen` (`:92`); `salesPanel` (`:107-123`); `rejectionAction` y `enrolledUrl` sin order-id (`:125-141`); `thanksStart` (`:143-157`) | lógica pura de `src/lib/checkout-flow.ts` |
| `test/build/bold-checkout.test.ts` | `renderMode: 'embedded'`, monto como texto, `tax` y moneda, `redirectionUrl`, `customerData` como JSON y ausente si no hay datos (`:20-63`) | `src/lib/bold-checkout.ts` |
| `test/build/checkout-content.test.ts` | textos del flujo en el CMS y en `.pages.yml` (ver §4.3) | contenido |
| `test/build/csp-headers.test.ts` | `checkout.bold.co` y `challenges.cloudflare.com` en `script-src`/`frame-src`, hash de script en línea, hash del CSS del modal de Bold calculado desde `test/fixtures/bold-library.js.txt` (`:36-76`) | integración CSP, sobre HTML sintético |
| `test/server/checkout.test.ts` | `/program`: precios por moneda, moneda por país, `upcoming`, 404 (`:100-156`); `/session`: firma y nunca la llave secreta, moneda e IVA, `currency_not_available`, moneda inválida o ausente, descripción desde D1, ignora `amount` del cuerpo, `orderId` único, 404/400 de programa, orden `pending` ligada al cliente, reutiliza cliente por correo, correo inválido sin fila, Turnstile exigido, `409 program_not_open`, `409 already_enrolled` sin revelar la orden, 503 sin llaves (`:158-417`) | API en workerd |
| `test/server/checkout-status.test.ts` | aprueba con APPROVED, no confía en la URL, `pending`/`processing`, no repregunta a Bold con estado final, 404, 400, no devuelve contacto (`:50-138`) | API |
| `test/server/bold-webhook*.test.ts`, `bold.test.ts`, `bold-payment-status.test.ts` | firma de integridad, firma del webhook, idempotencia, anulaciones, consulta de voucher | API |
| `test/server/confirmation-email.test.ts` | un solo correo por aprobación en cualquier orden de webhook/status, sin esperar a Brevo, fallos registrados (`:118-297`) | API |
| `test/server/program-limits.test.ts`, `program-prices.test.ts` | estado `upcoming/open/closed` por fecha, cupo y cierre manual; precio vigente por fecha | servicios |
| `test/server/api.test.ts` | `cross_origin_blocked`, `unsupported_content_type`, rate limit y Turnstile, **solo sobre `/api/contact`** (`:97-160`) | API |

### Huecos

1. **Sin pruebas del DOM ni E2E.** Nada comprueba que `Checkout.astro` emita los `name` que pide `checkoutSessionSchema`, ni los `data-*` de §4.1, ni que el submit de `Layout` y el script de `Checkout` sigan conectados. El restyle es justo la clase de cambio que estos huecos dejan pasar.
2. **Casillas solo en cliente.** No hay test (ni validación de servidor) de que `terms_consent`/`privacy_consent` sean obligatorias; `buttonView` se prueba en abstracto.
3. **Página `/gracias`:** se prueba `thanksStart`, no el sondeo ni los estados del DOM.
4. **`postMessage` de Bold** y la reapertura con la misma sesión: solo cubiertos por la prueba manual (`docs/bold-checkout.md:387-446`).
5. **CSP sobre HTML sintético:** `csp-headers.test.ts` no corre sobre el `dist/` real; no detectaría un recurso externo nuevo de la página.
6. Ningún test de accesibilidad (foco tras error, `aria-live`).

### Recomendaciones

- Antes del restyle, añadir un test de build que lea `dist/servicios/squai-one.html` y compruebe: los `name` del form ⊇ claves de `checkoutSessionSchema` (menos `cf-turnstile-response`), existencia de `#checkout-form`, `#inscripcion`, `[data-bold-checkout]` con sus 7 `data-*`, `[data-form-status]`, un único `button[type=submit]` con `.btn-label`, radios con `form="checkout-form"`, `[data-field-error]` por campo, `[data-sales-panel]` x3. Encaja con el proyecto `build` de `vitest.config.ts:34-40`, aunque exige construir antes (hoy `pnpm verify` corre tests antes del build: `package.json:18`), así que habría que decidir dónde vive.
- Repetir la prueba manual de `docs/bold-checkout.md:387-446` sobre una preview con llaves de pruebas tras el restyle.

---

## 6. Seguridad que un restyle puede tocar sin querer

AGENTS.md pide preguntar antes de tocar Turnstile, rate limiting, el guard de mismo origen, la CSP, `public/_headers` o `robots.txt`.

### Hechos

**CSP generada en build** (`src/integrations/csp-headers.mjs`): reemplaza `# @csp@` de `public/_headers:15` por la política (`csp-headers.mjs:20, 128-131`). Calcula hashes de **todo** `<script>` sin `src` y todo `<style>` del HTML construido (`:40-41, 96-102`); con `inlineStylesheets: 'always'` (`astro.config.mjs:25`) todo el CSS va como `<style>` y se hashea solo. Directivas (`csp-headers.mjs:104-125`):

| Directiva | Valor | Implicación para el restyle |
|---|---|---|
| `script-src` | `'self'` + hashes + `challenges.cloudflare.com` + `checkout.bold.co` | **Bloqueados:** `onclick=""` y otros manejadores en atributos, `javascript:` en enlaces, scripts de terceros (analítica, librerías de animación desde CDN). |
| `style-src` | `'self'` + hashes + `BOLD_MODAL_STYLE_HASH` | **Bloqueados:** hojas de Google Fonts u otro CDN, y `<style>` inyectados en runtime por JS. `BOLD_MODAL_STYLE_HASH` (`:37`) no se toca. |
| `style-src-attr` | `'unsafe-inline'` | `style="..."` sí funciona (lo usa `ServiceHero.astro:30`). |
| `img-src` | `'self' data:` | Imágenes remotas bloqueadas: deben ir en `src/assets` o `public`. |
| `font-src` | `'self'` | Fuentes remotas bloqueadas; las actuales están en `/fonts/` (`Layout.astro:39-40`). |
| `connect-src` | `'self'` + Turnstile + Bold | Ningún `fetch` a terceros. |
| `frame-src` | Turnstile + Bold | Ningún iframe nuevo (vídeo embebido, mapas). |
| `frame-ancestors 'none'` + `X-Frame-Options: DENY` | `csp-headers.mjs:111`; `public/_headers:18` | La página no se puede incrustar en otra herramienta para revisarla. |

Otras cabeceras de páginas: HSTS, `Permissions-Policy` restrictiva (incluye `payment=()`), `Cross-Origin-Opener-Policy: same-origin` (`public/_headers:16-21`).

**Scripts en línea actuales:** los dos `is:inline` de `Layout.astro:41-57` (reveal y callback de Turnstile) y el JSON-LD (`Seo.astro:93`); el resto son módulos procesados por Astro. Cambiar su contenido no rompe nada porque el hash se recalcula en cada build.

**Guard de mismo origen** (`same-origin.ts:5-23`): toda petición a `/api/*` con `Origin` de otro host recibe `403 cross_origin_blocked`. Un prototipo servido desde otro dominio o puerto que llame al Worker fallará. Además `pnpm dev` no sirve `/api` (AGENTS.md); hay que usar `pnpm preview:worker`.

**Rate limiting:** `API_RATE_LIMITER` de 5 peticiones/60 s (`wrangler.jsonc:27-33`) se aplica **solo** a `/api/contact` (`src/server/index.ts:25`). `/api/checkout/session` solo lleva `jsonRequest` (`index.ts:26`) y se apoya en Turnstile. Los tests de checkout rotan la IP (`test/server/checkout.test.ts:9-10, 77`) aunque hoy no haga falta.

**Turnstile:** ver §2. Cambiar el tema o el tamaño se hace en `Layout.astro:510-515`.

### Recomendaciones

- Diseñar con recursos locales (fuentes en `public/fonts`, imágenes en `src/assets`), CSS en `<style>` de componentes o `global.css`, y JS en `<script>` de Astro con `addEventListener`. Así no hay que tocar la CSP.
- Si el diseño pide un recurso de un tercero (fuente, analítica, vídeo), es un cambio de CSP: preguntar y validar con `CSP_REPORT_ONLY=1 pnpm build` (`docs/bold-checkout.md:465-475`).
- No mover el widget de Turnstile fuera del `<form>`; debe seguir visible encima del botón (`Turnstile.astro:11-15`).

---

## Riesgos

| # | Riesgo | Probabilidad en un restyle | Efecto | Mitigación |
|---|---|---|---|---|
| R1 | Reescribir el form sin `Button.astro` y perder `.btn-label`, o poner un segundo `type=submit` | Media | El botón no cambia de texto o el flujo toma el botón equivocado | Mantener `Button.astro` o replicar el `span`; un único submit |
| R2 | Mover los radios de moneda o quitar `id="checkout-form"`/`form=` | Media | `validation_failed` en `currency` y nadie puede pagar | Test de build de §5 |
| R3 | Sustituir `global.css` y perder `[hidden] { display:none !important }` | Media | Avisos de venta, monedas sin precio y estados de `/gracias` visibles a la vez | Conservar la regla |
| R4 | Recurso externo, `onclick=` o estilo inyectado en runtime | Media | Bloqueado por CSP sin error visible en la página | Recursos locales; revisar consola |
| R5 | Cambiar `id="inscripcion"` | Baja | Rompe CTA del header, hero, payback y el enlace de la home | No renombrar, o cambiar `squai-one.json:6` y los 4 sitios a la vez |
| R6 | Restilizar `CustomSelect`/`CountryCodeSelect` cambiando marcado | Media | Afecta también al modal de contacto (Grow/Learn) | Hacer variantes por props o solo CSS con ámbito |
| R7 | Ocultar el estado deshabilitado del botón o el widget de Turnstile | Media | El usuario no entiende por qué no puede enviar | Diseñar el estado disabled y dejar el widget visible |
| R8 | El restyle pasa `pnpm verify` aunque el cableado esté roto | Alta | Se despliega una página que no cobra | Test de DOM + prueba manual en preview |
| R9 | (Preexistente) Sin JS, el form no tiene `method`/`action`: un envío nativo sería `GET` a la misma URL con nombre, correo y teléfono en la query (`Checkout.astro:58`; botón no deshabilitado en HTML, `Button.astro:31`) | Baja | Datos personales en URL y logs | No lo introduce el restyle; decidir aparte |
| R10 | (Preexistente) Cambiar el indicativo en fase `retry` no descarta la sesión: `CountryCodeSelect` no emite `input` al elegir (`CountryCodeSelect.astro:194-199`), a diferencia de `CustomSelect` (`CustomSelect.astro:122`) | Baja | Bold recibe el indicativo anterior en `customerData` y D1 conserva el del envío | Fuera de alcance; anotar |
| R11 | (Doc) `docs/bold-checkout.md:485-486` dice que no se envía correo al comprador, pero #55 ya lo implementa (`docs/bold-checkout.md:181-250`) | — | Confusión al leer la doc | Corregir la doc en otro cambio |

## Preguntas abiertas

1. ¿El rediseño cambia solo Squai One o también los componentes compartidos (`ServiceHero`, `Faq`, `Header`, `Footer`, selects)? Define si hay que regresionar Grow, Learn y la home.
2. ¿Se mantiene la tarjeta de inversión separada del formulario? Si el diseño junta precio y form, los radios pueden pasar dentro del `<form>` (y dejar de necesitar `form=`), pero hay que conservar `[data-currency-picker]`/`[data-currency-option]`.
3. ¿Hace falta un tema oscuro de Turnstile o un aspecto distinto del widget? Implica tocar `Layout.astro:510-515` (pedir aprobación).
4. ¿Se quieren UTM o analítica como parte del rediseño? Hoy no existen; añadirlos cambia la CSP, el esquema de la API y probablemente D1 (migración): tres cosas que AGENTS.md pide preguntar.
5. ¿Deben `terms_consent`/`privacy_consent` validarse y guardarse en el servidor (evidencia de aceptación)? Hoy se descartan (`checkout.schema.ts:16-17`); sería un cambio de contrato y de migración.
6. ¿Se elimina `ContactModal` de esta página, ya que nada lo abre en Squai One (`[slug].astro:99`; `Header.astro:9`)? Ahorra peso pero toca un componente compartido.
7. ¿Dónde viviría el test de DOM propuesto, dado que `pnpm verify` corre los tests antes del build (`package.json:18`)?
