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
| `--accent-deep` | Superficie oscura (paso 12): pie | `--periwinkle-12` | `--teal-12` | `--gold-12` |
| `--on-accent` | Texto sobre `--accent` | `--midnight` | `--midnight` | `--midnight` |
| `--on-deep` | Texto sobre `--accent-deep` | `--canvas` | `--teal-2` | `--gold-2` |
| `--on-deep-muted` | Texto secundario sobre `--accent-deep` | `--periwinkle-4` | `--teal-5` | `--gold-5` |

Reglas: el texto sobre un paso 9 es siempre Midnight, nunca blanco; el paso 9 nunca es texto sobre claro (para eso está `--accent-ink`). Gold solo se usa como acento donde pasa AA: relleno con texto Midnight, lema y enlaces en hover sobre superficies oscuras, y paso 11 como texto en Squai Learn.

Para añadir un servicio: un bloque `[data-service='<slug>'] { ... }` con esos diez tokens y filas nuevas en la tabla de contraste (la prueba falla si una fila no cumple).

## Superficies oscuras

El pie usa `--accent-deep`: en Squai One es P12 (`#303163`), que pasa AA con `--on-deep`, así que no hizo falta el valor de paleta más cercano. La barra legal bajo el pie y las tarjetas oscuras usan Midnight o `--night-surface`. `data-surface="deep"` invierte los tokens de foco para esa superficie.

## Foco visible

Regla global `:focus-visible` con dos tonos: contorno de 3 px `--focus-ink` (Midnight), separado 3 px del elemento y con un halo `--focus-halo` (Canvas) en ese hueco. El contorno contrasta con Canvas y con Periwinkle, y el halo contrasta con Midnight, así que el indicador supera 3:1 sobre cualquier fondo claro u oscuro. Sobre `data-surface="deep"` el contorno es Canvas y el halo Midnight. Los campos de formulario ya no suprimen el contorno.

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
| base | Pill de navegación en hover | `--midnight` | `--surface` | 19.44 | 4.5 |
| base | Wordmark en la píldora del logo | `--midnight` | `--canvas` | 18.02 | 4.5 |
| base | Wordmark plano sobre Periwinkle (hero claro) | `--midnight` | `--periwinkle-9` | 6.77 | 4.5 |
| base | Botón dorado | `--midnight` | `--gold-9` | 11.90 | 4.5 |
| base | Botón dorado en hover | `--midnight` | `--gold-10` | 9.47 | 4.5 |
| base | Botón teal | `--midnight` | `--teal-9` | 10.64 | 4.5 |
| base | Botón teal en hover | `--midnight` | `--teal-10` | 8.49 | 4.5 |
| base | Botón oscuro | `--canvas` | `--midnight` | 18.02 | 4.5 |
| base | Botón oscuro en hover | `--canvas` | `--neutral-12` | 15.28 | 4.5 |
| base | Flecha del botón oscuro | `--gold-9` | `--midnight` | 11.90 | 3 |
| base | Botón blanco | `--midnight` | `--canvas` | 18.02 | 4.5 |
| base | Botón de pausa de animaciones | `--midnight` | `--canvas` | 18.02 | 4.5 |
| base | Franja dorada animada (marquee) | `--midnight` | `--gold-9` | 11.90 | 4.5 |
| base | Franja oscura animada (marquee) | `--canvas` | `--midnight` | 18.02 | 4.5 |
| base | Botón fantasma sobre Midnight | `--canvas` | `--midnight` | 18.02 | 4.5 |
| base | Pie: barra legal | `--on-deep-muted` | `--midnight` | 13.76 | 4.5 |
| base | Pie: enlaces de la barra legal en hover | `--gold-9` | `--midnight` | 11.90 | 4.5 |
| base | Foco: anillo sobre superficie clara | `--focus-ink` | `--canvas` | 18.02 | 3 |
| base | Foco: anillo sobre Periwinkle (hero claro) | `--focus-ink` | `--periwinkle-9` | 6.77 | 3 |
| base | Foco: halo sobre superficie oscura | `--canvas` | `--midnight` | 18.02 | 3 |
| base | Texto del botón principal | `--on-accent` | `--accent` | 6.77 | 4.5 |
| base | Botón principal en hover | `--on-accent` | `--accent-hover` | 5.25 | 4.5 |
| base | Enlaces y texto de acento sobre Canvas | `--accent-ink` | `--canvas` | 5.40 | 4.5 |
| base | Texto de acento sobre blanco | `--accent-ink` | `--surface` | 5.82 | 4.5 |
| base | Texto de acento sobre fondo suave | `--accent-ink` | `--accent-soft` | 4.64 | 4.5 |
| base | Texto oscuro sobre fondo suave | `--midnight` | `--accent-soft` | 15.47 | 4.5 |
| base | Pie, texto principal | `--on-deep` | `--accent-deep` | 11.16 | 4.5 |
| base | Pie, texto secundario y títulos | `--on-deep-muted` | `--accent-deep` | 8.52 | 4.5 |
| base | Pie, lema y enlaces en hover | `--gold-9` | `--accent-deep` | 7.36 | 4.5 |
| base | Foco sobre el pie | `--canvas` | `--accent-deep` | 11.16 | 3 |
| grow | Texto del botón principal | `--on-accent` | `--accent` | 10.64 | 4.5 |
| grow | Botón principal en hover | `--on-accent` | `--accent-hover` | 8.49 | 4.5 |
| grow | Enlaces y texto de acento sobre Canvas | `--accent-ink` | `--canvas` | 4.96 | 4.5 |
| grow | Texto de acento sobre blanco | `--accent-ink` | `--surface` | 5.34 | 4.5 |
| grow | Texto de acento sobre fondo suave | `--accent-ink` | `--accent-soft` | 4.63 | 4.5 |
| grow | Texto oscuro sobre fondo suave | `--midnight` | `--accent-soft` | 16.86 | 4.5 |
| grow | Pie, texto principal | `--on-deep` | `--accent-deep` | 10.12 | 4.5 |
| grow | Pie, texto secundario y títulos | `--on-deep-muted` | `--accent-deep` | 8.40 | 4.5 |
| grow | Pie, lema y enlaces en hover | `--gold-9` | `--accent-deep` | 6.75 | 4.5 |
| grow | Foco sobre el pie | `--canvas` | `--accent-deep` | 10.23 | 3 |
| learn | Texto del botón principal | `--on-accent` | `--accent` | 11.90 | 4.5 |
| learn | Botón principal en hover | `--on-accent` | `--accent-hover` | 9.47 | 4.5 |
| learn | Enlaces y texto de acento sobre Canvas | `--accent-ink` | `--canvas` | 4.81 | 4.5 |
| learn | Texto de acento sobre blanco | `--accent-ink` | `--surface` | 5.19 | 4.5 |
| learn | Texto de acento sobre fondo suave | `--accent-ink` | `--accent-soft` | 4.60 | 4.5 |
| learn | Texto oscuro sobre fondo suave | `--midnight` | `--accent-soft` | 17.24 | 4.5 |
| learn | Pie, texto principal | `--on-deep` | `--accent-deep` | 9.99 | 4.5 |
| learn | Pie, texto secundario y títulos | `--on-deep-muted` | `--accent-deep` | 8.68 | 4.5 |
| learn | Pie, lema y enlaces en hover | `--gold-9` | `--accent-deep` | 6.58 | 4.5 |
| learn | Foco sobre el pie | `--canvas` | `--accent-deep` | 9.97 | 3 |

## Fuera de la tabla, a propósito

- **Logo.** Los logotipos están exentos de contraste (WCAG 1.4.3 y 1.4.11). El isotipo conserva `#8A8EF9` y `#F9C24D` exactos. El texto "Squai" sí cumple: Midnight sobre Canvas, o sobre Periwinkle en el encabezado claro.
- **Bloques decorativos** detrás del enlace activo del menú (`--accent-soft-strong`): son `aria-hidden` y no transmiten información; el estado activo se anuncia con `aria-current`.
- **Bordes decorativos** de pills y tarjetas (`--line-soft`, `--line`): el control se distingue por su relleno y su texto.
- **Texto sobre fotografías e ilustraciones** y el resto de secciones de la página lo documenta el ticket que las diseña, añadiendo filas a esta tabla.
