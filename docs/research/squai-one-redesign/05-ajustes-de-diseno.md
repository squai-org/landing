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
| Pie | Vuelve `--accent-deep` (superficie del servicio) y la barra legal usa `--accent-deep-bar` (paso 11), un tono más claro que el cuerpo. |
| Mentores | El nombre no rompe de línea: su cuerpo se ajusta al ancho de la cabecera con unidades de contenedor, sin pasar del tamaño del diseño. |
| Presentación | Reproductor con interrogación de `public/illustrations/pasos/paso-4.svg` (el mismo archivo, recortado con CSS) y dos personajes Open Peeps (CC0) invertidos en horizontal. |
