# Movimiento: curvas, springs y gestos del diseño

Valores exactos de `squai-org/landing-design` (`src/index.css` y las props `transition`, `whileHover`, `whileTap` y `whileInView` de `src/components/*.tsx`). Se replican igual: mismas curvas, duraciones y springs.

## Dónde vive

- `src/lib/motion.ts`: constantes (`easing`, `springs`, `tweens`, `gestures`) y ayudas sobre la API sin React de `motion` (`animate`, `inView`, `scroll`, `hover`, `press`). Es el único módulo de animación del sitio y se importa desde el `<script>` de un componente Astro. Ayudas: `revealOnView` (entrada al entrar en pantalla), `scrollRange` (parallax con los offsets del diseño `start end` / `start start`) y `flagWhileInView` (marca `data-breathing` mientras el elemento está visible).
- `src/styles/global.css`: las curvas como variables CSS (`--ease-smooth`, `--ease-soft-overshoot`, `--ease-bounce`, `--button-ease-bounce`, `--button-alt-ease-bounce`, `--ease-click`) y las animaciones de botones, pills y botones sociales, que en el diseño son CSS puro.

Regla: si el diseño anima con CSS (hover y press de botones, onda de letras, bloques que flotan), se usa CSS. Si anima con `motion/react`, se usa `motion` con los mismos valores.

## Curvas (`easing`)

| Nombre | Curva | Uso en el diseño |
| --- | --- | --- |
| `smooth` | `cubic-bezier(0.32, 0.72, 0, 1)` | Entradas en vista, menú móvil, acordeón, cabecera al hacer scroll (300 ms) |
| `softOvershoot` | `cubic-bezier(0.59, 1, 0.88, 1.01)` | Primera fase del squash de botones (150 ms) |
| `bounce` | `cubic-bezier(0.34, 1.57, 0.64, 1)` | Onda de letras (620 ms), tarjetas al hover |
| `buttonBounce` | `cubic-bezier(0.34, 2.27, 0.64, 1)` | Rebote del squash (350 ms con 150 ms de retraso) |
| `click` | `cubic-bezier(0.4, 0, 0.2, 1)` | Escala al presionar (150 ms) |
| `popover` | `cubic-bezier(0.16, 1, 0.3, 1)` | Paneles flotantes (160 ms) |
| `motionDefault` | `cubic-bezier(0.25, 0.1, 0.35, 1)` | Tween por defecto de `motion` (300 ms) para opacidad sin transición explícita |

## Springs (`springs`)

| Nombre | Valores | Dónde |
| --- | --- | --- |
| `gestureScale` | stiffness 550, damping 30 | Spring por defecto de `motion` para `scale` en `whileHover`/`whileTap` |
| `gestureRotate` | stiffness 500, damping 25 | Spring por defecto de `motion` para `rotate`, `x`, `y` |
| `presentationMedia` | stiffness 210, damping 18 | Media de Presentación: de `{opacity 0, rotate 6, scale 0.9}` a `{opacity 1, rotate 2.5, scale 1}`, `amount 0.2`; hover `{rotate 0, scale 1.02}` |
| `audienceSwap` | stiffness 240, damping 22 | Cambio de perfil en ¿Es para ti? |
| `flowCard` | stiffness 185, damping 18, retraso `idx × 0.08` | Tarjetas de pasos: de `{opacity 0, y 120, rotate reposo × 2}` a `{opacity 1, y 0, rotate 0}`, `amount 0.15` |
| `mentorCard` | stiffness 195, damping 18, retraso `idx × 0.1` | Mentores: de `{opacity 0, y 40, rotate ±3}` a `{1, 0, 0}`, `amount 0.15` |
| `testimonialCard` | stiffness 195, damping 18, retraso `idx × 0.08` | Testimonios: de `{opacity 0, y 40, rotate reposo × 1.8}` a `{1, 0, 0}`, `amount 0.2` |
| `outcomeLabel` | duration 0.85, bounce 0.45, retraso `idx × 0.072` | Etiquetas de logros: de `{scale 0, rotate entrada}` |

Además, el carrusel de sesiones usa una física propia (`MOMENTUM`: xy 25, rotation 15, clampXY 1080, clampRot 60, stiffness 170, damping 13).

## Tweens (`tweens`)

| Nombre | Valores | Dónde |
| --- | --- | --- |
| `menuOverlay` | 0.2 s | Fondo del menú móvil, opacidad 0 → 1 |
| `menuPanel` | 0.28 s, `smooth` | Panel del menú móvil: de `{opacity 0, scale 0.92, y -12}` a `{1, 1, 0}`; al cerrar a `{opacity 0, scale 0.94, y -12}` |
| `popover` | 0.16 s, `popover` | Panel de WhatsApp y notificaciones: de `{opacity 0, y 12, scale 0.96}` |
| `sectionReveal` | 0.42 s, `smooth` | Presentación: de `{opacity 0, y 24}`, `amount 0.25` |
| `includesCard` | 0.48 s, `smooth`, retraso `idx × 0.07` | Datos clave: de `{opacity 0, y 36}`, `amount 0.15` |
| `formReveal` | 0.38 s, `smooth` | Inscripción, encabezado: de `{opacity 0, y 24}`, `amount 0.25` |
| `formCardReveal` | 0.4 s, retraso 0.08, `smooth` | Inscripción, tarjeta: de `{opacity 0, y 28}`, `amount 0.2` |
| `faqItem` | 0.36 s, `smooth` | Preguntas: de `{opacity 0, y 24}`, `amount 0.15` |
| `faqPanel` | 0.28 s, `smooth` | Respuesta del acordeón: de `{height 0, opacity 0}` |

Scroll ligado (`useScroll` + `useTransform`): en el hero, con `offset ['start start', 'end start']`, la persona baja 0 → 40 px, el bloque sube 0 → -60 px y la cinta baja 0 → 84 px; en Cómo funciona, con `['start end', 'end start']`, el mazo de tarjetas va de 32 a -32 px. Con la API sin React: `scroll(animate(el, { y: [0, 40] }, { ease: 'linear' }), { target, offset })`.

## Gestos (`gestures`)

| Elemento | Hover | Press |
| --- | --- | --- |
| Botón de WhatsApp | `{scale 1.07, rotate -4}` y el bloque interno `scale 1.05` en 200 ms | `{scale 0.94}` |
| Volver arriba | `{scale 1.06}` | `{scale 0.95}` |

`hoverPress(elemento, gestures.whatsapp)` los aplica con los springs por defecto de `motion` y, al soltar, vuelve al estado de hover si el puntero sigue encima (como `whileTap` en React).

## Botones (CSS)

- Botón de dos piezas (`.btn`, `Button.astro`): al presionar, `scale: 0.955 0.925` en 150 ms `click`. En hover o foco, el fondo de cada pieza hace `scale: 0.955 0.925` (150 ms `softOvershoot`) y luego `transform: scale(1.047, 1.081)` (350 ms con 150 ms de retraso, `buttonBounce`); la pieza de texto se inclina `translate 0.25em 0.125em` + `rotate 4deg` y se endereza con `rotate(-4deg) translate3d(-0.25em, -0.125em, 0)`; la flecha, `translate -0.5em 0.25em` + `rotate -18deg` y vuelta con `rotate(18deg) translate3d(0.5em, -0.25em, 0)`.
- Pills del menú y botones sociales (`.pill-button`, `.social-button`): el mismo squash del fondo con `buttonBounce`; al presionar, `0.955 0.925` en la pill y `0.95` en el social.
- Onda de letras: cada letra (`.split-char`) recorre `translateY 45% scaleY 0.32 rotate 16deg` (24 %) → `translateY -10% scaleY 1.06 rotate -4deg` (58 %) → reposo, en 620 ms `bounce` con 16 ms de desfase por letra. Las letras se generan en el navegador (`splitTextOnHover` sobre `[data-split-text]`) y se pintan con `::before`, así que `textContent` del botón sigue siendo el texto real y los scripts que lo cambian (enviando, pagar) no se rompen.
- Bloques de las pills activas: los cuatro presets del diseño (`src/lib/pill-blocks.ts`) con la animación `drift-block` de `motion.css`.

## Movimiento reducido y pausa

- Con `prefers-reduced-motion: reduce` no hay squash, onda, press ni gestos de `motion`; `animateIn`/`animateOut` aplican el estado final sin animar y `revealOnView` no oculta nada.
- La onda y el squash solo existen con puntero fino (`hover: hover` y `pointer: fine`), como en el diseño.
- Lo ambiental (bloques que flotan, fondos, franjas) se pausa con el botón global (`html[data-motion='paused']` y `.ambient`). `motionAllowed()` devuelve falso si hay movimiento reducido o pausa global: úsalo antes de lanzar cualquier animación que no responda a un gesto del usuario.

## CSP

`motion` se empaqueta con el sitio y no carga nada externo. Escribe estilos con `element.style` (CSSOM) y anima con Web Animations, que la CSP no restringe; los atributos `style=""` que genera el HTML caen en `style-src-attr 'unsafe-inline'`, que ya permite `src/integrations/csp-headers.mjs`. Verificado en el navegador con la CSP de `dist/_headers` sin errores de consola.
