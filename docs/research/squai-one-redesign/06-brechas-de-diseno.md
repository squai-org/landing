# Brechas de diseño: landing-design frente a Squai One

Comparación de `squai-org/landing-design` (fuente de verdad) con la implementación de la rama `feat/63-rediseno-squai-one` (commit `d02d801`). Aplica la regla del dueño de `05-ajustes-de-diseno.md`: lo que existe en el diseño se replica exactamente. Solo lectura: no se tocó código.

## Contexto y fuentes

| Fuente | Qué se usó |
|---|---|
| `landing-design` (clon, HEAD `81cef34`) | `src/components/*.tsx`, `src/index.css`, `src/content/landing.ts`, `src/App.tsx`. Las rutas `ref:` de abajo son relativas a `src/` de ese repo. |
| Implementación | `src/components/`, `src/styles/`, `src/lib/motion.ts`, `src/layouts/Layout.astro`, `src/pages/servicios/[slug].astro`. Las rutas `impl:` son relativas a la raíz de este repo. |
| aardvarkbookclub.com | HTML y CSS descargados el 2026-11-23 (`header__sub`, `.button`, `.button-social`, `--grid-*`). Solo para la píldora y el navbar. |
| Medición en navegador | Build con `node node_modules/astro/bin/astro.mjs build` (no con `pnpm build`: pnpm 11 intentó reinstalar `node_modules` y abortó sin cambios), servido con `docs/scripts/serve-dist.mjs` y medido con Chrome headless por CDP a 1100, 1280, 1440, 1600 y 1920 px. |

Límites de la verificación:

- No se compiló `landing-design`; sus valores salen de leer el código (Tailwind traducido a CSS) y su `index.css`.
- El valor de `--button-height` de aardvark y el efecto del minificador en el build propio de `landing-design` no se verificaron.
- No se probó el flujo de pago ni `/api` (el 404 de `/api/checkout/program/squai-one` en la consola es esperado con el servidor estático).

Escala usada: el diseño trabaja en unidades `--u` (`ref: index.css:74-255`); la implementación ya la tiene en `impl: src/styles/global.css:175-241`, así que las medidas coinciden donde se reutiliza. Sobre `motion`: está instalado (`impl: package.json`, `dependencies`, `^12.23.24`) y se usa su API sin React desde `impl: src/lib/motion.ts:1` (`animate`, `hover`, `inView`, `press`, `scroll`). Los scripts salen como módulos externos `/_astro/*.js`, y `script-src 'self'` los permite (`dist/_headers`). En el recorrido real no hubo errores de consola ni violaciones de CSP, y las animaciones sí se disparan (ver tabla de Animaciones).

## Excepciones confirmadas

| # | Excepción del dueño | Estado | Evidencia |
|---|---|---|---|
| 1 | Composición de imagen del hero | Confirmada. Sin arco Periwinkle ni bloque Gold; persona, etiquetas, parallax (0 a 40 px) y cinta de fondo (0 a 84 px) iguales al diseño. | `ref: AardvarkHero.tsx:249-327`; `impl: src/components/OneHero.astro:77-203`. Medido: `--person-y` pasa de 0 a 14.55 px y la cinta a 30.55 px con 300 px de scroll. |
| 2 | Logo en píldora light | Confirmada: `padding: 8px 16px`, fondo `--canvas`, siempre. En el diseño la píldora solo aparece tras el scroll (`ref: AardvarkTopBar.tsx:88-99`). | `impl: src/components/Header.astro:189-198`. |
| 3 | Botón "Conoce Squai" junto a las redes | Confirmada, con defecto: ver causa abajo. | `impl: src/components/Header.astro:157-167`. |
| 4 | Items del navbar propios de Squai One | Confirmada, con defecto de posición: ver causa abajo. | `impl: src/content/services/squai-one.json` (`nav`), `impl: src/components/Header.astro:23-25`. |

### Causa del punto 3: redes en vertical

Los botones de redes se apilan porque la ranura derecha mide 240 px fijos y el contenido ya no cabe.

- `.site-header-social` mide `width: 240px` desde 1280 px (`impl: src/components/Header.astro:301-304`) y es un flex de una sola fila (`:281-291`) con dos hijos: la píldora `.company-pill` (`:157-165`, `flex-shrink: 0` por `.pill-button`, `impl: src/styles/global.css:530-534`) y la lista de redes.
- La lista `.social-links` es el único hijo que puede encogerse y tiene `flex-wrap: wrap` (`impl: src/components/SocialLinks.astro:39`). Cuando la píldora más el hueco de 8 px dejan menos de 106 px (2 × 48 + 10), el `ul` se encoge a un solo botón de ancho y envuelve: los dos íconos quedan uno encima del otro.
- Medido a 1920: píldora 174 px de ancho, `ul` de 58 px, íconos en `y: 32` y `y: 90`. A 1600 también se apilan (`y: 27` y `y: 77`). A 1440 y 1280 caben (misma `y`, 46 y 42 px de separación). El umbral estimado es cerca de 1575 px de ancho de ventana (cálculo propio: no se probó el punto exacto).
- Fuera de rango: 1024 a 1279 px, donde toda la ranura se oculta (`impl: src/components/Header.astro:310-313`).

Qué falta frente a la píldora de aardvark (`https://www.aardvarkbookclub.com/`):

| Aspecto | Aardvark | Implementación |
|---|---|---|
| Estructura | Un único `ul.header__sub-list` (`display: flex; gap: .5em`, sin `flex-wrap`) con `li` para la píldora "Shopping from the UK?", el selector de idioma y los botones sociales. | Píldora y `ul` de redes son hermanos distintos, y el `ul` tiene `flex-wrap: wrap`. |
| Ancho de la ranura | `.header__sub` y `.header__title` miden `calc(var(--grid-column-width) * 3)` con 12 columnas, es decir 25 % del ancho útil (unos 468 px a 1920). El nav mide 6 columnas. | 240 px fijos, y solo desde 1280 px. |
| Alto de la píldora | Usa la misma clase `.button` que las píldoras del menú (`inline-grid`, `height: var(--button-height)`, texto `1.5em`). | `.company-pill { height: var(--social) }` (`impl: src/components/Header.astro:299`): 48 px frente a 56 px de las píldoras del nav a 1920. |
| Alineación | `align-items: center` en una sola fila, nada puede apilarse. | El apilado altera la altura de la fila (ver punto 4). |

Referencia CSS: `.header__sub`, `.header__sub-list`, `.button`, `.button-social` en `https://cdn.prod.website-files.com/696173cb00865d1b386e4af8/css/aardvark-book-club.webflow.shared.cbb7ba7ab.min.css`.

### Causa del punto 4: navbar fuera de lugar en Squai One

El contenedor es el mismo en todas las páginas (`<Header />` dentro de `.page-frame`, `position: fixed`, mismo padding). La diferencia viene solo de la ranura derecha de Squai One, que es más ancha de contenido que la de las otras páginas y se apila (causa del punto 3).

- Al apilarse, `.site-header-row` (`align-items: center`, `impl: src/components/Header.astro:179-185`) pasa de 64 a 106 px de alto, y el header de 96 a 138 px.
- Efecto medido a 1920: el nav queda en `y: 53` (home y Grow: `y: 32`) y el logo en `y: 54` (home: `y: 33`); la fila de Squai One mide 106 px de alto frente a 64 px en home y Grow. A 1600 igual (`row h: 90`, nav `y: 44`). A 1440 y 1280 no hay desplazamiento.
- El centro horizontal del nav sí coincide (960 px a 1920 en ambas páginas): lo que cambia es la altura, no la posición horizontal.
- Debe ser, según `landing-design` (`ref: AardvarkTopBar.tsx:73-81,104,141-148`): una sola fila de altura fija, con las dos ranuras laterales de ancho igual y fijo para centrar el nav, y la ranura derecha sin `flex-wrap`. Aardvark usa 25 % + 50 % + 25 % del ancho útil.

Hallazgo adicional, en todas las páginas (incluido el home): entre 1024 y 1279 px la ranura derecha desaparece y el logo deja de medir 240 px, así que `space-between` empuja el nav contra el borde derecho (medido a 1100: nav `x: 498` a `1077`; en home `x: 373` a `1077`; el diseño lo centra con dos ranuras de 240 px desde 1024, `ref: AardvarkTopBar.tsx:76,141`).

## Brechas por sección, ordenadas por severidad

Severidad: **rota** = no funciona o se ve defectuosa; **distinta** = visiblemente distinta del diseño; **menor** = detalle.

### Rotas (3)

| # | Componente | Referencia | Implementación | Valor de referencia frente a actual |
|---|---|---|---|---|
| B1 | Hover de botones, píldoras, redes y CTA de tarjetas (todo el sitio) | `ref: index.css:504-542,520-534,586-629,697-732` | `impl: src/styles/global.css:488-523`; `impl: src/styles/one-sections.css:286-293` | Seis reglas combinan `scale`/`translate`/`rotate` con `transform` en el mismo bloque. En el build de producción el minificador (lightningcss 1.33, el de Vite 8) borra las propiedades individuales y deja solo `transform`. Resultado en `dist/servicios/squai-one.html`: `.btn-text` termina en `transform: rotate(-4deg) translate(-.25em,-.125em)` (diseño: neto 0), `.btn-arrow` en `rotate(18deg) translate(.5em,-.25em)`, `.btn-bg` pierde `scale: .955 .925`, y el texto del CTA de la tarjeta termina en `rotate(12deg)` y la flecha en `rotate(-12deg)`. Reproducido con `lightningcss.transform` sobre un fragmento (mismo resultado sin `targets` y con `chrome 120`/`safari 15`). Medido en hover de la tarjeta 2: `rotate: none` y `transform: matrix(.978,.208,...)`. En dev (sin minificar) sí funciona. Si el build propio de `landing-design` también lo pierde: no verificado. |
| B2 | Redes del navbar en Squai One | `ref: AardvarkPrimitives.tsx:456` (`ul.flex.items-center.gap-2.5`) | `impl: src/components/Header.astro:281-291,301-304`; `impl: src/components/SocialLinks.astro:39` | Horizontal con `gap 10px` frente a apiladas desde unos 1575 px (ver causa del punto 3). |
| B3 | Fila del navbar de Squai One | `ref: AardvarkTopBar.tsx:69-81,141-148` | `impl: src/components/Header.astro:179-185` | Fila de 64 px (a 1920) frente a 106 px; nav y logo bajan unos 21 px respecto al resto de páginas (ver causa del punto 4). |

### Visiblemente distintas (13)

| # | Componente | Referencia | Implementación | Valor de referencia frente a actual |
|---|---|---|---|---|
| D1 | Header entre 1024 y 1279 px | `ref: AardvarkTopBar.tsx:75-77,105,141-143` | `impl: src/components/Header.astro:301-313` | Ranuras de 240 px y redes visibles desde 1024, `gap-3.5` (14 px) entre píldoras. Actual: ranuras de 240 px solo desde 1280, redes y píldora ocultas, gap de 8 px, nav pegado a la derecha. |
| D2 | Presentación (sección del video) | `ref: AardvarkInteractiveSections.tsx:34-118` | `impl: src/components/VideoSection.astro:16-52,73-160`; `impl: src/pages/servicios/[slug].astro:71-83` | Diseño: `rounded-t-[--edge-r]`, `pt = --section-py` y `pb = --section-py + --edge-r`, rejilla de 12 columnas con texto a la izquierda (manuscrito, lead, cuerpo, botón, logos) y figura a la derecha (`max-w u*760`, `rounded u*48`, `p u*20`, giro 2.5°, `aspect 4/4.2`). Actual: una columna centrada dentro de `.content-shell` (inset con `padding: 0 clamp(14px,2vw,32px)`), radio `clamp(20px,2vw,40px)`, tarjeta de 880 px máx., `aspect 16/9`, sin texto lateral ni botón. |
| D3 | Sesiones frente a Temario | `ref: AardvarkSections.tsx:263-537`; `ref: index.css:737-899` | `impl: src/components/Syllabus.astro:17-164` | Diseño: carrusel horizontal con flechas (`--slider-btn`), arrastre con mouse, snap en móvil, tarjetas de `--books-item-w` con giro y desplazamiento según la distancia al centro (`sin(norm*1.2)`), hover que endereza y asoma el botón. Actual: cuadrícula de 6 módulos (2 columnas desde 768, 3 desde 1200) con tarjetas planas, sin carrusel ni hover. |
| D4 | Preguntas frecuentes | `ref: AardvarkInteractiveSections.tsx:706-856` | `impl: src/components/Faq.astro:193-311`; `impl: src/layouts/Layout.astro:323-336` | Diseño: píldoras de categoría que filtran (con bloques de marca), ítems `rounded --faq-r` que se abren con altura animada 0.28 s, signo `+` que gira 45 °, grupos que aparecen al hacer scroll, sección `z-20 rounded-b-[--edge-r]`. Actual: las categorías son enlaces a anclas, el panel se muestra con `hidden` sin transición, el signo cambia entre `+` y `−`, tarjetas `.bento-card` con borde, sección sin esquina inferior redondeada. |
| D5 | Es para ti: forma de la sección | `ref: AardvarkInteractiveSections.tsx:144` | `impl: src/components/AudienceFit.astro:224-233` | Diseño: `rounded-t-[--edge-r]`, `-mt-[--edge-r]`, `pb = --section-py + --edge-r`. Actual: `border-radius` en las cuatro esquinas, sin margen negativo y sin padding extra abajo. |
| D6 | Bordes y solapes entre secciones, y pie | `ref: App.tsx:131,165-168`; `ref: AardvarkInteractiveSections.tsx:387,546,716`; `ref: AardvarkSections.tsx:403-405` | `impl: src/components/Footer.astro:102-111`; `impl: src/pages/servicios/[slug].astro:137-139`; `impl: src/styles/global.css:288-297` | Diseño: raíz blanca, secciones que se solapan con esquinas de `--edge-r` y pie con `-mt-[--edge-r]` y `pt = --edge-r + --section-py`. Actual: `.page-frame` y `body` en `--canvas` (#F4F6FF), el pie con `margin-top: clamp(24px,3vw,48px)` y `padding-top: --section-py`, y la FAQ sin curva: se ven franjas Canvas entre secciones. |
| D7 | Sección "Qué vas a lograr" | `ref: AardvarkInteractiveSections.tsx:273-439` | Ausente (no hay componente ni datos en `src/content/services/squai-one.json`) | Etiquetas manuscritas en escenario `aspect-[1840/760]` con resorte de entrada y empuje al pasar el mouse. |
| D8 | Franja de datos (marquee) | `ref: AardvarkInteractiveSections.tsx:441-484`; `ref: index.css:1025-1044` | Ausente en Squai One (existe `src/components/Marquee.astro`, solo en home) | Dos cintas inclinadas (-1.8° y 1.4°), 26 s y 30 s lineal. |
| D9 | Mentores: sello, cita y cifras | `ref: AardvarkInteractiveSections.tsx:581-585,610-627,638-652` | `impl: src/components/OneTeam.astro:50-85` | Faltan el sello de rol girado 6°, el bloque con comillas y la fila de tres cifras. Dimensiones de tarjeta, avatar, marcos y radios coinciden (`impl: src/components/OneTeam.astro:105-124`). |
| D10 | Botón de WhatsApp | `ref: WhatsAppWidget.tsx:55-108` | `impl: src/components/WhatsAppButton.astro:12-27,97-107` | Diseño: el botón abre un panel de 310/340 px (cabecera `#075E54`, tres temas, animación 0.16 s). Actual: enlace directo a `wa.me`. Además se oculta cuando un formulario está visible y usa `z-index: 50` en lugar de `z-40`. El botón (64 px, bloque `#25D366`, `drop-shadow`, resorte al hover) sí coincide. |
| D11 | Botón volver arriba | `ref: App.tsx:285-301` | Ausente. En su lugar, "Pausar animaciones" ocupa abajo a la izquierda (`impl: src/styles/motion.css:128-147`) | Diseño: círculo blanco de 48 px, `bottom-5 left-5`, `md` en adelante, aparece pasados 520 px de scroll con `opacity/y/scale` y hover 1.06. |
| D12 | Fondos de forma de Presentación y FAQ | `ref: Backdrops.tsx:40-88` (forma `faq`) | `impl: src/components/VideoSection.astro:17`; `impl: src/components/Faq.astro:194` | Diseño: `SectionBackdrop` con el trazo que respira (0 a 60, giro 2°, 6 s). Actual: `BackdropShape`, el sistema antiguo de bloques (`backdrop-breathe`: escala 1.05, `impl: src/styles/motion.css:34-37`), y en FAQ con `still`, sin movimiento. |
| D13 | Escala tipográfica de las secciones antiguas | `ref: index.css:74-255,284-325` | `impl: src/components/Syllabus.astro:20-57`; `impl: src/components/VideoSection.astro:19`; `impl: src/components/Faq.astro:197,214,227`; `impl: src/styles/global.css:157-163,331-342` | Las variables `--fs-*`, `--hero-*` y `--input-*` solo existen dentro de `.one-u` (`impl: src/styles/one-sections.css:1-56`). Syllabus, Video y FAQ usan `d-h1`/`d-h2`/`d-h3` con `clamp()`, no la escala `--u`: títulos de tamaño y interlineado distintos. |

### Menores (9)

| # | Componente | Referencia | Implementación | Valor de referencia frente a actual |
|---|---|---|---|---|
| M1 | CTA al pasar sobre tarjeta | `ref: index.css:505-512` (`.group/card:hover .aardvark-btn-alt__bg`) | `impl: src/styles/one-sections.css:271-294` | El hover de la tarjeta también comprime el fondo del botón; aquí solo se mueven texto y flecha (y B1 rompe lo que sí hay). |
| M2 | Botón de envío del formulario | `ref: AardvarkPrimitives.tsx:572` (`flex-1 sm:flex-initial`); `ref: SignupFormSection.tsx:423-436` | `impl: src/components/Checkout.astro:593` | Desde 640 px el texto no se estira (el botón mide lo que su contenido); aquí `.form-submit .btn-text { flex: 1 }` lo estira siempre. |
| M3 | Foco visible | `ref: index.css:269-272` | `impl: src/styles/global.css:305-309` | `outline: 2px solid #5a5bb6; offset 3px` frente a `3px solid` Midnight con halo. |
| M4 | Color y fondo base | `ref: index.css:258-262` | `impl: src/styles/global.css:288-297` | `html` blanco y texto `#0A0C1A` frente a `body` Canvas y `#4B5167`. |
| M5 | Logo al hacer scroll | `ref: AardvarkTopBar.tsx:76-80` | `impl: src/components/Header.astro:292-297` | El diseño oculta el logo en `lg` pasados 70 px (`-translate-y-24`, opacity 0); aquí solo se ocultan las redes. Ver pregunta 4. |
| M6 | Altura de la píldora de empresa | aardvark `.button` | `impl: src/components/Header.astro:299` | Igual que las píldoras del menú (`--pill-h`), aquí `--social`. No verificable el valor de `--button-height`. |
| M7 | Tokens ausentes | `ref: index.css:110-151` | `impl: src/styles/global.css:175-241`; `impl: src/styles/one-sections.css:1-56` | Faltan `--faq-r/py/px`, `--books-*`, `--slider-btn`, `--fs-label`, `--label-*`, `--fs-badge`, `--frame-*`, `--hero-note-*`. Hacen falta al implementar D3, D4, D7 y D8. |
| M8 | Ayudas de movimiento sin uso | n/a | `impl: src/lib/motion.ts:20-52` | `springs.presentationMedia`, `springs.outcomeLabel`, `tweens.sectionReveal`, `tweens.faqItem` y `easing.popover` no se usan en ningún componente (búsqueda en `src/`). Son las que hacen falta para D2, D4, D7 y D10. |
| M9 | Lista "Es para ti" bajo 992 px | `ref: index.css:954-956,966-973` | `impl: src/components/AudienceFit.astro:331-332,374-377` | El diseño mantiene el empuje de 0.6 rem al segundo vecino también bajo 992 px; aquí solo desde 992. |

Total: 3 rotas, 13 distintas, 9 menores (25).

### Sin diferencia encontrada

Comparados y coincidentes (valores leídos, no solo supuestos): hero (medidas, etiquetas, tipografía), Datos clave (tarjetas, radios, bloques de esquina, posiciones), Cómo funciona (tarjetas, solape, scroll), Es para ti (estructura de lista, vistas previas, resortes), Mentores (marcos y radios), Testimonios, composición del formulario de inscripción, presets de bloques `mod-1` a `mod-4` y de píldoras (`ref: AardvarkPrimitives.tsx:79-378`, `impl: src/lib/one-corner-presets.ts`, `impl: src/lib/pill-blocks.ts`), cajón móvil del menú, botón flotante de WhatsApp, pie (composición, sin boletín por decisión del dueño).

## Animaciones

Estado "verificado" = medido con Chrome headless sobre el build servido con `serve-dist.mjs`.

| Animación | Referencia (curva, duración, disparador) | Actual | Estado |
|---|---|---|---|
| Hover de botón (squash, texto, flecha) | `ref: index.css:504-542`: `scale` .15 s `(.59,1,.88,1.01)`; `transform` .35 s con retardo .15 s `(.34,2.27,.64,1)`; solo hover fino sin movimiento reducido | `impl: src/styles/global.css:487-523`, mismos valores | Rota en producción por B1 (propiedades individuales borradas). |
| Ola de letras | `ref: index.css:428-441,536-541`: 0.62 s `(.34,1.57,.64,1)`, retardo 16 ms por letra, hover | `impl: src/lib/motion.ts` (`splitTextOnHover`) y `impl: src/styles/global.css:480-516`, mismos valores | Verificado: 343 `.split-char` tras cargar. Solo se parte el texto si al cargar hay puntero fino y sin movimiento reducido. |
| Bloques de esquina (deriva) | `ref: index.css:549-567`: 4.8 s por defecto (`--anim-dur`), infinito, `translate/rotate/scale` en 66 a 90 % | `impl: src/styles/one-sections.css:169-191`, mismos fotogramas | Verificado: `one-block-drift` en `running`. Ninguno pausa fuera de pantalla (igual que el diseño). |
| Bloques de esquina al hover de tarjeta | `ref: index.css:570-582`: opacidad .22 s `(.32,.72,0,1)`; `transform` .36 s `(.34,1.57,.64,1)`; hover/focus-within | `impl: src/styles/one-sections.css:126-132,272-275` | Verificado: opacidad 1 al pasar el mouse. |
| Tarjeta de Datos clave al hover | `ref: index.css:663-705`: `translateY(-8px)` .35 s ease-bounce; base inferior `translate .35 s .1 s` | `impl: src/components/OneKeyFacts.astro:250-256` | Verificado: `matrix(1,0,0,1,0,-8)` y `translate: 0 23.1px`. CTA: opacidad 1 pero giro final incorrecto (B1) y sin squash del fondo (M1). |
| Entrada de tarjetas de Datos clave | `ref: AardvarkSections.tsx:93-98`: `opacity 0, y 36` a `1, 0`; 0.48 s `(.32,.72,0,1)`; retardo `idx*.07`; `inView` una vez, 15 % | `impl: src/components/OneKeyFacts.astro:137-143` + `impl: src/lib/motion.ts:36` (`revealOnView`) | Verificado: parten en opacidad 0 y llegan a 1. |
| Entrada de pasos de Cómo funciona | `ref: AardvarkSections.tsx:211-217`: `y 120, rotate resting*2` a 0; resorte 185/18; retardo `idx*.08`; 15 % | `impl: src/components/HowItWorks.astro:226-241` + `impl: src/lib/motion.ts:23` | Verificado (opacidad 1 al llegar). |
| Hover de pasos | `ref: AardvarkSections.tsx:221-228`: `x 18/(i-h) %`, `scale 1.075`, `rotate 0`, `y -10`; 0.48 s `(.32,.72,0,1)` | `impl: src/components/HowItWorks.astro:243-254,321`: transición CSS de `transform` 0.48 s con la misma curva | Mismo resultado. No probado con el mouse en vivo. |
| Deck de Cómo funciona con scroll | `ref: AardvarkSections.tsx:161-165`: `useScroll` con `['start end','end start']`, `y 32 a -32` | `impl: src/components/HowItWorks.astro:256-258` | Verificado: `translateY(-32px)` al final del recorrido. |
| Parallax del hero | `ref: AardvarkHero.tsx:240-247`: persona 0 a 40, cinta 0 a 84, `['start start','end start']` | `impl: src/components/OneHero.astro:62-75`; `impl: src/components/OneBackdrop.astro:38-43` | Verificado (14.55 px y 30.55 px a 300 px de scroll). |
| Respiración de formas | `ref: index.css:980-1020`: 6 s `ease-in-out`, trazo 0 a 60 (35 en `small`), giro 2°, solo en pantalla (`useInView`, margen 10 %) | `impl: src/styles/one-sections.css:219-249`; `impl: src/lib/motion.ts` (`flagWhileInView`) | Verificado: `data-breathing` pasa a `on` en Cómo funciona, Equipo e Inscripción. |
| Es para ti: vistas previas | `ref: AardvarkInteractiveSections.tsx:160-200`: resorte 240/22; `scale .88 a 1`, `opacity .42 a 1`, giro -14 a -8 y 13 a 7, parallax del puntero | `impl: src/components/AudienceFit.astro:166-186` + `impl: src/lib/motion.ts:20` | Mismos valores en el código. No probado con el mouse en vivo. |
| Es para ti: cambio de etiqueta | `ref: index.css:913-973`: opacidad .15 s con retardo .05 s, `scale` .35 s ease-bounce, `filter` .25 s | `impl: src/components/AudienceFit.astro:292-332` | Mismos valores. |
| Es para ti: ejemplo | `ref: AardvarkInteractiveSections.tsx:247-253`: `opacity 0, y 8` a 1, 0; sale con `y -6`; 0.18 s | `impl: src/components/AudienceFit.astro:148-164` | Mismos valores. |
| Mentores | `ref: AardvarkInteractiveSections.tsx:572-575`: `y 40, rotate ±3`, resorte 195/18, retardo `idx*.1`, 15 % | `impl: src/components/OneTeam.astro:91-102` | Verificado (opacidad 1). Hover `rotate 0` .3 s `(.4,0,.2,1)` igual. |
| Testimonios | `ref: TestimonialsSection.tsx:65-72`: `y 40, rotate resting*1.8`, resorte 195/18, retardo `idx*.08`, 20 %; hover `-translate-y-2` .3 s ease-bounce | `impl: src/components/OneTestimonials.astro:312-323,359-368` | Verificado (opacidad 1). |
| Formulario | `ref: SignupFormSection.tsx:165-169,237-241`: intro 0.38 s; tarjeta 0.4 s con retardo .08 s, ambos `(.32,.72,0,1)` | `impl: src/components/Checkout.astro:191-198` + `impl: src/lib/motion.ts:35-36` | Mismos valores. |
| Menú móvil | `ref: AardvarkTopBar.tsx:167-179`: fondo 0.2 s; panel 0.28 s `(.32,.72,0,1)`, `scale .92`, `y -12`; salida `.94` | `impl: src/components/Header.astro:453-471` + `impl: src/lib/motion.ts:31-33` | Mismos valores. |
| Redes del header al hacer scroll | `ref: AardvarkTopBar.tsx:141-146`: 0.3 s `(.32,.72,0,1)`, `-translate-y-24`, opacity 0, umbral 70 px | `impl: src/components/Header.astro:281-297,404-419` | Mismos valores. El logo no se oculta (M5). |
| Presentación | `ref: AardvarkInteractiveSections.tsx:52-56,89-96`: texto `y 24` 0.42 s `(.32,.72,0,1)`, 25 %; figura resorte 210/18 con giro 6 a 2.5, `scale .9 a 1`; hover `rotate 0, scale 1.02` | `data-reveal="heading"` y `"tilt"` con `.reveal` CSS: 0.5 a 0.65 s `(0,0,.2,1)` (`impl: src/styles/motion.css:6-7`, `impl: src/styles/global.css:713-729`) | Distinta (D2, M8): sin resorte ni hover en la figura. |
| Sesiones (carrusel) | `ref: AardvarkSections.tsx:326-348`: giro y desplazamiento por distancia al centro, hover 0.35 s con retardo 0.1 s `(.34,1.57,.64,1)` | Ausente | D3. |
| Qué vas a lograr | `ref: AardvarkInteractiveSections.tsx:380-423`: resorte `duration .85, bounce .45`, retardo `idx*.072`, `useInView` con `margin: 0 0 -75% 0`; empuje con resorte 170/13 | Ausente | D7. |
| FAQ | `ref: AardvarkInteractiveSections.tsx:771-776,827-835`: filtro 0.22 s; grupos 0.36 s; panel de altura 0.28 s, todos `(.32,.72,0,1)`; signo `rotate-45` 0.3 s | Sin animación de panel (`hidden`); revelado `.reveal` CSS | D4. |
| Marquee | `ref: index.css:1025-1044`: 26 s y 30 s lineal, infinito | Ausente en Squai One | D8. |
| Botón de WhatsApp | `ref: WhatsAppWidget.tsx:110-133`: `whileHover scale 1.07, rotate -4`, `whileTap .94`; bloque `group-hover:scale-105` 0.2 s; panel 0.16 s `(.16,1,.3,1)` | `impl: src/lib/motion.ts:84-110` (`hoverPress`, resortes 550/30 y 500/25); `impl: src/components/WhatsAppButton.astro:53,73-76` | Botón igual; panel ausente (D10). |
| Botón volver arriba | `ref: App.tsx:287-297`: entrada `opacity 0, y 12, scale .9`, hover 1.06, tap .95 | Ausente | D11. |

Sobre `prefers-reduced-motion`: el diseño usa `MotionConfig reducedMotion="user"` más CSS (`ref: App.tsx:312`; `ref: index.css:1046-1061`). La implementación lo lee una vez al cargar en `impl: src/lib/motion.ts:57-59` y todas las entradas se omiten con movimiento reducido (el contenido queda visible); si el usuario cambia la preferencia con la página abierta, no se actualiza (el diseño sí lo hace).

## Preguntas abiertas para el dueño

1. Qué vas a lograr y franja de datos (D7, D8): existen en el diseño pero no tienen datos en `squai-one.json`. ¿Se crean con contenido nuevo (cifras como "1.200+ personas formadas" están en `landing-design` pero no están verificadas), se reutiliza el texto de `outcome` del temario, o se dejan fuera?
2. Sesiones (D3): el diseño muestra 8 sesiones en carrusel con una ilustración cada una y el temario actual tiene 6 módulos con temas y sesiones. ¿El carrusel pasa a ser de las 8 sesiones y los temas se mueven (a un detalle o a otra tarjeta), o se mantiene el temario por módulos con la apariencia del carrusel?
3. Mentores (D9): el diseño muestra sello de rol, cita y tres cifras por mentor. ¿Hay datos aprobados para eso (sello, cita) o se omiten?
4. Logo al hacer scroll (M5): el diseño lo oculta en `lg` tras 70 px y muestra la píldora solo entonces. ¿"Píldora clara siempre" significa también que no se oculte al hacer scroll?
5. Header de 1024 a 1279 px (D1): ¿se muestran redes y "Conoce Squai" también ahí, como en el diseño (y como aardvark, que usa 25 % + 50 % + 25 %), o se mantienen ocultas?
6. Defecto del minificador (B1): la corrección más corta es separar las propiedades individuales (`scale`, `translate`, `rotate`) del `transform` en reglas distintas, o configurar `build.cssMinify` en `astro.config.mjs`. ¿Cuál se prefiere? Ninguna toca contratos públicos, pero la segunda edita un archivo de configuración de build.
7. Botón de WhatsApp (D10): ¿se añade el panel del diseño con sus tres temas (los textos de `landing-design` hablan de "las 8 sesiones", medios de pago y equipos) y se deja de ocultar el botón junto a los formularios?
8. Esquina inferior izquierda (D11): ¿"Pausar animaciones" y "Volver arriba" conviven (hoy el primero ocupa ese sitio)?
9. Fondo de página (D6): ¿el fondo base pasa a blanco como en el diseño o se conserva Canvas? Cambia las franjas visibles entre secciones.
10. Footer (D6): ¿se aplica el solape con la esquina curva de la FAQ como en el diseño?

## Respuestas del dueño (2026-11-23)

Regla para cualquier duda de diseño: igual que `landing-design`.

| Pregunta | Decisión |
|---|---|
| Datos de "Qué vas a lograr" y la franja marquee | Los de `landing-design`, y lo mismo para cualquier sección sin contenido en el CMS. |
| Sesiones y módulos | Igual que `landing-design`. |
| Sello, cita y cifras de mentores | Igual que `landing-design`. |
| Logo en píldora clara | Se queda como está: siempre visible, sin ocultarse al hacer scroll. |
| Redes y "Conoce Squai" entre 1024 y 1279 px | Se muestran. |
| Botón de WhatsApp junto al formulario | Sigue oculto en la sección del formulario. |
| Panel de WhatsApp | Igual que `landing-design`. |
| "Pausar animaciones" y "Volver arriba" | Conviven: el botón de volver va al lado del de pausar. |
| Fondo base | Igual que `landing-design`. |
| Solape del footer con la curva de la FAQ | Igual que `landing-design`. |
