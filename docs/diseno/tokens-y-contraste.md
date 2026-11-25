# Base visual: tokens, tema por servicio y contraste

Todo vive en `src/styles/global.css`. Los componentes no escriben colores: usan los tokens de rol (`--accent`, `--accent-ink`, `--accent-deep`...) y cambiar de servicio es cambiar un bloque de variables, no tocar componentes.

## Escalas de la paleta

`--neutral-1..12`, `--periwinkle-1..12`, `--gold-1..12` y `--teal-1..12` son las escalas de 12 pasos de la guía de marca v8.7 (el paso 9 es el color de marca). Más `--midnight` (`#0A0C1A`), `--canvas` (`#F4F6FF`) y `--surface` (blanco). Los nombres antiguos (`--periwinkle`, `--periwinkle-ink`, `--gold`, `--teal`, `--teal-ink`...) siguen existiendo como alias de un paso de la escala.

## Tema por servicio

El servicio activo se declara con `data-service="<slug>"` en `<html>` (la prop `service` de `Layout.astro`; la página de servicio le pasa el slug). Los valores por defecto son los de Squai One y la marca madre: Periwinkle.

| Token de rol | Qué es | Squai One (defecto) | Squai Grow | Squai Learn |
| --- | --- | --- | --- | --- |
| `--accent` | Relleno sólido (botones, puntos) | `--periwinkle-9` | `--teal-9` | `--gold-9` |
| `--accent-hover` | Hover del sólido | `--periwinkle-10` | `--teal-10` | `--gold-10` |
| `--accent-soft` | Fondo suave (paso 3) | `--periwinkle-3` | `--teal-3` | `--gold-3` |
| `--accent-soft-strong` | Decoración y bloques (paso 4) | `--periwinkle-4` | `--teal-4` | `--gold-4` |
| `--accent-line` | Bordes decorativos (paso 6) | `--periwinkle-6` | `--teal-6` | `--gold-6` |
| `--accent-ink` | Texto y enlaces de acento sobre claro (paso 11) | `--periwinkle-11` | `--teal-11` | `--gold-11` |
| `--accent-deep` | Paso 12 del servicio: color de enlaces en hover sobre claro | `--periwinkle-12` | `--teal-12` | `--gold-12` |
| `--on-accent` | Texto sobre `--accent` | `--midnight` | `--midnight` | `--midnight` |

Reglas: el texto sobre un paso 9 es siempre Midnight, nunca blanco; el paso 9 nunca es texto sobre claro (para eso está `--accent-ink`). Gold solo se usa como acento donde pasa AA: relleno con texto Midnight, lema y enlaces en hover sobre superficies oscuras, y paso 11 como texto en Squai Learn.

El CTA del navbar usa el botón principal (`btn-primary`: relleno `--accent`, texto y flecha `--on-accent`) en todas las páginas menos Squai One, que conserva el botón oscuro: Periwinkle 9 en inicio, legales, gracias y retomar; Teal 9 en Squai Grow; Gold 9 en Squai Learn.

Para añadir un servicio: un bloque `[data-service='<slug>'] { ... }` con esos ocho tokens y filas nuevas en la tabla de contraste (la prueba falla si una fila no cumple).

## Escala del diseño

Los tamaños de controles, radios y márgenes laterales vienen de `src/index.css` de `landing-design`, que copia la escala de la referencia: `--u` es 1 px del diseño ajustado al ancho de pantalla (402 px de diseño en móvil, 834 desde 768 px y 1920 desde 992 px). Valores exactos:

| Token | Móvil (< 768) | 768–991 | Desde 992 |
| --- | --- | --- | --- |
| `--gutter` (margen lateral) | 16u | 24u | 40u |
| `--section-py` | 70u | 70u | 140u |
| `--btn-h` (alto de botón) | máx(44 px, 48u) | máx(44 px, 48u) | 56u |
| `--btn-fs` | máx(16 px, 17u) | máx(16 px, 17u) | máx(16 px, 20u) |
| `--btn-px` | 14u | 14u | 20u |
| `--btn-r` (radio de botón) | 8u | 8u | 8u |
| `--btn-icon` | máx(16 px, 20u) | máx(16 px, 20u) | máx(16 px, 20u) |
| `--pill-h` (pill del menú) | máx(44 px, 40u) | máx(44 px, 40u) | 56u |
| `--pill-fs` | máx(16 px, 17u) | máx(16 px, 17u) | máx(16 px, 24u) |
| `--pill-px` | 16u | 16u | 16u |
| `--social` (botón circular) | máx(44 px, 24u) | máx(44 px, 24u) | 48u |
| `--card-r`, `--band-r`, `--edge-r` | 32u, 32u, 40u | 32u, 32u, 40u | 32u, 160u, 160u |
| `--header-pt` | máx(20 px, 32u) | máx(20 px, 32u) | máx(20 px, 32u) |

Medidas fijas del diseño: logo de la cabecera a 46 px de cuerpo en píldora Canvas con 8 px × 16 px de relleno; logo del pie a 38 px; botón de WhatsApp de 64 px a 20 px de los bordes; menú móvil con panel P2 de radio 32 px y relleno 20 px, elementos de 20 px en blanco con radio 16 px.

Desviaciones conscientes: a ≥ 992 px los controles no tienen el mínimo de 44 px (el diseño solo lo exige en móvil; el mínimo de WCAG 2.5.8 es 24 px y la escala da 30 px a 1024). Los huecos de 240 px a los lados del menú solo se aplican desde 1280 px: entre 1024 y 1279 el menú del diseño no cabe con ellos, y las redes se ocultan en ese tramo como antes.

Tipografía: el diseño carga Familjen Grotesk 500–700 y Atkinson Hyperlegible Next 400–700 (más la cursiva 400, que no usa ningún componente) y Gloria Hallelujah 400. Las fuentes de `public/fonts` son variables (Familjen 400–700, Atkinson 200–800) y cubren todos los pesos usados.

## Superficies oscuras

El pie tiene el mismo color en todas las páginas, sin tema por servicio: el cuerpo usa `--footer-bg` (Midnight, `#0A0C1A`) y la barra legal `--footer-bar` (P12, `#303163`), un tono más claro. El texto es `--on-footer` (Canvas) y el secundario `--on-footer-muted` (P4). Los enlaces en hover, incluidos los de la barra legal, pasan a Gold 9 (7,36:1 sobre P12). `data-surface="deep"` invierte los tokens de foco para esa superficie. Las tarjetas oscuras usan Midnight o `--night-surface`.

## Foco visible

Regla global `:focus-visible` igual que `landing-design`: contorno de 2 px `--focus-ink` (Periwinkle 11, `#5a5bb6`) separado 3 px del elemento y sin halo. Sobre `data-surface="deep"` el contorno es Canvas y sobre el hero Periwinkle (`.one-hero-band`) es Midnight, porque Periwinkle 11 no llega a 3:1 contra Periwinkle 9 ni contra P12. Los campos de formulario ya no suprimen el contorno.

## Contraste

Mínimos WCAG 2.2: 4,5:1 para texto normal y 3:1 para componentes de interfaz e indicadores de foco. Cada fila de la tabla se recalcula contra `global.css` en `test/build/contrast.test.ts`: el test falla si el color de un token cambia y la combinación deja de cumplir, o si el ratio escrito aquí deja de coincidir.

Columnas: `Tema` (`base` es Squai One y la marca madre; `grow` y `learn` aplican el bloque del servicio sobre `:root`), uso, color de primer plano, color de fondo, ratio calculado y mínimo exigido. Los valores `#hex` son colores sueltos que aún no tienen token.

| Tema | Uso | Primer plano | Fondo | Ratio | Mínimo |
| --- | --- | --- | --- | --- | --- |
| base | Texto principal | `--ink` | `--canvas` | 18.02 | 4.5 |
| base | Texto principal sobre tarjetas | `--ink` | `--surface` | 19.44 | 4.5 |
| base | Texto de cuerpo | `--ink-body` | `--canvas` | 7.29 | 4.5 |
| base | Texto de cuerpo sobre tarjetas | `--ink-body` | `--surface` | 7.86 | 4.5 |
| base | Texto secundario, ayudas y subtítulos de menú | `--ink-muted` | `--canvas` | 5.37 | 4.5 |
| base | Texto secundario sobre tarjetas | `--ink-muted` | `--surface` | 5.79 | 4.5 |
| base | Error de formulario | `#B3261E` | `--canvas` | 6.06 | 4.5 |
| base | Error de formulario sobre tarjetas | `#B3261E` | `--surface` | 6.54 | 4.5 |
| base | Estado correcto de formulario | `--teal-ink` | `--canvas` | 4.96 | 4.5 |
| base | Tarjeta oscura: texto | `--night-text` | `--night-surface` | 10.40 | 4.5 |
| base | Tarjeta oscura: títulos | `--canvas` | `--night-surface` | 16.59 | 4.5 |
| base | Pill de navegación | `--midnight` | `--canvas` | 18.02 | 4.5 |
| base | Wordmark en la píldora del logo | `--midnight` | `--canvas` | 18.02 | 4.5 |
| base | Botón dorado | `--midnight` | `--gold-9` | 11.90 | 4.5 |
| base | Botón teal | `--midnight` | `--teal-9` | 10.64 | 4.5 |
| base | CTA del navbar en inicio, legales, gracias y retomar: texto y flecha | `--midnight` | `--periwinkle-9` | 6.77 | 4.5 |
| grow | CTA del navbar en Squai Grow: texto y flecha | `--midnight` | `--teal-9` | 10.64 | 4.5 |
| learn | CTA del navbar en Squai Learn: texto y flecha | `--midnight` | `--gold-9` | 11.90 | 4.5 |
| base | Botón oscuro | `--canvas` | `--midnight` | 18.02 | 4.5 |
| base | Flecha del botón oscuro | `--gold-9` | `--midnight` | 11.90 | 3 |
| base | Botón blanco | `--midnight` | `--surface` | 19.44 | 4.5 |
| base | Botón de pausa de animaciones | `--midnight` | `--canvas` | 18.02 | 4.5 |
| base | Equipo: texto sobre la sección dorada | `--ink` | `--gold-9` | 11.90 | 4.5 |
| base | Equipo: texto sobre tarjeta suave | `--ink` | `--accent-soft` | 15.47 | 4.5 |
| base | Equipo: cargo sobre tarjeta suave | `--ink-muted` | `--accent-soft` | 4.61 | 4.5 |
| base | Testimonios: título sobre la sección | `--midnight` | `--periwinkle-5` | 12.11 | 4.5 |
| base | Testimonios: lead sobre la sección | `--neutral-12` | `--periwinkle-5` | 10.26 | 4.5 |
| base | Testimonios: cita y nombre en tarjeta | `--midnight` | `--surface` | 19.44 | 4.5 |
| base | Testimonios: contexto en tarjeta | `--neutral-11` | `--surface` | 7.10 | 4.5 |
| base | Testimonios: cita y nombre en tarjeta | `--midnight` | `--gold-3` | 17.24 | 4.5 |
| base | Testimonios: contexto en tarjeta | `--neutral-11` | `--gold-3` | 6.30 | 4.5 |
| base | Testimonios: cita y nombre en tarjeta | `--midnight` | `--periwinkle-2` | 17.14 | 4.5 |
| base | Testimonios: contexto en tarjeta | `--neutral-11` | `--periwinkle-2` | 6.26 | 4.5 |
| base | Franja dorada animada (marquee) | `--midnight` | `--gold-9` | 11.90 | 4.5 |
| base | Franja oscura animada (marquee) | `--canvas` | `--midnight` | 18.02 | 4.5 |
| base | Botón fantasma sobre Midnight | `--canvas` | `--midnight` | 18.02 | 4.5 |
| base | Pie: texto principal y enlaces | `--on-footer` | `--footer-bg` | 18.02 | 4.5 |
| base | Pie: texto secundario | `--on-footer-muted` | `--footer-bg` | 13.76 | 4.5 |
| base | Pie: enlace de WhatsApp y enlaces en hover | `--gold-9` | `--footer-bg` | 11.90 | 4.5 |
| base | Foco sobre el pie | `--canvas` | `--footer-bg` | 18.02 | 3 |
| base | Pie, barra legal: texto y enlaces | `--on-footer` | `--footer-bar` | 11.16 | 4.5 |
| base | Pie, barra legal: enlaces en hover | `--gold-9` | `--footer-bar` | 7.36 | 4.5 |
| base | Foco sobre la barra legal | `--canvas` | `--footer-bar` | 11.16 | 3 |
| base | Foco: anillo sobre superficie clara | `--focus-ink` | `--canvas` | 5.40 | 3 |
| base | Foco: anillo Midnight sobre el hero Periwinkle | `--midnight` | `--periwinkle-9` | 6.77 | 3 |
| base | Foco: halo sobre superficie oscura | `--canvas` | `--midnight` | 18.02 | 3 |
| base | Texto del botón principal | `--on-accent` | `--accent` | 6.77 | 4.5 |
| base | Enlaces y texto de acento sobre Canvas | `--accent-ink` | `--canvas` | 5.40 | 4.5 |
| base | Texto de acento sobre blanco | `--accent-ink` | `--surface` | 5.82 | 4.5 |
| base | Texto de acento sobre fondo suave | `--accent-ink` | `--accent-soft` | 4.64 | 4.5 |
| base | Texto oscuro sobre fondo suave | `--midnight` | `--accent-soft` | 15.47 | 4.5 |
| base | Temario: texto oscuro sobre tarjeta crema | `--midnight` | `--gold-3` | 17.24 | 4.5 |
| base | Requisitos: nota manuscrita y Nota sobre blanco | `--periwinkle-11` | `--surface` | 5.82 | 4.5 |
| base | Requisitos: nota manuscrita y Nota sobre el fondo decorativo | `--periwinkle-11` | `--periwinkle-2` | 5.13 | 4.5 |
| base | Requisitos: cuerpo y listas sobre blanco | `--midnight` | `--surface` | 19.44 | 4.5 |
| base | Requisitos: cuerpo y listas sobre el fondo decorativo | `--midnight` | `--periwinkle-2` | 17.14 | 4.5 |
| base | Foco sobre el pie | `--canvas` | `--periwinkle-12` | 11.16 | 3 |
| base | Botón Conoce Squai junto a las redes | `--midnight` | `--canvas` | 18.02 | 4.5 |
| base | Inscripción: campo sobre la forma de fondo | `--surface` | `--periwinkle-4` | 1.41 | 1.4 |
| base | Inscripción: texto oscuro sobre la forma de fondo | `--midnight` | `--periwinkle-4` | 13.76 | 4.5 |
| base | Inscripción: etiqueta de descuento sobre la forma de fondo | `--gold-9` | `--periwinkle-4` | 1.16 | 1.1 |
| base | Inscripción: texto secundario sobre la forma de fondo | `--neutral-11` | `--periwinkle-4` | 5.03 | 4.5 |
| base | Menú móvil: elementos sobre blanco | `--midnight` | `--surface` | 19.44 | 4.5 |
| base | Menú móvil: panel | `--midnight` | `--periwinkle-2` | 17.14 | 4.5 |
| base | Botones sociales | `--midnight` | `--canvas` | 18.02 | 3 |
| grow | Texto del botón principal | `--on-accent` | `--accent` | 10.64 | 4.5 |
| grow | Enlaces y texto de acento sobre Canvas | `--accent-ink` | `--canvas` | 4.96 | 4.5 |
| grow | Texto de acento sobre blanco | `--accent-ink` | `--surface` | 5.34 | 4.5 |
| grow | Texto de acento sobre fondo suave | `--accent-ink` | `--accent-soft` | 4.63 | 4.5 |
| grow | Texto oscuro sobre fondo suave | `--midnight` | `--accent-soft` | 16.86 | 4.5 |
| learn | Texto del botón principal | `--on-accent` | `--accent` | 11.90 | 4.5 |
| learn | Enlaces y texto de acento sobre Canvas | `--accent-ink` | `--canvas` | 4.81 | 4.5 |
| learn | Texto de acento sobre blanco | `--accent-ink` | `--surface` | 5.19 | 4.5 |
| learn | Texto de acento sobre fondo suave | `--accent-ink` | `--accent-soft` | 4.60 | 4.5 |
| learn | Texto oscuro sobre fondo suave | `--midnight` | `--accent-soft` | 17.24 | 4.5 |
| base | Hero de Squai One: texto sobre Periwinkle | `--midnight` | `--periwinkle-9` | 6.77 | 4.5 |
| base | Datos clave: texto en tarjeta clara | `--midnight` | `--periwinkle-2` | 17.14 | 4.5 |
| base | Datos clave: texto en tarjeta intermedia | `--midnight` | `--periwinkle-4` | 13.76 | 4.5 |
| base | Datos clave: título en tarjeta P3 | `--midnight` | `--periwinkle-3` | 15.47 | 4.5 |
| base | Datos clave: título en tarjeta P9 | `--midnight` | `--periwinkle-9` | 6.77 | 4.5 |
| base | Datos clave: descripción en tarjeta clara | `--neutral-12` | `--periwinkle-2` | 14.53 | 4.5 |
| base | Datos clave: descripción en tarjeta P3 | `--neutral-12` | `--periwinkle-3` | 13.12 | 4.5 |
| base | Datos clave: descripción en tarjeta intermedia | `--neutral-12` | `--periwinkle-4` | 11.66 | 4.5 |
| base | Datos clave: descripción en tarjeta P9 | `--neutral-12` | `--periwinkle-9` | 5.74 | 4.5 |
| base | Datos clave: apunte a mano | `--accent-ink` | `--canvas` | 5.40 | 4.5 |

## Fuera de la tabla, a propósito

- **Logo.** Los logotipos están exentos de contraste (WCAG 1.4.3 y 1.4.11). El isotipo conserva `#8A8EF9` y `#F9C24D` exactos. El texto "Squai" sí cumple: Midnight sobre la píldora Canvas de la cabecera y Canvas sobre Midnight en el pie.
- **Botón de WhatsApp.** Como en `landing-design`, es el logotipo de WhatsApp en blanco sobre el bloque `#25D366` (1,98:1). Se trata como logotipo de marca; el botón tiene nombre accesible propio. Está anotado en `docs/research/squai-one-redesign/04-cambios-a-revisar.md` por si el dueño prefiere el ícono en Midnight (9,80:1).
- **Bloques decorativos** detrás del enlace activo del menú (`--accent-soft-strong`): son `aria-hidden` y no transmiten información; el estado activo se anuncia con `aria-current`.
- **Bordes decorativos** de pills y tarjetas (`--line-soft`, `--line`): el control se distingue por su relleno y su texto.
- **Texto sobre fotografías e ilustraciones** y el resto de secciones de la página lo documenta el ticket que las diseña, añadiendo filas a esta tabla.
