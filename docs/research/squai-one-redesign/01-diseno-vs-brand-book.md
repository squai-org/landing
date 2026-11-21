# Rediseño de Squai One: landing-design frente al brand book

Fuentes primarias, clonadas el 2026-11-20 y leídas como datos (no se ejecutó ningún script, instalación ni build de esos repos):

| Alias | Repo | Commit | Fecha del commit |
| --- | --- | --- | --- |
| **LD** | `squai-org/landing-design` | `9a979d13cdf5e7fe139cdce7613b68acb4d183a9` (`9a979d1`) | 2026-11-20 |
| **BB** | `squai-org/brand-book` | `e93232c0617061ab38376f7f7f3c336ea1bc0658` (`e93232c`) | 2026-11-17 |
| **Repo** | este repo, rama `feat/squai-one` | `f7a7170` | — |

Convención de citas: `LD:src/index.css:290` es `landing-design@9a979d1`, archivo y línea. `BB:md:220` es `brand-book@e93232c/brand-book-definition.md:220`, y `BB:html:295` es `brand-book@e93232c/brand-guideline.html:295`. Ese HTML está minificado y cada sección ocupa una sola línea, así que se cita la línea más el ancla (`#color`). Las rutas sin prefijo son de este repo.

Convención de contenido: **Hecho** es lo que dicen los archivos. **Juicio** es una interpretación razonable que alguien podría discutir. **Recomendación** es una propuesta pendiente de decisión. El análisis es estático: no se renderizó LD. Los contrastes se calcularon con la fórmula de luminancia relativa de WCAG 2.x.

El copy y los datos de la cohorte (fechas, precios, sesiones) quedan fuera de este documento; están en `02-copies-y-terminos.md`.

---

## Resumen ejecutivo: los 10 hallazgos principales

1. **Los hex de LD son exactos (Hecho).** Todos los colores de LD salen de la paleta expandida v8.7, salvo los verdes de WhatsApp y los rojos/verdes semánticos de la propia guía. Un test lo verifica (`LD:src/theme/palette.spec.ts:10-48`), y `LD:public/assets/aistudio/squai-brand-guideline_b4dc2613.html` es idéntico a `BB:brand-guideline.html` salvo el salto de línea final. Las fuentes y el lockup también son correctos (`LD:src/components/SquaiBrand.tsx:55-81`). El problema de LD no está en los tokens, sino en cómo los usa.
2. **El brand book se contradice en el color por servicio (Hecho; decidir).** `BB:md:249-253` dice que Teal y Gold "no identifican One/Grow/Learn". La guía v8.7, más reciente, asigna Periwinkle a One, Teal a Grow y Gold a Learn, y añade la regla "una pieza usa la escala de un solo servicio" (`BB:html:295 #color`, regla 06, y `BB:html:501 #ecosystems`). Según v8.7, LD rompe esa regla porque usa la escala Gold en más de 20 lugares de una página de Squai One (§3, A1). Hace falta una decisión humana antes de fijar la base de diseño.
3. **Las formas no derivan del isotipo (Hecho).** Los fondos son "blobs" orgánicos tomados de la web de referencia (`LD:src/components/Backdrops.tsx:4-14`), y la Unión no aparece en ninguna parte. El brand book exige un sistema derivado de los tres paths del isotipo (`BB:md:263-286`) y lo dice así: "No construimos un universo visual con formas genéricas" (`BB:html:293 #visualdna`).
4. **El Bloque aparece girado en ángulos arbitrarios y en bucle infinito (Hecho).** Hay 13 presets entre −27° y +26° (`LD:src/components/AardvarkPrimitives.tsx:79-378`), el del hero va a 14° (`LD:src/components/AardvarkHero.tsx:87`) y todos oscilan cada ~5 s (`LD:src/index.css:549-567`). El brand book solo permite rotaciones de 0, 90, 180 y 270° (`BB:md:301`), y el Bloque no debe "girar continuamente" ni "rebotar gratuitamente" (`BB:md:688-692`).
5. **Las imágenes contradicen la sección 10 (Hecho).** El hero es una mujer sonriente con un portátil (`LD:public/assets/hero/persona-laptop.webp`, `LD:src/content/landing.ts:73-78`), justo el ejemplo que el brand book manda evitar: "persona feliz mirando laptop" (`BB:md:512`). Hay 12 fotos de stock de Pexels enlazadas en caliente (`LD:src/content/landing.ts:11-13`), y las ilustraciones Open Peeps son el activo principal, aunque la ilustración "no es un activo principal por ahora" (`BB:md:528-530`).
6. **Reducción de movimiento incompleta (Hecho; a11y).** El bucle `.squai-block-drift` no se apaga con `prefers-reduced-motion`: la regla apunta a selectores `.squai-block-tl-*` que no existen (`LD:src/index.css:1046-1061`). La marquesina de fecha y precio se mueve sin fin y no tiene control de pausa (`LD:src/components/AardvarkInteractiveSections.tsx:459-484`), lo que choca con WCAG 2.2.2 (nivel A) y con `BB:md:723-725`.
7. **Foco poco visible (Hecho; a11y).** Los campos del formulario quitan el contorno (`outline-none`) y marcan el foco solo con un cambio de fondo de 1,12:1 (`LD:src/components/SignupFormSection.tsx:333`). El anillo global P11 tiene 2,03:1 sobre el hero Periwinkle y 2,07:1 sobre las bandas P12 (`LD:src/index.css:269-272`), por debajo de 3:1.
8. **Gloria fuera de su rol (Hecho).** LD la usa para el precio y el sticker del hero, los números de paso, testimonios completos y etiquetas del tamaño de un titular, casi siempre girada. El brand book la limita a anotaciones (`BB:md:463-482`), dice que "no reemplaza titulares, cuerpos ni elementos de interfaz" (`BB:html:307 #type`), y v8.7 quitó expresamente la rotación de las anotaciones (commit `caa6b7a`, "Un-rotate handwritten annotations").
9. **LD calca otro sitio (Hecho; riesgo por valorar).** Medidas, botones, fondos y composición se copiaron de `aardvarkbookclub.com` (`LD:src/index.css:67-73`, `LD:src/App.tsx:164`, `LD:src/components/TestimonialsSection.tsx:8`). Eso choca con "Squai no tiene una plantilla. Tiene un sistema" (`BB:md:567`) y abre una pregunta de originalidad o propiedad intelectual que no verifiqué.
10. **Riesgo de datos personales en LD, fuera del diseño (Hecho; urgente si los datos son reales).** El repo público versiona `.squai-store.json` con 8 registros de inscripción (nombre, correo, teléfono) y 207 eventos (`LD:server.ts:43`). Además, el footer manda el correo del newsletter dentro de la etiqueta de analítica (`LD:src/App.tsx:118-121`). No verifiqué si los datos son reales (2 de 8 correos tienen patrón de prueba). Nada de esto debe portarse.

**Recomendación central.** Tomar de LD el orden narrativo, la estructura de secciones, el lockup y los tokens v8.7. No tomar su capa decorativa: blobs, giros, letras que se aplastan, marquesina, fotos de stock ni Gloria como UI. Portarlo como Astro y CSS sobre los tokens de este repo, sin Tailwind ni React, porque eso tocaría límites de "ask before" (§4.4).

---

## 1. Inventario de landing-design

### 1.1 Stack (Hecho)

| Pieza | Valor | Fuente |
| --- | --- | --- |
| Origen | Applet de Google AI Studio (`DISABLE_HMR`, `GEMINI_API_KEY`, `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`) | `LD:vite.config.ts:36-41`, `LD:.env.example`, `LD:metadata.json` |
| UI | React 19 SPA, Vite 8, `@vitejs/plugin-react` | `LD:package.json:16-36` |
| Estilos | Tailwind v4 (`@tailwindcss/vite`, `@theme`) y CSS propio en un solo archivo de 1061 líneas | `LD:src/index.css:1-55` |
| Motion | `motion` 12 (`motion/react`) más keyframes CSS | `LD:package.json:27`, `LD:src/App.tsx:3` |
| Estado y formularios | zustand, @tanstack/react-query, react-hook-form, zod 4 | `LD:package.json` |
| Íconos | lucide-react | `LD:package.json:26` |
| Servidor | Express (`server.ts` vía `tsx`) con persistencia en `.squai-store.json` y firma de Bold | `LD:server.ts:43`, `LD:package.json:7` |
| Pagos | Botón embebido de Bold (`checkout.bold.co/library/boldPaymentButton.js`, `data-bold-button="dark-L"`) | `LD:src/components/SignupFormSection.tsx:58-85` |
| Tests | vitest, Testing Library, axe-core en jsdom; un test de paleta | `LD:src/App.spec.tsx:148-150`, `LD:src/theme/palette.spec.ts` |
| Páginas | Una sola SPA (`index.html`) más dos HTML legales estáticos | `LD:public/politica-de-datos.html`, `LD:public/politica-de-devoluciones.html` |

### 1.2 Secciones en orden (Hecho, `LD:src/App.tsx:132-305`)

| # | Sección (`id`) | Fondo | Contenido y recursos visuales | Fuente |
| --- | --- | --- | --- | --- |
| — | Barra superior | transparente, pills Canvas | Lockup mono→color al hacer scroll, pills de navegación con bloques, CTA oscuro, redes sociales; menú en cajón por debajo de `lg` | `LD:src/components/AardvarkTopBar.tsx` |
| 1 | Hero `#inicio` | P9 `#8A8EF9`, borde inferior redondeado | Blobs P8/P10, arco P10, foto recortada, Bloque Gold a 14°, dos "bloques de datos" en Gloria sobre Midnight (−4° y 3°), parallax | `LD:src/components/AardvarkHero.tsx:34-109` |
| 2 | Lo que incluye `#incluye` | blanco | 4 tarjetas P2/P4/P3/P9 inclinadas ±2°, ilustraciones Open Peeps, bloques que aparecen al hover, CTA que asoma | `LD:src/components/AardvarkSections.tsx:68-152` |
| 3 | Presentación `#presentacion` | P2 `#eef0fd` | Blob blanco, nota Gloria, video o póster de Pexels en un marco blanco girado 2,5°, "logos" de clientes en texto | `LD:src/components/AardvarkInteractiveSections.tsx:34-118` |
| 4 | ¿Es para ti? `#para-ti` | P12 `#303163` | Lista de casos en Familjen grande que pasa a Gloria Gold al hover, 2 fotos Pexels flotantes con momentum, CTA Gold | `…InteractiveSections.tsx:123-271` |
| 5 | Lo que vas a lograr `#logros` | Gold 2 `#fcf6ea` | 5 etiquetas (Midnight, Gold 9, P9, blanco, P12) giradas, entrada elástica con giro aleatorio de ±33° y "momentum hover" | `…InteractiveSections.tsx:285-439` |
| 6 | Cómo funciona `#como-funciona` | banda P2 dentro de blanco | Blob P4, isotipo a color, 4 tarjetas superpuestas P9/blanco, número de paso en Gloria | `LD:src/components/AardvarkSections.tsx:158-260` |
| 7 | Sesiones `#sesiones` | blanco | Carrusel de 8 tarjetas P9/Gold 9/P4/Gold 3 con inclinación según la posición, flechas Midnight, nota Gloria a −10° | `…AardvarkSections.tsx:319-510` |
| 7b | Marquesina (sin `id`) | Gold 9 y Midnight | Dos bandas giradas ±1,4–1,8° con texto en bucle infinito | `…InteractiveSections.tsx:459-484` |
| 8 | Quiénes enseñan `#mentores` | Gold 9 | Blobs Gold 7/6, 2 tarjetas de mentor (marco Gold 3 o blanco), sellos girados 6°, avatar, cita en Gloria, 3 cifras | `…InteractiveSections.tsx:542-656` |
| 9 | Testimonios `#testimonios` | Gold 2 | 3 tarjetas blanco/P2/P4 con bloques; la cita completa va en Gloria | `LD:src/components/TestimonialsSection.tsx:42-106` |
| 10 | Inscripción `#inscripcion` | blanco | Blob Gold 4, selector de moneda en pills P12, formulario, botón de Bold | `LD:src/components/SignupFormSection.tsx:156-449` |
| 11 | Preguntas `#preguntas` | blanco | Blob P2, barra lateral fija con categorías en pills de color, acordeón N1/P2 | `…InteractiveSections.tsx:706-856` |
| 12 | Pie `#contacto` | P12, barra legal Midnight | Lockup a color, datos legales, redes, newsletter, enlaces | `LD:src/App.tsx:165-283` |
| — | Flotantes | — | Botón "volver arriba" (md+), widget de WhatsApp, centro de notificaciones | `LD:src/App.tsx:285-304` |

### 1.3 Componentes (Hecho)

| Componente | Qué hace | Fuente |
| --- | --- | --- |
| `SquaiMark` / `SquaiLockup` | Isotipo de 3 paths (color o mono) y lockup con `1cap`, `gap: calc(1cap*.15)`, `translateY(.03em)`, Familjen 700, −0,055em | `LD:src/components/SquaiBrand.tsx:14-81` |
| `SquaiSingleBlock` / `SquaiCornerBlocks` | Bloque Gold extraído (viewBox `293 298 199 201`) y presets de dos bloques girados detrás de tarjetas y pills | `LD:src/components/AardvarkPrimitives.tsx:31-442` |
| `AardvarkButtonAlt` | Botón de dos piezas (texto y flecha) con radio de 8u, variantes `dark`, `periwinkle`, `marigold` y `white`, y letras que se aplastan al hover | `…AardvarkPrimitives.tsx:505-629` |
| `AardvarkPillButton` | Pill de navegación o filtro con bloques en el estado activo | `…AardvarkPrimitives.tsx:631-707` |
| `SplitBounceText` | Parte el texto en letras `aria-hidden` y deja una copia `sr-only` | `…AardvarkPrimitives.tsx:9-26` |
| `SectionBackdrop` | Blobs SVG en `slice` con "respiración" de trazo de 0 a 60 px | `LD:src/components/Backdrops.tsx` |
| `BadgeRibbonSvg` | Cinta decorativa detrás de la marquesina | `…AardvarkPrimitives.tsx:710-726` |
| `PresentationMedia` | `<video controls>` con `<track>` de subtítulos, o el póster | `LD:src/components/PresentationMedia.tsx` |
| `WhatsAppWidget`, `NotificationCenter` | Diálogo de WhatsApp (`wa.me`) y toasts con `aria-live` | `LD:src/components/WhatsAppWidget.tsx:50,65-66`, `LD:src/components/NotificationCenter.tsx:13` |

### 1.4 Tokens

**Color (Hecho).** `@theme` declara Canvas, Midnight y las escalas Neutral, Periwinkle y Gold de 12 pasos, más Teal 9 y 11 (`LD:src/index.css:3-55`). Los componentes, sin embargo, usan hex literales en clases arbitrarias (`bg-[#303163]`). Uso contado en `src/`: Midnight 91, Canvas 25, N11 23, **Gold 9 22**, **P12 22**, P4 19, P11 18, P9 17, P2 14. El marco declarado es "60-30-10": base blanca/Canvas/N1-3, 30 % Periwinkle y 10 % Gold como acento (`LD:src/index.css:57-65`).

**Tipografía (Hecho).**

| Clase | Fuente / peso | Tamaño (móvil → tablet → desktop) | Leading / tracking | Fuente |
| --- | --- | --- | --- | --- |
| `.aardvark-h1` (hero) | Familjen 700 + `-webkit-text-stroke: .018em` | 52u → 96u → 160u | **0,8** (hero) / −0,05em | `LD:src/index.css:284-299` |
| `.aardvark-h2` | Familjen 700 + trazo .018em | 40u → 40u → 104u | 0,91 / −0,04em | `:307-315` |
| `.aardvark-h3` | Familjen 700 + trazo .012em | 30u → 30u → 40u | 0,98 / −0,02em | `:317-325` |
| `.aardvark-body` | Atkinson 400 | máx(16px, 18u) → máx(16px, 24u) | 1,48 / 0 | `:359-363` |
| `.aardvark-lead` / `.aardvark-medium` | Atkinson | máx(16px, 20u) → máx(16px, 32u) | 1,3 / 0 | `:347-357` |
| `.aardvark-handwritten-lg` | Gloria 400 | máx(16px, 24u) → máx(16px, 32u) | 1,35 | `:371-375` |
| Botones y pills | **Familjen 700**, −0,02em / −0,015em | máx(16px, 17u) → máx(16px, 24u) | — | `LD:src/components/AardvarkPrimitives.tsx:589,673` |

`u` es una unidad de diseño proporcional al ancho de la ventana: `100vw/402` en móvil, `100vw/834` desde 768 px y `100vw/1920` desde 992 px (`LD:src/index.css:74-75,161-163,183-185`).

**Fuentes y carga (Hecho).** Google Fonts por `<link>` con preconnect: Atkinson Hyperlegible Next 400/500/600/700 + itálica 400, Familjen Grotesk 500/600/700 y Gloria Hallelujah (`LD:index.html:13-18`). La itálica no se usa (la única coincidencia es `not-italic`, en `LD:src/App.tsx:181`).

**Espaciado (Hecho).** Todo va en `u`: `--gutter` 16u/24u/40u, `--section-py` 70u/140u, `--band-inset` 16u/24u (`LD:src/index.css:106-108,177,209-211`). No hay una escala de espaciado fija y los valores no tienen tope por arriba.

**Radios (Hecho).** Tarjeta 32u, banda y borde de sección 32u → **160u** en desktop, input 13,5u → 25u, botón 8u, pills `rounded-full`, FAQ 16u/24u, más radios fijos sueltos (`rounded-[32px]`, `[28px]`, `[22px]`, `2xl`, `3xl`) (`LD:src/index.css:91,102-105,110,115,207-208,213,218`).

**Sombras (Hecho).** Utilidades de Tailwind: `shadow-xl` ×8, `shadow-2xl` ×7, `shadow-lg` ×2. No hay tokens propios.

**Breakpoints (Hecho).** Hay dos sistemas superpuestos: el CSS cambia `u` en **768 y 992 px**, y Tailwind usa sus valores por defecto (sm 640, md 768, **lg 1024**, xl 1280), con 119 usos de `sm:`, 102 de `lg:`, 8 de `md:` y 3 de `xl:`. Hay además `min-[380px]` y `max-[379px]`.

**Motion (Hecho).** Curvas `--ease-smooth (.32,.72,0,1)`, `--ease-bounce (.34,1.57,.64,1)` y `--button-ease-bounce (.34,2.27,.64,1)`, que rebotan por encima del valor final (`LD:src/index.css:153-158`). En los hovers, transiciones de 0,15 a 0,62 s. En bucle infinito: deriva de los bloques (4,3–5,1 s), blobs (6 s) y marquesina (26 y 30 s) (`:549-567`, `:980-1020`, `:1025-1044`). Con `motion` hay springs con rebote (`bounce: .45`), parallax por scroll, letras que se aplastan con `scaleY(.32)` y un giro de 16° (`:428-441`), y la entrada de las etiquetas de logros con un giro aleatorio de ±33° (`LD:src/components/AardvarkInteractiveSections.tsx:381,421-423`).

### 1.5 Estilo del formulario (Hecho, `LD:src/components/SignupFormSection.tsx`)

- **Campos.** Nombre, correo, WhatsApp y moneda; la moneda se elige con dos pills `aria-pressed` con borde P12 de 2 px (`:182-211`). No hay casillas de consentimiento: solo un texto con enlace (`:392-400`).
- **Inputs.** `aardvark-input`, con alto de 51u → 58u → 80u, radio 13,5u → 25u y sin borde. Fondo P3 `#e1e4fd`, foco con fondo P4 y **`outline-none`**. Placeholder N11 (`:333,358,382`; `LD:src/index.css:398-405`).
- **Labels.** Familjen 700 asociado con `htmlFor`, `autocomplete` correcto, `aria-invalid`, `aria-describedby` y errores en `#9b1c1c` con `role="alert"` (`:319-389`). Los obligatorios no se marcan visualmente ni llevan `required`.
- **Envío.** `AardvarkButtonAlt` oscuro a todo el ancho, con etiqueta corta en móvil (`:411-437`). Debajo, una nota de seguridad con candado P11 (`:439-442`).
- **Newsletter del footer.** Placeholder N9 `#7a7f9c` sobre blanco y la misma `outline-none` (`LD:src/App.tsx:241-249`). No tiene backend: solo muestra un toast y envía analítica (`:107-128`).

### 1.6 Comportamiento por breakpoint (Hecho, lectura del código; no renderizado)

| Rango | Comportamiento |
| --- | --- |
| < 640 | 1 columna en todo. Menú en cajón (`AardvarkTopBar.tsx:151-214`). Hero de `100svh` (mín. 640 px) con la foto debajo del texto. Etiqueta corta en el CTA de envío. Carrusel con imán (`snap-mandatory`). |
| 640–767 | Cómo funciona en 2 columnas (`sm:grid-cols-2`). Tarjetas de mentor a escala 1,3 (`@media (min-width:40rem)`, `LD:src/index.css:409-417`). |
| 768–991 | `u = 100vw/834`. Lo que incluye en 2 columnas (`md:`). Testimonios en 3 columnas. Botón "volver arriba" visible. |
| 992–1023 | Ya rige la escala de desktop (`u = 100vw/1920`), pero el layout sigue siendo el de tablet porque `lg` empieza en 1024 (riesgo, §3 A12). |
| ≥ 1024 | Navegación en pills y redes visibles. El logo y las redes se esconden al hacer scroll. Hero de altura `1100u` con la foto a la derecha. Tarjetas de flujo superpuestas en 4 columnas. FAQ con barra lateral fija (4/8). Carrusel arrastrable con el mouse. |
| ≥ 1280 | Mentores en 2 columnas (`xl:grid-cols-2`). |

### 1.7 Rasgos de accesibilidad (Hecho)

| Rasgo | Estado | Fuente |
| --- | --- | --- |
| Idioma | `lang="es"` | `LD:index.html:2` |
| Enlace para saltar al contenido | **No existe** (búsqueda sin resultados en `src` e `index.html`) | — |
| Landmarks | `header`, `nav` con `aria-label`, `main`, `footer`, secciones con `aria-labelledby` | `LD:src/App.tsx:134,165-168` |
| Foco | `:focus-visible` 2 px P11 con offset de 3 px en `@layer base`; los inputs lo anulan con `outline-none` | `LD:src/index.css:269-272` |
| Movimiento reducido | `MotionConfig reducedMotion="user"`, comprobación de `matchMedia` en el carrusel y en el momentum, y hovers en `@media (prefers-reduced-motion: no-preference)`. La lista de `reduce` deja fuera `.squai-block-drift` | `LD:src/App.tsx:312`; `LD:src/index.css:1046-1061` |
| Texto animado | `SplitBounceText` y la marquesina tienen copia `sr-only` | `…AardvarkPrimitives.tsx:12-13`; `…InteractiveSections.tsx:462-463` |
| Carrusel | `role="region"`, `aria-roledescription`, `tabIndex=0` y flechas con `aria-label` | `…AardvarkSections.tsx:427-440,512-536` |
| Tamaño de toque | Mínimo de 44 px en las variables de botón, pill e input | `LD:src/index.css:88-95,114` |
| Texto mínimo | 16 px en lectura y 14 px en etiquetas, salvo las notificaciones (`text-xs`) | `LD:src/index.css:68-73`; `LD:src/components/NotificationCenter.tsx:36` |
| Estructura | Las tarjetas de "incluye" son un `<button>` con un `<h3>` dentro, y el encabezado pierde su semántica de heading. `aria-current="page"` se usa en anclas internas | `…AardvarkSections.tsx:112-133`; `…AardvarkPrimitives.tsx:688` |
| Test automático | axe en jsdom; ahí no se evalúa el contraste porque jsdom no calcula estilos | `LD:src/App.spec.tsx:148-150` |

---

## 2. Brand book: reglas autoritativas

El brand book tiene dos documentos con fechas distintas. `brand-book-definition.md` es la estrategia completa y no cambia desde `5daf086` (2026-09-07). `brand-guideline.html` es la guía visual v8.7, con sus últimos cambios el 2026-11-16 y 17. Donde la guía deja una sección vacía (composición, motion, niveles de expresión), la única fuente es el `.md`.

### 2.1 Paleta (Hecho)

| Rol | Nombre | Hex | Fuente |
| --- | --- | --- | --- |
| Core | Periwinkle | `#8A8EF9` | `BB:md:220`, `BB:html:11` |
| Core | Midnight | `#0A0C1A` | `BB:md:221` |
| Acento | Teal | `#44D4C8` | `BB:md:225` |
| Acento | Gold | `#F9C24D` | `BB:md:226` |
| Canvas Light (fondo principal del estado Light) | — | `#F4F6FF` | `BB:md:234-236` |

**Paleta expandida v8.7 (Hecho, `BB:html:295 #color`).** Hay 12 pasos por escala, generados en OKLCH, y el paso 9 es siempre el hex de marca. Las escalas son Neutral (derivada de Midnight), Periwinkle, Teal y Gold, con el mismo bloque de tokens CSS que LD copia en `LD:src/index.css:12-54`. Cada paso tiene un rol: 1 fondo de página, 2 fondo sutil, 3-5 componentes, hover y activo, 6-8 bordes, 9 sólido, 10 hover del sólido, 11 texto de bajo contraste e íconos, 12 texto de alto contraste. El alcance es web en fondo claro con WCAG AA, y la guía no incluye colores semánticos ("son de producto").

**Reglas de uso de color (Hecho, `BB:html:295 #color`).**

| N.º | Regla | Ratios que da la guía |
| --- | --- | --- |
| 01 | Texto de cuerpo sobre Canvas: Midnight o N12; secundario: N11 | 18,02 / 15,28 / 6,59 |
| 02 | Texto de color: paso 11 o 12; **el paso 9 nunca es texto sobre claro** | P9 2,66, Teal 9 1,69, Gold 9 1,52 |
| 03 | Sobre un paso 9 (botones, etiquetas, bloques) el texto es **Midnight, nunca blanco** | Midnight: 6,77 / 10,64 / 11,90; blanco: 2,87 / 1,83 / 1,63 |
| 04 | Fondos claros con los pasos 2-3; título con el paso 12 y texto con el 11 | P11/P3 4,64; Teal 11/T3 4,63; Gold 11/G3 4,60 |
| 05 | Bordes decorativos con los pasos 6-8; íconos informativos con el 11 o 12 (≥ 3:1) | Teal 11 sobre Canvas 4,96 |
| 06 | **Un servicio por pieza**: los pasos de una sola escala de servicio, más neutros y Midnight. "Los tres colores de servicio no se mezclan como fondos." | — |

Y en `BB:html:501 #ecosystems`: "Regla: una pieza usa la escala de un solo servicio. Las piezas de la marca madre Squai usan Periwinkle + Midnight; se distinguen de Squai One por el lockup sin descriptor."

### 2.2 Tipografía (Hecho)

| Rol | Fuente | Peso | Tracking | Leading | Fuente de la regla |
| --- | --- | --- | --- | --- | --- |
| Wordmark | Familjen Grotesk | 700 | −0,055em | 1,00 | `BB:html:456` |
| Hero / statement | Familjen Grotesk | 700 | −0,050em | 0,95 | ídem |
| Section heading | Familjen Grotesk | 700 | −0,040em | 0,91 | ídem |
| Label / eyebrow | Familjen Grotesk | 700 | +0,12em | 1,00 | ídem |
| Body | Atkinson Hyperlegible Next | 400 | 0 | 1,48 | ídem |
| Secondary display | Atkinson Hyperlegible Next | 400 | −0,020em | 1,04 | ídem |
| UI / emphasis | Atkinson Hyperlegible Next | 500 | 0 | 1,30 | ídem |
| Human annotation | Gloria Hallelujah | Regular | 0 | 1,35 | ídem |

- **Usos.** Familjen es para el wordmark, titulares, statements, nombres de ecosistema, cifras y labels destacados (`BB:md:442-450`). Atkinson es para cuerpo, UI, tablas y captions (`BB:md:452-461`). Gloria es para anotaciones, observaciones, comentarios y énfasis puntuales (`BB:md:463-469`).
- **Principios** (`BB:md:475-482`): "Cada fuente tiene una función inequívoca", "La lectura larga debe sentirse fácil", "Gloria interrumpe; no domina" y "Mientras más fuerte el titular, más silencioso su entorno".
- La guía añade que Gloria "No reemplaza titulares, cuerpos ni elementos de interfaz" (`BB:html:307 #type`).
- La guía misma carga las fuentes desde Google Fonts (`BB:html:7-9`). Eso es cómo se publica la guía, no una regla para el sitio.

### 2.3 Logo (Hecho)

- El lockup combina el isotipo SVG maestro (3 paths) con "Squai" en **Familjen Grotesk 700**, con un espaciado de **0,15 H**, donde H es la altura visible del isotipo. La alineación es óptica y la geometría del isotipo no se toca (`BB:md:430-440`, `BB:md:581-587`). La guía lo implementa con `width/height: 1cap`, `gap: calc(1cap*.15)` y `translateY(.03em)` (`BB:html:21-22,113`). Su anotación dice "H = altura de la S" (`BB:html:76`).
- El lockup principal usa "exactamente #8A8EF9 y #F9C24D" (`BB:html:294 #logo`).
- **Variantes publicadas en v8.7**: Primary sobre Light, Primary sobre Blanco, Monochrome sobre Light (Midnight) y Monochrome sobre color de marca (Midnight sobre Periwinkle) (`BB:html:294`). La versión v8.5 tenía un escenario oscuro (`.mark-stage.dark`); v8.7 lo eliminó ("Remove dark backgrounds across the guideline (… logo variants, dark surfaces)", commit `caa6b7a`).
- Los ecosistemas son "extensiones nominales de Squai, no logotipos independientes" (`BB:md:587`).

### 2.4 Formas (Hecho, `BB:md:261-338`)

- Las piezas madre son el **Bloque** (el primer path Gold) y la **Unión** (el path Periwinkle).
- Operaciones permitidas: repetición, escalado uniforme, **rotación ortogonal 0/90/180/270°**, encadenamiento y replicación desde nodos.
- Prohibido: deformar, gradientes, varios colores en una pieza, superposiciones que destruyan el borde, 3D, sombras gruesas y efectos decorativos.
- Principio: "Squai construye, no adorna" (`BB:md:326`).
- La guía insiste en "Bloque + Unión. Extraídos, no reinterpretados" (`BB:html:295 #shapedna`) y en "No construimos un universo visual con formas genéricas" (`BB:html:293`).

### 2.5 Composición, espacio y componentes (Hecho)

- **Composición.** Retícula invisible y 80 % estabilidad / 20 % ruptura (`BB:md:348-358`). "Las formas pueden romper el grid; el texto no" (`BB:md:384`). **Alineación predominantemente izquierda** (`BB:md:407-409`).
- **Bento y tarjetas.** El bento se usa solo si ayuda; las tarjetas pueden ser silenciosa, estructural o expresiva (`BB:md:393-401`).
- **Landing.** Hero con statement y forma propietaria, alternancia narrativa Light/Night, bento solo cuando ayuda, y nada de mockups de interfaces falsas (`BB:md:608-614`). La intensidad normal es **Character** (`BB:md:623-636`).
- **Sin definir.** El espaciado, los radios, las sombras y los breakpoints no tienen valores: "se resolverán mediante prototipos y pruebas de aplicación" (`BB:md:806`). Las secciones de composición, motion, niveles y referencias de la guía están vacías (`BB:html:484-500`).

### 2.6 Imagen, tono y motion (Hecho)

- **Imagen** (`BB:md:486-543`). Fotografía documental ligera. Evitar robots, cerebros, circuitos, hologramas y "stock genérico de 'persona feliz mirando laptop'". La ilustración no es un activo principal. Regla: "Si una imagen parece stock genérico, no es Squai".
- **Tono** (`BB:md:79-113`). El experto cercano, con voz humana, directa, juguetona, curiosa y "sin humo". "Nunca impresionar antes que enseñar." Valor de Honestidad: "No exagerar…" (`BB:md:74-75`).
- **Motion** (`BB:md:654-725`). "Squai no anima objetos. Construye relaciones." Ágil, no frenético. El Bloque no rebota, no gira continuamente y no se deforma. Atkinson se mueve mínimamente. "La animación nunca debe retrasar la comprensión." El motion debe poder reducirse.

### 2.7 Cambios recientes (Hecho, `git log` de BB)

| Commit | Fecha | Cambio |
| --- | --- | --- |
| `a5030e0` | 2026-11-16 | v8.5: lockup con `1cap`, gap `calc(1cap*.15)` y alineación óptica `translateY(.03em)`; sistema de composición con plantillas |
| `93e04ba` | 2026-11-16 | Sección de color ampliada con la paleta completa; vacía las secciones 12, 16 y 17 (quita las plantillas incrustadas) |
| `caa6b7a` | 2026-11-16 | **v8.7**: quita los fondos oscuros (secciones, tarjetas, variantes de logo); quita eyebrows; **quita la rotación de las anotaciones manuscritas**; escalas regeneradas en OKLCH; reglas de color con ejemplos sí/no y ratios recalculados; tipografía limitada a pares verificados; **sección 18: un color de servicio por ecosistema** |
| `1a8026d` | 2026-11-16 | Responsive de la guía (360-1024 px) |
| `4a6758e` | 2026-11-16 | Todas las secciones sobre Canvas; quita las secciones 09 (Building) y 19 (Rules); **vacía Motion** |
| `6dbcacf` | 2026-11-17 | Limpieza y minificado sin cambio visual ("pixel-identical a 1440, 768 y 375 px") |

### 2.8 Contradicciones internas del brand book (Hecho)

| Tema | `brand-book-definition.md` (sep.) | `brand-guideline.html` v8.7 (nov.) |
| --- | --- | --- |
| Color por servicio | Los acentos "no identifican One/Grow/Learn" y "no tienen significado semántico obligatorio" (`BB:md:249-253`) | Periwinkle es One, Teal es Grow y Gold es Learn; "una pieza usa la escala de un solo servicio" (`BB:html:295,501`) |
| Night | Squai Light / Squai Night son dos estados expresivos; Landing alterna Light/Night (`BB:md:214-216,611`) | Sin superficies oscuras ni variantes de logo sobre oscuro (`caa6b7a`), y no define pares sobre Midnight más allá del texto sobre paso 9 |
| Motion y composición | Reglas completas (`BB:md:342-413,654-725`) | Secciones vacías (`BB:html:484-500`) |
| Definición de H | "altura visible del isotipo" (`BB:md:438`) | "altura de la S" (`BB:html:76`). En la práctica es lo mismo con `1cap` |

---

## 3. Auditoría: dónde LD se desvía del brand book

Severidad: **Alta** si contradice una regla no negociable, rompe WCAG A/AA o expone datos; **Media** si contradice una regla explícita sin afectar el acceso; **Baja** si es de forma o nomenclatura. Tipo: **Error** (cierto, contra una regla escrita o una medición) o **Juicio**.

### 3.1 Lo que LD hace bien (Hecho)

- Todos los hex pertenecen a la paleta v8.7 (`LD:src/theme/palette.spec.ts`), así que no hay hex incorrectos.
- Usa las tres familias correctas, con Familjen 700 en los titulares y Atkinson con leading 1,48 en el cuerpo.
- El lockup sigue la regla exacta: `1cap`, 0,15 H, −0,055em, `translateY(.03em)` (`LD:src/components/SquaiBrand.tsx:55-81`). Usa la variante mono Midnight sobre el hero Periwinkle y la variante color sobre Canvas al hacer scroll (`LD:src/components/AardvarkTopBar.tsx:95-99`), dos variantes publicadas.
- Sobre los pasos 9 el texto siempre es Midnight (regla 03), y el texto de color usa P11 o P12 (regla 02). Los textos de lectura miden 16 px o más.
- La marquesina y las letras animadas tienen equivalente para lector de pantalla. El formulario tiene labels, `autocomplete`, `aria-invalid` y errores anunciados.

### 3.2 Desvíos

| ID | Sev. | Tipo | Desvío | Evidencia en LD | Regla del brand book / WCAG |
| --- | --- | --- | --- | --- | --- |
| A1 | Alta | Error respecto a v8.7; Juicio respecto al `.md` | **Mezcla de escalas de servicio.** La escala Gold (Squai Learn) aparece en la banda de mentores (Gold 9 entera), logros y testimonios (Gold 2), la marquesina (Gold 9), 2 de 4 tarjetas de sesión, la categoría "Programa" del FAQ, el fondo de inscripción (Gold 4), el Bloque del hero, los CTA `marigold`, los hovers y enlaces del footer y la flecha de los botones oscuros. LD lo presenta como "10 % acento", pero es bastante más | `…InteractiveSections.tsx:190,264,293,387,464,525,536,546,549`; `…AardvarkSections.tsx:286,296`; `…TestimonialsSection.tsx:28,48`; `…SignupFormSection.tsx:162`; `…InteractiveSections.tsx:685-688`; `…AardvarkHero.tsx:87`; `LD:src/App.tsx:188,202,212,218,253`; `…AardvarkPrimitives.tsx:527` | Regla 06 y §18 (`BB:html:295,501`). Según el `.md` sería válido como acento, pero "un acento debe sentirse como una decisión" (`BB:md:257`) |
| A2 | Alta | Error | **Formas genéricas, no derivadas.** Fondos orgánicos (`SectionBackdrop`, 5 formas) y una cinta copiados de la referencia, con "respiración" que engorda el trazo. La Unión no se usa nunca | `LD:src/components/Backdrops.tsx:4-14,99-123`; `…AardvarkPrimitives.tsx:710-726`; búsqueda de "union" sin resultados | `BB:md:263-286`, `BB:md:312-322`, `BB:html:293,295` |
| A3 | Alta | Error | **Bloque girado en ángulos no ortogonales y animado en bucle.** Presets entre −27° y +26°, hero a 14°, y deriva infinita con `rotate ± rotDelta` y `scale(1.07)` | `…AardvarkPrimitives.tsx:79-378,421-431`; `…AardvarkHero.tsx:87`; `LD:src/index.css:549-567` | `BB:md:301` (rotación 0/90/180/270), `BB:md:688-692` (no rebotar, no girar continuamente) |
| A4 | Alta | Error | **Imagen.** Hero "mujer sonriente sostiene su portátil", 12 fotos de stock de Pexels (6 casos × 2) más el póster del video, e ilustraciones Open Peeps como activo principal en 16 tarjetas | `LD:src/content/landing.ts:11-13,73-78,139,161-224`; `LD:public/illustrations/CREDITOS.md`; `…AardvarkSections.tsx:265-266` | `BB:md:512` (persona feliz mirando laptop), `BB:md:528-530`, `BB:md:543` |
| A5 | Alta | Error (a11y) | **Movimiento que no se puede detener.** `.squai-block-drift` sigue animándose con `reduce` (la regla apunta a `.squai-block-tl-*`, que no existen). La marquesina dura más de 5 s y no tiene pausa. Los blobs y la marquesina sí se apagan con `reduce`, pero 2.2.2 pide un mecanismo de pausa también sin esa preferencia | `LD:src/index.css:564-567,1046-1061`; `…InteractiveSections.tsx:459-484` | `BB:md:723-725`; WCAG 2.2.2 Pause, Stop, Hide (A); 2.3.3 (AAA) |
| A6 | Alta | Error (a11y) | **Foco.** (a) Inputs del formulario y del newsletter con `outline-none`; el foco se ve solo por un cambio de fondo P3→P4 de 1,12:1. Hay que confirmarlo en el navegador, porque `outline-none` en Tailwind v4 compila a `outline-style: none` y la capa `utilities` gana a la `base`. (b) El anillo P11 tiene 2,03:1 sobre P9 (hero) y 2,07:1 sobre P12 (para ti, footer) | `…SignupFormSection.tsx:333,358,382`; `LD:src/App.tsx:248`; `LD:src/index.css:269-272` | WCAG 2.4.7 Focus Visible (AA); 1.4.11 Non-text Contrast (AA, 3:1); 2.4.13 (AAA) |
| A7 | Media | Error | **Gloria fuera de su rol.** Precio y "Sin saber programar" como bloques de datos del hero; número de cada paso; testimonios completos (cuerpo); etiquetas de público al 80 % de un h2; citas de mentores. Unas 24 apariciones en la página, desde 14 lugares del código | `…AardvarkHero.tsx:100-106`; `LD:src/content/landing.ts:69,80`; `…AardvarkSections.tsx:232`; `…TestimonialsSection.tsx:85`; `…InteractiveSections.tsx:231-236,624` | `BB:md:463-482`; `BB:html:307` ("no reemplaza titulares, cuerpos ni elementos de interfaz") |
| A8 | Media | Error | **Gloria girada.** −1,5°, −1,6°, 1,8°, −2°, −4°, −10°, más los bloques del hero a −4° y 3° | `…AardvarkSections.tsx:84,183,410,418`; `…InteractiveSections.tsx:59,72,153`; `…AardvarkHero.tsx:101,104` | v8.7 quitó la rotación de las anotaciones (commit `caa6b7a` de BB) |
| A9 | Media | Error | **Tipografía de display alterada.** `-webkit-text-stroke` de .012 a .02em engrosa Familjen por encima de 700. Hero con leading 0,8 (la guía dice 0,95), con riesgo de choque en tildes y "¿" | `LD:src/index.css:290,297-299,313,323,333,343` | `BB:html:456` (700; hero 0,95) |
| A10 | Media | Error | **UI en Familjen.** Botones, pills, labels del formulario y preguntas del FAQ van en Familjen 700. Atkinson es la fuente de UI | `…AardvarkPrimitives.tsx:589,673`; `…SignupFormSection.tsx:321`; `…InteractiveSections.tsx:813` | `BB:md:452-461`; `BB:html:456` (UI = Atkinson 500) |
| A11 | Media | Error | **Composición centrada y texto girado.** 7 de 11 encabezados de sección van centrados (incluye, presentación, para ti, logros, sesiones, mentores, testimonios), y hay tarjetas de texto, etiquetas, la marquesina, sellos y el marco del video girados | `…AardvarkSections.tsx:76,409`; `…InteractiveSections.tsx:45,149,393,552`; `…TestimonialsSection.tsx:52`; tarjetas `tilt` en `…AardvarkSections.tsx:32-54` | `BB:md:407-409` (izquierda), `BB:md:384` (el texto no rompe el grid) |
| A12 | Media | Juicio (a11y), sin verificar en navegador | **Tamaños en `vw` sin tope.** Los titulares son solo `calc(var(--u)*N)` sin mínimo en px, así que al hacer zoom crecen menos que el resto: con zoom al 200 % a 1920 px, el h1 pasa a ~1,38× y no a 2×. Hay además un desfase de breakpoints (992 frente a 1024) | `LD:src/index.css:74-77,183-187` | WCAG 1.4.4 (técnica de fallo F94) |
| A13 | Media | Juicio | **Motion "frenético".** Letras aplastadas y giradas en cada botón y pill, springs con rebote, giro aleatorio de ±33°, momentum, parallax y tarjetas que se reordenan al hover | `LD:src/index.css:428-441,536-541`; `…InteractiveSections.tsx:313-375,381-423` | `BB:md:658`, `BB:md:699-716` ("ágil, no frenético", "Atkinson debe moverse mínimamente") |
| A14 | Media | Juicio | **P12 como superficie "Night".** La banda "para ti" y el footer van en P12 `#303163`, y la paleta asigna al paso 12 el texto, no los fondos. En el `.md`, Night es Midnight | `…InteractiveSections.tsx:144`; `LD:src/App.tsx:168`; `LD:src/index.css:61` | Roles por paso (`BB:html:295`); `BB:md:214-221` |
| A15 | Media | Juicio | **Lockup a color sobre P12 en el footer.** No es una variante publicada en v8.7. El isotipo Periwinkle tiene 4,19:1 sobre P12 (pasa 3:1) | `LD:src/App.tsx:176` | `BB:html:294` (4 variantes) |
| A16 | Media | Juicio (riesgo) | **Plantilla de un tercero.** Medidas, botones, fondos y layout calcados de `aardvarkbookclub.com`. No verifiqué si los paths SVG son copia literal | `LD:src/index.css:67-73`; `LD:src/App.tsx:164`; `…InteractiveSections.tsx:660-662`; `LD:src/components/Backdrops.tsx:4` | `BB:md:567` ("no tiene una plantilla"); `BB:md:806` |
| A17 | Media | Juicio | **Base blanca en lugar de Canvas.** `html` y la raíz de la app usan `#FFFFFF`, y Canvas solo aparece en `body` (que la raíz tapa) | `LD:src/index.css:258-262`; `LD:src/App.tsx:131`; `LD:index.html:22` | `BB:md:234-236` (Canvas es el fondo principal Light) |
| A18 | Baja | Error (a11y) | **Placeholder del newsletter** en N9 sobre blanco: 3,93:1 | `LD:src/App.tsx:248` | WCAG 1.4.3 (4,5:1) |
| A19 | Baja | Juicio (a11y) | **Semántica.** No hay enlace para saltar al contenido (los landmarks bastan como técnica ARIA11, así que no es un fallo estricto de 2.4.1). Las tarjetas "incluye" son `<button>` con un `<h3>` dentro. `aria-current="page"` en anclas. Los campos obligatorios no se indican (3.3.2) | `…AardvarkSections.tsx:112-133`; `…AardvarkPrimitives.tsx:688`; `…SignupFormSection.tsx:318-389` | WCAG 1.3.1, 2.4.1, 3.3.2 |
| A20 | Baja | Juicio | **Bloque de marca en verde WhatsApp** (`#25D366`) en el widget y el botón flotante | `LD:src/components/WhatsAppWidget.tsx:71,129` | Piezas monocromas en color de marca (`BB:md:314`, `BB:md:745`) |
| A21 | Baja | Juicio | **Sombras gruesas** (`shadow-2xl` ×7) en tarjetas, fotos y avatares | conteo en `LD:src/` | `BB:md:322` (evitar sombras gruesas; la regla habla de las formas) |
| A22 | Baja | Error de nomenclatura | Gold se llama "Marigold" (variante `marigold`, comentario del logo) | `LD:src/components/SquaiBrand.tsx:10`; `…AardvarkPrimitives.tsx:535` | `BB:md:226` ("Gold") |
| A23 | Alta | Error (fuera de diseño) | **Datos y afirmaciones.** `.squai-store.json` con PII en un repo público. Correo del newsletter dentro de la etiqueta de analítica. Logos de clientes inventados ("Nodo", "Aula 21"…), cifras de muestra ("1.200+ personas formadas") y un NIT de relleno `901.000.000-0`. Los datos de muestra están marcados como `MUESTRA` | `LD:.squai-store.json`; `LD:server.ts:43`; `LD:src/App.tsx:118-121`; `LD:src/content/landing.ts:148-150,380-383,520-521` | Valor Honestidad (`BB:md:74-75`); AGENTS.md: "No unverified facts in JSON-LD" |

### 3.3 Contrastes medidos (Hecho; cálculo propio con la fórmula WCAG)

| Par | Ratio | Resultado |
| --- | --- | --- |
| Anillo de foco P11 `#5a5bb6` / P9 `#8A8EF9` | 2,03 | Falla 3:1 |
| Anillo de foco P11 / P12 `#303163` | 2,07 | Falla 3:1 |
| Foco de input P4 `#d2d7fc` / reposo P3 `#e1e4fd` | 1,12 | Foco imperceptible |
| Fondo de input P3 / blanco (contorno del campo) | 1,26 | Juicio 1.4.11; el campo tiene label visible |
| Placeholder N9 `#7a7f9c` / blanco | 3,93 | Falla 4,5:1 |
| Gold 9 / P12 (texto manuscrito y hovers) | 7,36 | Pasa |
| P4 / P12 (texto secundario) | 8,52 | Pasa |
| N11 / P2 (respuestas del FAQ) | 6,26 | Pasa |
| P11 / P2, P11 / Gold 2 (notas manuscritas) | 5,13 / 5,41 | Pasa |
| Midnight / P9, Midnight / Gold 9 | 6,77 / 11,90 | Pasa (igual que la guía) |

---

## 4. Correspondencia con este repo

### 4.1 Cómo se estiliza hoy (Hecho)

- **CSS global.** `src/styles/global.css` es un archivo de CSS propio, sin Tailwind, que importa `src/layouts/Layout.astro:2`. El resto del CSS va en bloques `<style>` con alcance de componente. Astro incrusta el CSS en el HTML (`astro.config.mjs:25`).
- **Fuentes.** Las tres familias de marca están **auto-alojadas** en `public/fonts/*.woff2`. Familjen es variable 400-700, Atkinson 200-800 normal y Gloria 400 (`src/styles/global.css:1-50`). Hay `preload` de Familjen y Atkinson latin (`src/layouts/Layout.astro:39-40`).
- **Tokens** (`src/styles/global.css:52-113`). Core y acentos correctos. Las escalas son **propias y anteriores a v8.7**: `--periwinkle-ink #4C50D8`, `--periwinkle-deep #3A3EC4`, `--ink-body #4B5167`, `--ink-muted #5F657A` (el `--muted` de v8.5), `--night-surface #12162A`, `--teal-ink #12796F` y `--gold-ink #7A5A0C`. Radios de 8/14/24/32/40/100 px. Tipos fluidos con `clamp()` y tope en px (`--t-display` 44-200 px, `--t-h2` 28-58 px…). Espaciado con `--gutter` `clamp(20px, 4.2vw, 72px)` y `--section-gap`. Dos sombras suaves (`--shadow-card`, `--shadow-lift`).
- **Layout.** `.content-shell` (máx. 1600 px), `.section` redondeada, `.night` en Midnight, `.tint` en Canvas y una `.bento` de 6 columnas. Breakpoints en 1100, 1023, 900 y 640 px (`src/styles/global.css:146-213,488-513`; `src/components/Header.astro:211`).
- **Página de servicio.** `src/pages/servicios/[slug].astro:57-100` monta Header → ServiceHero (Midnight) → ServicePayback → ServiceBento (`dark`) → ServiceCapabilities → Checkout (o contacto por modal) → Faq → Footer → ContactModal.
- **Componentes compartidos.** `Header`, `Footer`, `Logo`, `Button` (variantes primary, gold, teal, dark, ghost y white), `Faq`, `Checkout` (Turnstile, selector de país, dos casillas de consentimiento), `Team` (fotos en `src/assets`), `ContactModal` y `Seo`.
- **Movimiento.** Las entradas `.reveal` se activan solo si no hay `reduce` (`src/layouts/Layout.astro:41-52`; `src/styles/global.css:450-472`).
- **Foco actual.** `.btn` tiene doble anillo Canvas + `#4C50D8` (5,65:1 sobre Canvas, `global.css:273-277`). El resto usa un contorno Periwinkle de 3 px, que da **2,66:1 sobre Canvas** (`global.css:365-424`): es un problema que ya existe. Los `.field` también usan `outline: none` con un anillo de baja opacidad (`global.css:351,359`).
- **Logo actual.** `src/components/Logo.astro:16-43` **no sigue la regla del lockup**. Por los parámetros del SVG, el espacio visible entre isotipo y wordmark es ~0,20em sobre un isotipo visible de ~0,63em, es decir **~0,32 H en lugar de 0,15 H**, con un tracking de **−0,063em** en lugar de −0,055em. Es un cálculo a partir del viewBox `278 283 452 459`, de `CAP=.675`, `GAP=.181` y de los límites del path `292–716 × 298–726`; conviene confirmarlo con una medición en pantalla. El lockup de LD sí es correcto y sirve de referencia.
- **CSP.** La escribe en el build `src/integrations/csp-headers.mjs:104-126` con `img-src 'self' data:`, `font-src 'self'`, `style-src 'self'` más hashes, `style-src-attr 'unsafe-inline'`, y Turnstile y Bold permitidos en `script-src`, `connect-src` y `frame-src`.

### 4.2 Tokens: de LD a este repo

| Token de LD | Equivalente aquí | Estado |
| --- | --- | --- |
| Canvas, Midnight, P9, Teal 9, Gold 9 | `--canvas`, `--midnight`, `--periwinkle`, `--teal`, `--gold` | **Coincide** |
| Escalas de 12 pasos (Neutral, Periwinkle, Teal, Gold) | No existen; hay tonos sueltos propios | **Pieza nueva compartida**: añadir las escalas v8.7 a `global.css` y migrar `--periwinkle-ink` → P11, `--ink-muted`/`--ink-body` → N11/N12, `--periwinkle-tint` → P2/P3, `--line` → N6, `--teal-ink` → T11, `--gold-ink` → G11 |
| `--night-surface #12162A`, `--night-line`, `--night-text` | — (LD usa P12 y Midnight) | **Conflicto**: no están en v8.7. Hay que decidir qué es "Night" (pregunta 3) |
| Fuentes (Google Fonts) | `@font-face` auto-alojado con las mismas familias y rangos de peso que cubren 400-700 | **Coincide**; no hace falta Google Fonts |
| Escala tipográfica `u` (vw puro) | `--t-*` con `clamp()` y tope | **Conflicto**: conservar `clamp()` y ajustar los valores a los tamaños de LD (evita A12) |
| Leading y tracking de la guía | `.display` −0,045em / 0,92; `.d-h2` 0,98 | **Conflicto menor**: alinear con la tabla de `BB:html:456` (hero 0,95 / −0,05; sección 0,91 / −0,04) |
| Radios en `u` (card 32u, banda 160u) | `--radius-*` en px | **Conflicto menor**: el brand book no fija radios. Hay que elegir valores en px con `clamp()` |
| Sombras `shadow-xl/2xl` | `--shadow-card`, `--shadow-lift` | Conservar las de aquí (más suaves, A21) |
| Breakpoints 768/992 + 640/768/1024/1280 | 640/900/1023/1100 | **Conflicto**: definir un único juego para la base compartida (pregunta 11) |
| Curvas `--ease-*` | `cubic-bezier(0,0,.2,1)` en `.reveal` | Pieza nueva si se adopta; quitar las curvas con rebote (A13) |

### 4.3 Componentes y secciones: de LD a este repo

| Sección o componente de LD | Pieza de aquí | Estado | Nota |
| --- | --- | --- | --- |
| `SquaiLockup` / `SquaiMark` | `Logo.astro` | **Existe, con error** | Reescribir con `1cap` y 0,15 H como LD; se usa en Header y Footer |
| `AardvarkTopBar` | `Header.astro` | Existe | Cambiar el estilo; el menú de servicios de aquí no está en LD |
| Hero | `ServiceHero.astro` | Existe | LD usa P9 con foto; aquí es Midnight con nombre y eslogan. El contenido sale de `squai-one.json`; la foto y el sticker exigen campos nuevos |
| `AardvarkButtonAlt`, pills | `Button.astro` + `global.css .btn-*` | Existe | Añadir una variante de dos piezas si se quiere. Las letras animadas exigen marcado `sr-only` + `aria-hidden` (se puede en Astro) |
| `SquaiSingleBlock` / `CornerBlocks` | `.brand-shape` (`global.css:117-129`, oculta < 1024 px y en `forced-colors`) | **Pieza nueva compartida** | Un `BrandShape.astro` con Bloque y Unión en rotaciones ortogonales y sin bucle |
| `SectionBackdrop` (blobs) | — | **Conflicto** | No portar (A2) |
| Lo que incluye (4 tarjetas con ilustración) | `ServiceBento` (`challenge.cards: {t,d}`) | Existe en parte | Las ilustraciones o imágenes exigen un campo nuevo en `schema.ts` |
| Presentación (video) | — | Nueva | Campo de video en el contenido; `.vtt` |
| ¿Es para ti? | — | Nueva | Contenido nuevo; sin Pexels (A4) |
| Lo que vas a lograr (etiquetas) | `ServiceCapabilities` (grupos con `tone`) | Existe en parte | Estilo nuevo, sin giro aleatorio |
| Cómo funciona (4 pasos) | — | Nueva | Contenido nuevo |
| Sesiones (carrusel) | — | Nueva | Contenido de la cohorte; ver doc 02 |
| Marquesina | — | **Conflicto** | Mejor una franja estática con fecha y precio (A5) |
| Mentores | `Team.astro` + `src/assets/team*.webp` | Existe (home) | Reutilizar datos y fotos; las cifras solo si están verificadas |
| Testimonios | — | Nueva | Solo con testimonios reales y autorizados |
| Inscripción | `Checkout.astro` | **Existe y es más completo** | Mantener Turnstile, consentimientos, selector de país y el contrato `/api`; solo cambiar el estilo de los campos |
| FAQ con categorías | `Faq.astro` | Existe | Las categorías exigen un campo nuevo en `schema.ts` |
| Footer y newsletter | `Footer.astro` | Existe; el newsletter es nuevo | El newsletter de LD es falso (solo un toast); uno real necesita endpoint y migración |
| WhatsApp, notificaciones, volver arriba | — | Nuevas | Decisión de producto |

### 4.4 Lo que tocaría límites de "ask before" en AGENTS.md (Hecho y Recomendación)

| Si se porta tal cual… | Toca | Recomendación |
| --- | --- | --- |
| Google Fonts (`LD:index.html:13-18`) | **CSP** (`font-src 'self'`, `style-src 'self'` en `csp-headers.mjs:113-116`) | No hace falta: las mismas fuentes ya están auto-alojadas |
| Fotos de Pexels por URL (`images.pexels.com`) | **CSP** (`img-src 'self' data:`) | No usar stock (A4). Las imágenes propias, con `astro:assets` desde `src/assets` |
| Tailwind v4, React, `motion`, `lucide-react`, zustand, react-query, react-hook-form | **Dependencias nuevas** (y `pnpm-lock.yaml`) | No añadir: traducir a Astro, CSS propio y scripts pequeños. Los scripts en línea ya se hashean solos (`csp-headers.mjs:96-102`) y los `style=""` están permitidos (`:120`) |
| Video en `/public` | Nada en la CSP (`default-src 'self'`). El video de LD pesa 24 MB (`LD:public/assets/aistudio/20261117-…mp4`) | Si se embebe YouTube o Vimeo, **CSP** (`frame-src`) |
| Caché de carpetas nuevas (`/illustrations/*`, `/video/*`) | **`public/_headers`** | Pedir permiso, o servir desde `/_astro/` con `astro:assets` (ya inmutable) |
| Newsletter real | **Contrato `/api/*` nuevo** y **migración** | Decidir antes (pregunta 9) |
| Categorías del FAQ, sesiones, pasos, público, testimonios, video, foto del hero | **`src/content/schema.ts`** y `.pages.yml` en el mismo commit | Diseñar el esquema junto con el doc 02 y pedir permiso |
| Cifras, logos o testimonios de muestra en el JSON-LD | Regla de AGENTS.md: "No unverified facts in JSON-LD" | Solo datos verificados; `courseSchema` ya tiene datos fijos (ver doc 02) |
| Botón de Bold `data-bold-button` | Ya permitido en la CSP (`csp-headers.mjs:27,115,121,124`) | Reutilizar `src/lib/bold-checkout.ts`; no portar el servidor Express de LD |

---

## 5. Recomendaciones (pendientes de decisión)

1. **Tokens primero.** Añadir a `global.css` las cuatro escalas v8.7 y migrar los tokens propios según la tabla de §4.2, en un cambio aparte y sin rediseño visual, para revisar los contrastes de todo el sitio de una vez.
2. **Arreglar `Logo.astro`** con el método de la guía (`1cap`, `gap: calc(1cap*.15)`, `translateY(.03em)`, −0,055em). Es un error que ya existe y no depende de LD.
3. **Squai One con un solo servicio.** Si se confirma v8.7: Periwinkle + neutros + Midnight, con Gold solo dentro del isotipo. Si se confirma el `.md`: Gold como un único acento por vista, no como banda entera.
4. **Formas.** Bloque y Unión con rotaciones ortogonales, en Nivel 1-2 (`BB:md:308-310`), sin bucles. Quitar los blobs.
5. **Imagen.** Fotos documentales del equipo y de clases reales (ya hay `src/assets/team*.webp`). Sin stock ni Open Peeps como protagonistas.
6. **Gloria** solo para anotaciones cortas, sin girar. Precios, pasos, testimonios y UI van en Familjen o Atkinson según su rol.
7. **Motion nivel "Character".** Transiciones de 150 a 300 ms sin rebote, revelado de entrada ya existente y nada infinito. La franja de datos, estática.
8. **Accesibilidad.** Foco con doble anillo que mida al menos 3:1 sobre cada fondo (el patrón `.btn:focus-visible` actual, extendido a campos y enlaces). Sin `outline: none` sin un sustituto visible. Tamaños con `clamp()` y tope en px. Mantener el enlace para saltar al contenido.
9. **Alineación** a la izquierda en encabezados y texto. Si se quiere algo girado, que sean formas, no texto.
10. **No portar nada** del servidor, el store, la analítica ni los datos de muestra de LD.

---

## 6. Preguntas abiertas para decisión humana

1. Donde el brand book se contradice, ¿manda `brand-guideline.html` v8.7 (2026-11-16) o `brand-book-definition.md` (2026-09-07)? En concreto: ¿el color identifica al servicio (v8.7) o no (`.md` §6.7)?
2. ¿La página de Squai One puede usar Gold fuera del isotipo? Si puede, ¿cuánto y dónde?
3. ¿Qué es "Night" en la web: Midnight `#0A0C1A` (`.md`) o P12 `#303163` (LD)? v8.7 no define superficies oscuras ni la variante del logo sobre oscuro.
4. ¿De dónde viene `persona-laptop.webp` y con qué licencia? ¿Vale como imagen de marca, si el `.md` excluye justo esa escena?
5. ¿Se permiten las ilustraciones Open Peeps (CC0), aunque el brand book diga que la ilustración no es activo principal?
6. ¿Es aceptable el parecido con `aardvarkbookclub.com`? ¿Alguien revisó si hay paths SVG o código copiados literalmente?
7. ¿Hasta dónde llega Gloria: precios, testimonios, números de paso?
8. ¿Qué nivel de expresión quiere la página: Character (el normal) o Expressive? ¿Se aceptan animaciones en bucle?
9. Newsletter, widget de WhatsApp y notificaciones: ¿son funciones que se van a construir? El newsletter implica un contrato `/api` nuevo y una migración.
10. `.squai-store.json` en `squai-org/landing-design` (público): ¿son datos de personas reales? Si lo son, hay que sacarlos del historial del repo y valorar si toca avisar. Es una acción fuera de este repo.
11. ¿Qué juego de breakpoints adopta la base compartida (hoy aquí 640/900/1023/1100; en LD 640/768/992/1024/1280)?
12. ¿Se aprueban los cambios de `schema.ts` y `.pages.yml` para las secciones nuevas (video, público, pasos, sesiones, testimonios, categorías de FAQ)? Coordinar con `02-copies-y-terminos.md`.
13. Para el resto del sitio: según v8.7, la home y las piezas de marca madre van en Periwinkle + Midnight, pero hoy la home mezcla Periwinkle, Teal y Gold en el bento (`tone` en `schema.ts:20`). ¿Se aplica también la regla de un servicio por pieza a la home?
