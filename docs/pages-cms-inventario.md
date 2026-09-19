# Inventario editorial

Cada propiedad de `src/content/copies.json` está clasificada en uno de estos
grupos. Ninguna propiedad pasa al CMS sin clasificación, y ningún campo nuevo se
publica sin entrar antes en esta tabla.

| Grupo | Significado |
| :---- | :---------- |
| **Editable** | El editor lo cambia sin tocar estructura técnica |
| **Con restricciones** | Formato obligatorio o lista cerrada de opciones |
| **Solo lectura** | Se muestra para consultar, no se puede cambiar |
| **Oculto y preservado** | No aparece en el CMS y se conserva al guardar |
| **Fuera del CMS** | Configuración técnica, seguridad y endpoints |

**Efecto de un valor inválido:** el formulario lo rechaza al guardar y no se
crea el commit. Si llega al archivo por una edición manual, el build falla y no
se genera versión candidata; producción se queda con la versión anterior.

Las claves son las de `copies.json`; el nombre para el editor es la etiqueta que
muestra Pages CMS. La tabla se corresponde campo a campo con `.pages.yml`.

## Áreas administradas

### Inicio

Hero, manifiesto, programa y etiquetas de sección de la página principal.

| Clave | Nombre para el editor | Tipo | Oblig. | Restricción | Clasificación | Nota |
| :---- | :-------------------- | :--- | :----- | :---------- | :------------ | :--- |
| `site.tagline` | Frase de marca | texto | sí | — | Editable | Acompaña al logo y abre la página. |
| `site.heroLines.middle` | Primera línea | texto | sí | — | Editable |  |
| `site.heroLines.last` | Segunda línea | texto | sí | — | Editable |  |
| `site.heroLines.object` | Complemento | texto | sí | — | Editable | Cierra la frase animada, por ejemplo "IA.". |
| `site.heroVerbs[]` | Palabras animadas | lista de fichas | sí | lista, mínimo 1 | Editable | Rotan en el hero. Cada una lleva su color. |
| `site.heroVerbs[].word` | Palabra | texto | sí | — | Editable |  |
| `site.heroVerbs[].color` | Color | texto | sí | formato `^#[0-9a-fA-F]{6}$` | Con restricciones | Hexadecimal completo, por ejemplo #8A8EF9. |
| `site.heroSubtitle` | Subtítulo del hero | texto | sí | — | Editable |  |
| `site.program.status` | Estado | texto | sí | — | Editable |  |
| `site.program.name` | Nombre del programa | texto | sí | — | Editable |  |
| `site.program.ecosystem` | Ecosistema | texto | sí | — | Editable |  |
| `site.program.duration` | Duración | texto | sí | — | Editable |  |
| `site.program.schedule` | Modalidad | texto | sí | — | Editable |  |
| `site.program.modality` | Resultado | texto | sí | — | Editable |  |
| `site.statement.headline` | Titular | texto | sí | — | Editable |  |
| `site.statement.body[]` | Párrafos | párrafos | sí | lista, mínimo 1 | Editable |  |
| `site.whatWeDo.body[]` | Párrafos | párrafos | sí | lista, mínimo 1 | Editable |  |
| `site.capabilities[]` | Tarjetas de capacidades | lista de fichas | sí | lista, mínimo 1 | Editable |  |
| `site.capabilities[].t` | Título | texto | sí | — | Editable |  |
| `site.capabilities[].d` | Descripción | texto largo | sí | — | Editable |  |
| `site.capabilities[].tone` | Tono visual | selección | no | opciones: _(vacío)_, `peri`, `dark`, `teal`, `gold` | Con restricciones |  |
| `site.capabilities[].span` | Tamaño en la retícula | texto | sí | **no editable** | Solo lectura | Maquetación. Se consulta, no se edita. |
| `site.impact.body[]` | Párrafos | párrafos | sí | lista, mínimo 1 | Editable |  |
| `site.labels.brand` | Marca (columna del footer) | texto | sí | — | Editable |  |
| `site.labels.whatWeDo` | Título "Qué hacemos" | texto | sí | — | Editable |  |
| `site.labels.services` | Título "Servicios" | texto | sí | — | Editable |  |
| `site.labels.impact` | Título "Nuestro impacto" | texto | sí | — | Editable |  |
| `site.labels.origin` | Título "Cómo nació" | texto | sí | — | Editable |  |
| `site.labels.team` | Título "Equipo" | texto | sí | — | Editable |  |
| `site.labels.faq` | Título "Preguntas frecuentes" | texto | sí | — | Editable |  |
| `site.labels.challenge` | Título "Desafío" (páginas de servicio) | texto | sí | — | Editable |  |
| `site.labels.capabilities` | Título "Programa" (páginas de servicio) | texto | sí | — | Editable |  |
| `site.labels.reserve` | Botón de reserva | texto | sí | — | Editable |  |
| `site.labels.call` | Botón de llamada | texto | sí | — | Editable |  |
| `site.labels.terms` | Enlace a Términos de Servicio | texto | sí | — | Editable |  |
| `site.labels.privacy` | Enlace a Política de Privacidad | texto | sí | — | Editable |  |

### Servicios

Las tres páginas de servicio. La ruta (slug) no se edita aquí.

| Clave | Nombre para el editor | Tipo | Oblig. | Restricción | Clasificación | Nota |
| :---- | :-------------------- | :--- | :----- | :---------- | :------------ | :--- |
| `site.services[]` | Servicios | lista de fichas | sí | lista, mínimo 1 | Editable |  |
| `site.services[].slug` | Ruta | texto | sí | **no editable** | Solo lectura | Define /servicios/<ruta>. Cambiarla rompe enlaces publicados, por eso no se edita. |
| `site.services[].name` | Nombre | texto | sí | — | Editable |  |
| `site.services[].audience` | Público | texto | sí | — | Editable |  |
| `site.services[].menuAudience` | Público (menú) | texto | sí | — | Editable | Versión corta para el submenú de Servicios. |
| `site.services[].slogan` | Eslogan | texto | sí | — | Editable |  |
| `site.services[].cardCopy` | Texto de la tarjeta | texto largo | sí | — | Editable | Aparece en la retícula de servicios de la página principal. |
| `site.services[].discoverLabel` | Enlace "descubrir" | texto | sí | — | Editable |  |
| `site.services[].cta.label` | Texto del botón | texto | sí | — | Editable |  |
| `site.services[].cta.modal` | Formulario que abre | selección | no | opciones: _(vacío)_, `grow`, `learn` | Con restricciones | Vacío significa que el botón lleva a una sección en vez de abrir un formulario. |
| `site.services[].cta.target` | Sección destino | texto | no | **no editable** | Solo lectura | Identificador de la sección a la que baja el botón. Se consulta, no se edita. |
| `site.services[].ctaSecondary` | Botón secundario | texto | no | — | Editable |  |
| `site.services[].contactCta` | Botón de contacto | texto | no | — | Editable |  |
| `site.services[].contactCopy` | Texto de contacto | texto largo | no | — | Editable |  |
| `site.services[].contactAside` | Nota junto al contacto | texto largo | no | — | Editable |  |
| `site.services[].payback.headline` | Titular | texto | sí | — | Editable |  |
| `site.services[].payback.body[]` | Párrafos | párrafos | sí | lista, mínimo 1 | Editable |  |
| `site.services[].challenge.cards[]` | Tarjetas | lista de fichas | sí | lista, mínimo 1 | Editable |  |
| `site.services[].challenge.cards[].t` | Título | texto | sí | — | Editable |  |
| `site.services[].challenge.cards[].d` | Descripción | texto largo | sí | — | Editable |  |
| `site.services[].capabilities.groups[]` | Bloques del programa | lista de fichas | sí | lista, mínimo 1 | Editable |  |
| `site.services[].capabilities.groups[].t` | Título | texto | sí | — | Editable |  |
| `site.services[].capabilities.groups[].items[]` | Puntos | lista de textos | sí | lista, mínimo 1 | Editable |  |
| `site.services[].capabilities.groups[].tone` | Tono visual | selección | no | opciones: _(vacío)_, `peri`, `dark`, `teal`, `gold` | Con restricciones |  |
| `site.services[].faqs[]` | Preguntas frecuentes del servicio | lista de fichas | sí | lista, mínimo 1 | Editable |  |
| `site.services[].faqs[].q` | Pregunta | texto | sí | — | Editable |  |
| `site.services[].faqs[].a[]` | Respuesta | párrafos | sí | lista, mínimo 1 | Editable |  |
| `site.services[].seoHeading` | Titular para buscadores | texto | sí | — | Editable |  |
| `site.services[].seoTitle` | Título SEO | texto | no | — | Editable | Si se deja vacío se usa la plantilla general de SEO. |
| `site.services[].seoDescription` | Descripción SEO | texto largo | no | — | Editable |  |
| `site.services[].accent` | Color de acento | texto | sí | formato `^#[0-9a-fA-F]{6}$` | Con restricciones |  |
| `site.services[].tone` | Tono visual | selección | no | opciones: _(vacío)_, `peri`, `dark`, `teal`, `gold` | Con restricciones |  |
| `site.services[].span` | Tamaño en la retícula | texto | sí | **no editable** | Solo lectura | Maquetación. Se consulta, no se edita. |

### Equipo e historia

Cómo nació Squai, las personas del equipo y las redes sociales.

| Clave | Nombre para el editor | Tipo | Oblig. | Restricción | Clasificación | Nota |
| :---- | :-------------------- | :--- | :----- | :---------- | :------------ | :--- |
| `site.originStory[]` | Cómo nació Squai | párrafos | sí | lista, mínimo 1 | Editable |  |
| `site.squadGrid[]` | Equipo | lista de fichas | sí | lista, mínimo 1 | Editable |  |
| `site.squadGrid[].name` | Nombre | texto | sí | — | Editable |  |
| `site.squadGrid[].role` | Cargo | texto | sí | — | Editable |  |
| `site.squadGrid[].d` | Descripción | texto largo | sí | — | Editable |  |
| `site.squadGrid[].img` | Foto | selección | sí | opciones: `/images/team1.webp`, `/images/team2.webp`, `/images/team3.webp`, `/images/team4.webp`, `/images/team5.webp`, `/images/team6.webp` | Con restricciones | Solo las fotos ya compiladas en el sitio. Subir fotos nuevas es un cambio de código. |
| `site.squadGrid[].linkedin` | LinkedIn | texto | no | formato `^$|^https://` | Con restricciones | URL https completa. Vacío oculta el enlace. |
| `site.socials[]` | Redes sociales | lista de fichas | no | lista | Editable |  |
| `site.socials[].name` | Nombre | texto | sí | — | Editable |  |
| `site.socials[].href` | Enlace | texto | no | formato `^$|^https://` | Con restricciones | URL https completa. Vacío deja la red visible sin enlace. |

### Preguntas frecuentes

Las preguntas de la página principal. Cada servicio tiene las suyas en "Servicios".

| Clave | Nombre para el editor | Tipo | Oblig. | Restricción | Clasificación | Nota |
| :---- | :-------------------- | :--- | :----- | :---------- | :------------ | :--- |
| `site.faqs[]` | Preguntas frecuentes | lista de fichas | sí | lista, mínimo 1 | Editable |  |
| `site.faqs[].q` | Pregunta | texto | sí | — | Editable |  |
| `site.faqs[].a[]` | Respuesta | párrafos | sí | lista, mínimo 1 | Editable |  |

### SEO y textos legales

Metadatos para buscadores, Términos de Servicio y Política de Privacidad.

| Clave | Nombre para el editor | Tipo | Oblig. | Restricción | Clasificación | Nota |
| :---- | :-------------------- | :--- | :----- | :---------- | :------------ | :--- |
| `site.seo.title` | Título de la página principal | texto | sí | — | Editable |  |
| `site.seo.description` | Descripción de la página principal | texto largo | sí | — | Editable |  |
| `site.seo.imageAlt` | Texto alternativo de la imagen social | texto | sí | — | Editable |  |
| `site.seo.serviceTitle` | Plantilla de título para servicios | texto | sí | formato `\{service\}` | Con restricciones | Tiene que contener {service}; ahí se inserta el nombre del servicio. |
| `site.legal.terms.title` | Título | texto | sí | — | Editable |  |
| `site.legal.terms.description` | Descripción para buscadores | texto largo | sí | — | Editable |  |
| `site.legal.terms.updated` | Fecha de actualización | texto | sí | — | Editable | Texto visible, por ejemplo "14 de septiembre de 2026". |
| `site.legal.terms.sections[]` | Secciones | lista de fichas | sí | lista, mínimo 1 | Editable |  |
| `site.legal.terms.sections[].title` | Título de la sección | texto | sí | — | Editable |  |
| `site.legal.terms.sections[].blocks[]` | Bloques | bloques | sí | lista, mínimo 1 | Editable |  |
| `site.legal.terms.sections[].blocks[](paragraph).content[]` | Texto | lista de fichas | sí | lista, mínimo 1 | Editable | Un tramo por cada enlace. Sin enlaces, basta un tramo. |
| `site.legal.terms.sections[].blocks[](paragraph).content[].text` | Texto | texto largo | sí | — | Editable |  |
| `site.legal.terms.sections[].blocks[](paragraph).content[].href` | Enlace | texto | no | formato `^$|^(?:/(?!/)|https://|mailto:|#)` | Con restricciones | Vacío deja el tramo como texto plano. |
| `site.legal.terms.sections[].blocks[](list).items[]` | Puntos | párrafos | sí | lista, mínimo 1 | Editable |  |
| `site.legal.privacy.title` | Título | texto | sí | — | Editable |  |
| `site.legal.privacy.description` | Descripción para buscadores | texto largo | sí | — | Editable |  |
| `site.legal.privacy.updated` | Fecha de actualización | texto | sí | — | Editable | Texto visible, por ejemplo "14 de septiembre de 2026". |
| `site.legal.privacy.sections[]` | Secciones | lista de fichas | sí | lista, mínimo 1 | Editable |  |
| `site.legal.privacy.sections[].title` | Título de la sección | texto | sí | — | Editable |  |
| `site.legal.privacy.sections[].blocks[]` | Bloques | bloques | sí | lista, mínimo 1 | Editable |  |
| `site.legal.privacy.sections[].blocks[](paragraph).content[]` | Texto | lista de fichas | sí | lista, mínimo 1 | Editable | Un tramo por cada enlace. Sin enlaces, basta un tramo. |
| `site.legal.privacy.sections[].blocks[](paragraph).content[].text` | Texto | texto largo | sí | — | Editable |  |
| `site.legal.privacy.sections[].blocks[](paragraph).content[].href` | Enlace | texto | no | formato `^$|^(?:/(?!/)|https://|mailto:|#)` | Con restricciones | Vacío deja el tramo como texto plano. |
| `site.legal.privacy.sections[].blocks[](list).items[]` | Puntos | párrafos | sí | lista, mínimo 1 | Editable |  |

### Interfaz y formularios

Textos de navegación, formularios, modales y mensajes de respuesta.

| Clave | Nombre para el editor | Tipo | Oblig. | Restricción | Clasificación | Nota |
| :---- | :-------------------- | :--- | :----- | :---------- | :------------ | :--- |
| `site.ui.navigation.home` | Enlace al inicio (lector de pantalla) | texto | sí | — | Editable |  |
| `site.ui.navigation.main` | Nombre del menú principal | texto | sí | — | Editable |  |
| `site.ui.navigation.open` | Abrir menú | texto | sí | — | Editable |  |
| `site.ui.navigation.close` | Cerrar menú | texto | sí | — | Editable |  |
| `site.ui.navigation.servicesSubmenu` | Abrir submenú de servicios | texto | sí | — | Editable |  |
| `site.ui.navigation.waitlist` | Botón de lista de espera | texto | sí | — | Editable |  |
| `site.ui.navigation.contactCta` | Botón de contacto | texto | sí | — | Editable |  |
| `site.ui.navigation.oneCta` | Botón de preinscripción | texto | sí | — | Editable |  |
| `site.ui.hero.cta` | Botón principal | texto | sí | — | Editable |  |
| `site.ui.hero.services` | Botón de servicios | texto | sí | — | Editable |  |
| `site.ui.hero.scroll` | Indicador de scroll | texto | sí | — | Editable |  |
| `site.ui.hero.pause` | Pausar palabras animadas | texto | sí | — | Editable |  |
| `site.ui.hero.resume` | Reanudar palabras animadas | texto | sí | — | Editable |  |
| `site.ui.services.payback` | Título "Qué te llevas" | texto | sí | — | Editable |  |
| `site.ui.services.capabilitiesFallback` | Título del programa (respaldo) | texto | sí | — | Editable |  |
| `site.ui.program.duration` | Etiqueta de duración | texto | sí | — | Editable |  |
| `site.ui.program.schedule` | Etiqueta de modalidad | texto | sí | — | Editable |  |
| `site.ui.program.modality` | Etiqueta de resultado | texto | sí | — | Editable |  |
| `site.ui.team.intro[]` | Párrafos de introducción | párrafos | sí | lista, mínimo 1 | Editable |  |
| `site.ui.team.memberAlt` | Texto alternativo de las fotos | texto | sí | formato `^(?=.*\{name\})(?=.*\{role\}).*$` | Con restricciones | Tiene que contener {name} y {role}. |
| `site.ui.finalCta.title` | Título | texto | sí | — | Editable |  |
| `site.ui.finalCta.body[]` | Párrafos | párrafos | sí | lista, mínimo 1 | Editable |  |
| `site.ui.finalCta.cta` | Botón | texto | sí | — | Editable |  |
| `site.ui.follow.title` | Título | texto | sí | — | Editable |  |
| `site.ui.footer.copyright` | Aviso de copyright | texto | sí | — | Editable |  |
| `site.ui.waitlist.title` | Título | texto | sí | — | Editable |  |
| `site.ui.waitlist.copy[]` | Párrafos | párrafos | sí | lista, mínimo 1 | Editable |  |
| `site.ui.waitlist.formTitle` | Título del formulario | texto | sí | — | Editable |  |
| `site.ui.waitlist.formSubtitle` | Subtítulo del formulario | texto | sí | — | Editable |  |
| `site.ui.waitlist.investment.eyebrow` | Antetítulo | texto | sí | — | Editable |  |
| `site.ui.waitlist.investment.copy[]` | Párrafos | párrafos | sí | lista, mínimo 1 | Editable |  |
| `site.ui.waitlist.investment.price` | Precio | texto | sí | — | Editable |  |
| `site.ui.waitlist.investment.currency` | Moneda | texto | sí | — | Editable |  |
| `site.ui.waitlist.investment.referencePrice` | Precio de referencia | texto | sí | — | Editable |  |
| `site.ui.forms.required` | Aviso de campos obligatorios | texto | sí | — | Editable |  |
| `site.ui.forms.fullName` | Etiqueta "Nombre completo" | texto | sí | — | Editable |  |
| `site.ui.forms.email` | Etiqueta "Correo electrónico" | texto | sí | — | Editable |  |
| `site.ui.forms.corporateEmail` | Etiqueta "Correo corporativo" | texto | sí | — | Editable |  |
| `site.ui.forms.organization` | Etiqueta "Organización" | texto | sí | — | Editable |  |
| `site.ui.forms.role` | Etiqueta "Rol" | texto | sí | — | Editable |  |
| `site.ui.forms.countryCode` | Etiqueta "Indicativo" | texto | sí | — | Editable |  |
| `site.ui.forms.phone` | Etiqueta "Teléfono" | texto | sí | — | Editable |  |
| `site.ui.forms.whatsapp` | Etiqueta "WhatsApp" | texto | sí | — | Editable |  |
| `site.ui.forms.teamSize` | Etiqueta "Tamaño del equipo" | texto | sí | — | Editable |  |
| `site.ui.forms.select` | Texto del desplegable vacío | texto | sí | — | Editable |  |
| `site.ui.forms.message` | Etiqueta "Mensaje" | texto | sí | — | Editable |  |
| `site.ui.forms.optional` | Marca de campo opcional | texto | sí | — | Editable |  |
| `site.ui.forms.countrySearch` | Buscador de países | texto | sí | — | Editable |  |
| `site.ui.forms.countryEmpty` | Buscador de países sin resultados | texto | sí | — | Editable |  |
| `site.ui.forms.privacyConsentPrefix` | Consentimiento, texto previo | texto | sí | — | Editable |  |
| `site.ui.forms.privacyConsentLink` | Consentimiento, texto del enlace | texto | sí | — | Editable |  |
| `site.ui.forms.privacyConsentSuffix` | Consentimiento, texto posterior | texto | sí | — | Editable |  |
| `site.ui.forms.teamSizes[]` | Rangos de tamaño de equipo | lista de fichas | sí | lista de 4 | Editable | Los cuatro rangos del desplegable. El valor técnico llega al backend y no se edita. |
| `site.ui.forms.teamSizes[].label` | Texto visible | texto | sí | — | Editable |  |
| `site.ui.forms.teamSizes[].value` | Valor técnico | texto | sí | **no editable** | Solo lectura | Lo espera la API. Se consulta, no se edita. |
| `site.ui.contact.title` | Título | texto | sí | — | Editable |  |
| `site.ui.contact.close` | Botón de cierre | texto | sí | — | Editable |  |
| `site.ui.contact.bookingFallback` | Nota de respaldo de la agenda | texto | sí | — | Editable |  |
| `site.ui.contact.bookingFallbackLink` | Texto del enlace a la agenda | texto | sí | — | Editable |  |
| `site.ui.modal.grow.title` | Título | texto | sí | — | Editable |  |
| `site.ui.modal.grow.copy` | Texto | texto largo | sí | — | Editable |  |
| `site.ui.modal.grow.placeholder` | Texto guía del mensaje | texto | sí | — | Editable |  |
| `site.ui.modal.learn.title` | Título | texto | sí | — | Editable |  |
| `site.ui.modal.learn.copy` | Texto | texto largo | sí | — | Editable |  |
| `site.ui.modal.learn.placeholder` | Texto guía del mensaje | texto | sí | — | Editable |  |
| `site.ui.feedback.sending` | Enviando | texto | sí | — | Editable |  |
| `site.ui.feedback.contactSuccess` | Contacto enviado | texto | sí | — | Editable |  |
| `site.ui.feedback.waitlistSuccess` | Registro en lista de espera | texto | sí | — | Editable |  |
| `site.ui.feedback.invalid` | Formulario incompleto | texto | sí | — | Editable |  |
| `site.ui.feedback.error` | Error inesperado | texto | sí | — | Editable |  |
| `site.ui.feedback.fieldRequired` | Campo obligatorio | texto | sí | — | Editable |  |
| `site.ui.feedback.fieldEmail` | Correo con formato inválido | texto | sí | — | Editable |  |
| `site.ui.feedback.turnstileError` | Falló la verificación de seguridad | texto | sí | — | Editable |  |
| `site.ui.feedback.turnstileUnsupported` | Navegador sin verificación de seguridad | texto | sí | — | Editable |  |
| `site.ui.skip` | Enlace "Saltar al contenido" | texto | sí | — | Editable |  |
| `site.ui.updated` | Prefijo de fecha de actualización | texto | sí | — | Editable |  |

## Oculto y preservado

`settings.content.merge: true` hace que cada guardado mezcle lo editado con el
archivo que ya está en GitHub. Las claves que no declara `.pages.yml` sobreviven
intactas:

| Clave | Qué es | Por qué no está en el CMS |
| :---- | :----- | :------------------------ |
| `site.navLinks[]` | Enlaces del menú principal | Solo estructura: `target` es el identificador de la sección y el texto visible sale de `site.labels` |
| `site.footerCols[]` | Columnas y enlaces del footer | Estructura con exclusividad `t` / `labelKey` y `target` nulo; un formulario no puede expresar "uno u otro" sin arriesgar builds rotos |

El texto visible del menú y del footer se edita en **Inicio → Etiquetas de
sección y botones** (`site.labels`) y en **Interfaz y formularios**
(`site.ui.navigation`, `site.ui.footer`). Lo que queda sin vía editorial son los
tres enlaces literales a las páginas de servicio y el encabezado "Contacto" del
footer: cambiarlos es un cambio de código.

## Fuera del CMS

Nada de esto vive en el contenido y nada de esto se toca al publicar:

| Qué | Dónde |
| :-- | :---- |
| Endpoints de la API | `src/config/endpoints.ts` |
| Página de reservas | `src/config/booking.ts` |
| Validación de formularios y reglas de negocio | `src/server/` |
| Turnstile, rate limiting y cabeceras de seguridad | `src/server/middleware/`, `src/integrations/csp-headers.mjs`, `public/_headers` |
| Esquema y migraciones de D1 | `migrations/` |
| Secretos | Cloudflare (`wrangler secret`), nunca en el contenido |
| Componentes, estilos y maquetación | `src/components/`, `src/styles/` |
| Fotos e imágenes | `src/assets/`, `public/images/`, `public/og/` |

## Imágenes: por qué quedan fuera de la primera entrega

Las fotos del equipo se resuelven por una relación fija entre la ruta editorial
(`/images/teamN.webp`) y el recurso compilado que importa
`src/components/Team.astro`, que además genera las variantes responsive. Una
ruta que no esté en ese mapa se renderiza como imagen rota, sin error de build.

Por eso el contrato (`teamPhotos` en `src/content/schema.ts`) y el CMS exponen
las seis rutas existentes como lista cerrada: el editor puede reasignar qué foto
lleva cada persona, pero no inventar rutas. Habilitar carga libre de medios
exige antes una estrategia de imágenes compatible con el proceso de
construcción; hasta entonces `.pages.yml` no declara `media`.
