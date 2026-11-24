# Ajustes de diseño tras revisar la vista previa (ronda 2)

Decisiones del dueño del 2026-11-23 al revisar la vista previa de la rama `feat/63-rediseno-squai-one`. Mandan sobre las notas anteriores.

## Regla general

Todo lo que existe en `squai-org/landing-design` se replica **exactamente igual**: misma composición, medidas, radios, tamaños de fuente e imagen, anchos de sección y animaciones (mismas curvas, duraciones y springs). No se inventan diseños ni composiciones: se extiende una composición existente del diseño o se pregunta al dueño cuál usar. Los datos y textos que hoy muestra el sitio son correctos y se conservan; lo que cambia es el diseño.

Fuente del diseño: `src/components/*.tsx`, `src/index.css`, `src/theme/` y `src/content/landing.ts` del repo `squai-org/landing-design` (las clases de Tailwind se traducen a CSS con los valores exactos).

## Decisiones

- **Animaciones:** se añade la dependencia `motion` y se usa su API sin React (`animate`, `scroll`, `inView`) para reproducir las mismas animaciones de botones, tarjetas de pasos y fondos. Aprobado por el dueño.
- **Footer:** composición del diseño, con los datos actuales. Superficie oscura (dark) en todas las páginas; no cambia de color por servicio.
- **Logo:** píldora clara siempre, en todas las páginas y estados.
- **Hero de Squai One:** sin la forma Periwinkle y sin el bloque Gold detrás de la mujer. Sin el chip "Inscripciones abiertas" (no está en el diseño).
- **Datos clave:** se elimina la cuadrícula de 6 tiles (inventada). La duración, sesiones, fechas, horario, modalidad y cupo pasan a las tarjetas con ilustración que ya están diseñadas, sustituyendo su información poco relevante.
- **Navegación de Squai One:** solo en la página de Squai One, los elementos del menú son los de `landing-design`. Junto a las redes sociales va un botón píldora (como el de "Shopping from the UK?" de aardvarkbookclub.com) que lleva a la página de la empresa (inicio de squai.io).
- **Instagram:** perfil `https://www.instagram.com/heysquai/`.
- **WhatsApp:** número `3143802400` (Colombia), para que el botón aparezca.
- **Fotos de Pexels:** se usan todas las del diseño, descargadas al repo (la CSP no permite cargarlas de otro origen). La única que se sustituye es la de la sección de video, que va con ilustración.
- **Testimonios:** se cargan los del diseño como contenido inicial; el dueño los cambiará desde el CMS.
- **Formulario:** composición del diseño ajustada a los campos de producción.

## Ajustes del dueño tras la ronda 3 (2026-11-23)

| Tema | Resultado |
|---|---|
| Temario | Se quitó la lista de seis módulos y el cierre lila "Vas a desarrollar la habilidad..." de debajo del carrusel. Campos fuera de contenido, schema y `.pages.yml`: `syllabus.outcome`. La descripción de cada módulo (`syllabus.modules[].d`) ya no se muestra y quedó opcional. |
| Es para ti | Se quitaron las tarjetas "No es para ti si…" y "Lo que necesitas" y el texto "Puedes empezar sin haber usado la IA antes". Campos fuera: `audienceFit.closing`, `audienceFit.notFor` y `audienceFit.needs`. |
| Botones flotantes | Contenedor fijo `.float-dock` con Pausar animaciones primero y volver arriba después; el botón de pausa se activa en toda página con independencia de los elementos ambientales. |
| Pie | Vuelve `--accent-deep` (superficie del servicio) y la barra legal usa `--accent-deep-bar` (paso 11), un tono más claro que el cuerpo. Revertido en la ronda 5: color fijo en todas las páginas. |
| Mentores | El nombre no rompe de línea: su cuerpo se ajusta al ancho de la cabecera con unidades de contenedor, sin pasar del tamaño del diseño. |
| Presentación | Reproductor con interrogación de `public/illustrations/pasos/paso-4.svg` (el mismo archivo, recortado con CSS) y dos personajes Open Peeps (CC0) invertidos en horizontal. |

## Ajustes del dueño tras la ronda 4 (2026-11-23)

Instrucciones explícitas del dueño; mandan sobre `landing-design` donde difieren. Medido con Chrome headless sobre `astro build` servido con `docs/scripts/serve-dist.mjs`, a 375, 768, 1024, 1440 y 1920 px.

| Tema | Resultado |
|---|---|
| Sesiones: hueco bajo el lead | Las flechas ya no ocupan una fila propia (en `landing-design` sí la ocupan) y el carrusel sube `--books-header-pb` sobre la cabecera. Desde 992 px las flechas van arriba a la derecha, a la altura del final del lead; por debajo, en el margen inferior del carrusel, a la derecha, porque arriba solo hay 22 px. A 1920 px el hueco entre el lead y la primera tarjeta pasa de 230 a 78 px; queda el margen que necesitan las tarjetas al inclinarse y subir. |
| Sesiones: CTA | Se quitó "Inscribirme al programa" bajo el carrusel. El enlace de cada tarjeta y los demás CTA del sitio siguen. |
| Header: alturas | Logo, píldoras del menú, "Conoce Squai" y redes miden `--pill-h` y quedan en la misma línea: 29,9 px a 1024, 37,3 a 1280, 42 a 1440 y 56 a 1920. Las redes son círculos de `--pill-h` (antes `--social`, 48u). El logo escala con la píldora en la proporción que tenía (46 px de cuerpo en 62 px de alto): a 1024 px el wordmark baja a 22 px de cuerpo. En móvil la píldora del logo mide 44 px, como el botón de menú. Los `li` del menú pasan a flex desde 1024 px: el hueco de línea bajaba las píldoras unos 4 px respecto al logo. |
| Pie | Cuerpo Midnight (`#0A0C1A`) y barra legal P12 (`#303163`) en todas las páginas, con los tokens fijos `--footer-bg`, `--footer-bar`, `--on-footer` y `--on-footer-muted`. Se quitaron `--accent-deep-bar`, `--on-deep` y `--on-deep-muted` de los temas. Texto 18,02:1 y secundario 13,76:1 sobre Midnight; texto 11,16:1 y hover Gold 7,36:1 sobre P12 (los enlaces legales recuperan el hover Gold). |
| Presentación: personajes | Altura común de 4,2 veces `--peep-w`: 1,4 veces la media de las dos alturas anteriores (2,68 y 3,29), así que la de la izquierda crece un 56 % y la de la derecha un 28 %. Cada personaje se mete el 40 % de su ancho sobre el borde de la tarjeta, para que la tarjeta no se estreche en móvil, y el pie de la tarjeta reserva ese hueco y parte con guion las palabras largas. Sin solapes con texto ni desbordes de 375 a 1920 px. |
| Formulario | La forma de fondo es `#e1e4fd` (P3) opaca. |
| Pausar animaciones | Sin borde; se separa del fondo con la misma sombra que volver arriba. El foco por teclado sigue siendo el contorno global. |
| Mentores y Testimonios | Testimonios sube `--edge-r` (antes 2,5/4/6 rem, menos que el radio) y Mentores suma `--edge-r` a su padding inferior: detrás de las esquinas asoma el dorado. Se revisaron las ocho esquinas curvas de la página: en todas asoma el fondo de la sección vecina. Presentación, Mentores y la base de Qué vas a lograr y Testimonios tienen vecinos blancos y se ven igual que el fondo de la página. |
| Testimonios | Fondo P5 (`#c3c9fc`). Tarjetas blanca, Gold 3 y P2 (cita 19,44, 17,24 y 17,14:1; contexto 7,10, 6,30 y 6,26:1). El lead pasa a Neutral 12 (10,26:1): Neutral 11 daba 4,43:1. Los bloques de esquina entran al pasar el mouse o con foco con la misma regla que Datos clave (`hoverOnly` y `.one-card-host`: opacidad 0,22 s y escala de 0,58 a 1 en 0,36 s); en táctil quedan ocultos, como en Datos clave y Sesiones. |

## Ajustes del dueño tras la ronda 6 (2026-11-24)

Comparado lado a lado con `landing-design` (vite) en Chrome headless sobre `astro build` servido con `docs/scripts/serve-dist.mjs`, a 375, 768, 1024, 1440 y 1920 px, en inicio, Squai One, Grow, Learn, Términos, Privacidad, gracias y retomar.

| Tema | Resultado |
|---|---|
| Pie: franja inferior | Padding de `landing-design` (20 px arriba y abajo en móvil, 24 px y 96 px laterales desde 640), texto de 14 px con interlineado de 20 px y alineación centrada en fila. Ya no suma hueco para los flotantes: mide 68 px desde 1024 (antes 144 a 1920), igual que `landing-design`. Por debajo de 1024 la altura sigue al texto: el nuestro es más corto que el del diseño y parte en menos líneas (132 px a 375 frente a 180; 96 a 768 frente a 116). Cuerpo `#0A0C1A` y franja `#303163`, como pidió el dueño. |
| Pie: botones flotantes | Cuando la franja asoma, Pausar animaciones y volver arriba suben lo que asoma (`--footer-bar-overlap`, `src/lib/float-lift.ts`) para no tapar el copyright, que empieza a 96 px. WhatsApp solo sube por debajo de 640 px: desde ahí cabe en el margen derecho de la franja, como en el diseño. Ningún flotante tapa texto de la franja en ninguna página ni ancho. |
| CTA del navbar | `btn-primary` con el color de la página: Periwinkle 9 en inicio, legales, gracias y retomar (6,77:1), Teal 9 en Grow (10,64:1) y Gold 9 en Learn (11,90:1), con texto y flecha Midnight. Squai One conserva el botón oscuro. |
| Hero de inicio | Sin botón propio de pausa. La escritura de palabras solo avanza con `motionAllowed()`: el botón flotante la congela a mitad de palabra y la reanuda; con movimiento reducido no corre y se quita el cursor. |
| Pausar animaciones | Pausa todas las animaciones infinitas del sitio: formas, bloques a la deriva, cintas, respiración de manchas y el ratón del hero. Visible en las ocho páginas, arriba y al final. Con `prefers-reduced-motion: reduce` el botón se oculta porque no queda nada que pausar; `landing-design` no tiene botón y respeta la preferencia del sistema (`MotionConfig reducedMotion="user"`). |
| Lo que necesitas saber | Carrusel de Sesiones (flechas, arrastre e inclinación) con diez tarjetas de solo título, descripción e ilustración, con los textos del dueño, editables en `keyFacts.cards`. Cada tarjeta tiene su ilustración: cuatro del repo (calendario, grabación, guías y certificado) y seis nuevas con bustos de Open Peeps (CC0) y objetos del mismo trazo, registradas en `CREDITOS.md`. Fechas y horario dinámicos siguen en el hero y en la franja de datos; duración, sesiones, modalidad y cupo quedan en las tarjetas 1 a 5. |
| Franja de datos | A 375 y 414 px las cintas tienen el mismo alto (129 y 106 px; 142 y 117 px) y el mismo cuerpo de letra (16,79 y 18,54 px) que `landing-design`: no hubo que cambiar nada. |
