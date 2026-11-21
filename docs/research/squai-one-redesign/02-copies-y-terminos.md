# Rediseño de Squai One: copies de Notion, datos configurables y brecha de términos

Fuente primaria: página de Notion "🔠 Landing Page copies Squai One" (id `41cfde7cf0b580ce843ff0caa7f30aef`, Resources DB, `Format: Draft`, `Status: Active`, editada por última vez el 2026-11-20 18:39 UTC). Se leyó completa con el MCP de Notion; no tiene páginas hijas ni bases de datos enlazadas. Las copias y los términos están en la misma página: 11 secciones de landing más "Pie de página" y "En toda la página", y debajo de un separador el bloque "Términos y condiciones, Fundamentos de Inteligencia Artificial Generativa" (11 cláusulas).

Estado del repo: rama `feat/squai-one` en `863fbe9` (incluye #53, límites de venta en `migrations/0008_program_limits.sql`). Las citas `ruta:línea` corresponden a ese commit.

Convención: **Hecho** = lo que dice Notion o el código. **Recomendación** = propuesta de este documento, pendiente de decisión.

---

## Resumen ejecutivo

1. **Notion define 11 secciones**. La página actual cubre unas 4: hero, "Qué te llevas", desafío/capacidades, checkout y FAQ (`src/pages/servicios/[slug].astro:62-92`). Faltan del todo: datos clave, video de presentación, "para quién es / no es para ti", funcionamiento, temario de 6 módulos, equipo en esta página, testimonios, el desglose de precio con descuento y el botón global de WhatsApp.
2. **Hay contradicciones de datos entre el contenido publicado y Notion**:
   - Duración: el sitio dice "5 semanas · 20 horas" y "4 horas semanales". Notion dice 4 semanas, 8 sesiones de 2 h 30 min, 2 por semana, que también suman 20 h. Aparece en `copies.json:755`, `copies.json:178`, `squai-one.json:79`, `squai-one.json:108` y en el JSON-LD `src/lib/seo.ts:169`.
   - Fechas: el sitio dice que llegan por correo (`squai-one.json:79`); Notion las publica en la página.
   - Medios de pago: el sitio no menciona Bre-B (`copies.json:159`).
   - Estado: el hero dice "Inscripciones abiertas" de forma fija (`copies.json:752`, `ServiceHero.astro:25`), pero según D1 hoy (20 nov 2026) el programa está en "próximamente", porque abre el 1 dic (`0008_program_limits.sql:27-28`).
3. **La página de términos actual muestra un precio obsoleto**: "$399.000 COP (aprox. $129 USD)" (`copies.json:433`). D1 y Notion dicen $440.000/147 USD hasta el 31 dic y $550.000/185 USD después (`0007_programs_prices.sql:59-63`). Hay que corregirlo pase lo que pase con el rediseño.
4. **Términos**: de las 11 cláusulas de Notion, 2 ya están en la página actual (uso del material y contacto), 5 de forma parcial y 4 faltan. Lo que falta es casi todo lo específico de la cohorte: fechas, cupo de 30, IVA incluido, precios, qué incluye, conexión, asistencia del 80 %, grabaciones por un mes, cesión del cupo y devolución por fuerza mayor del participante. Va a la nueva sección "Programas de Squai One".
5. **Hay dos conflictos de regla en términos**:
   - Notion dice "se aplica el precio vigente en la fecha del pago". El sistema congela el precio cuando se crea la orden, al enviar el formulario (`GLOSSARY.md:12`, `GLOSSARY.md:20`), y la página actual promete el precio "informado al abrir tu inscripción" (`copies.json:433`).
   - El 20 % de descuento no es exacto en USD: 185 × 0,8 = 148, no 147.
6. **Datos configurables**: precios, apertura, cierre y cupo ya viven en D1 (`program_prices`, `program_limits`). El resto de los datos de la cohorte (fechas, horario, sesiones, horarios por país) no tiene casa en el contenido. Hoy las fechas y el horario están solo en D1 `programs.starts_on/ends_on/schedule` y se usan solo para el correo (`0007_programs_prices.sql:26-30`, `email.service.ts:106`).
7. **JSON-LD**: `courseSchema` lleva datos fijos en el código que quedarían falsos (`seo.ts:150`, `seo.ts:169`). Además, todo lo que entre en `service.faqs` se publica en `FAQPage` (`[slug].astro:53`, `seo.ts:111-120`), así que las FAQ con fechas, horarios o precios llevarían esos datos al JSON-LD.

---

## 1. Secciones de Notion: intención, puntos clave y datos configurables

Notion es la intención de cada sección, no el texto final. Las citas son textuales y cortas; lo demás está resumido.

### 1. Encabezado
- **Intención:** conectar con quien sabe que la IA ahorra tiempo pero no sabe aprovecharla, y prometer una transformación concreta en 20 horas en vivo.
- **Puntos clave:** título orientado al problema; subtítulo "entiendes la IA desde las bases" y la conviertes en herramienta; tres datos al lado (inicio, horario y precio con descuento); botón "Inscribirme al programa"; foto de Laura y Sebastián dando una sesión, con texto alternativo. Apunte a mano: "100% en vivo, sin clases pregrabadas".
- **Datos:**

| Dato | Valor en Notion | Tipo | ¿Cambia en el tiempo? |
|---|---|---|---|
| Fecha de inicio | 26 de enero de 2027 | fecha | Sí, por cohorte |
| Días de sesión | martes y jueves | texto/lista | Sí, por cohorte |
| Horario (Colombia) | 6:30–9:00 p. m. | rango horario + zona | Sí, por cohorte |
| Descuento | 20 % | porcentaje (derivado) | Sí |
| Precio con descuento | $440.000 COP / 147 USD | monto por moneda | Sí (vigencia) |
| Precio regular | $550.000 COP / 185 USD | monto por moneda | Sí |
| Fin del descuento | 31 de diciembre | fecha | Sí |
| Total de horas | 20 | entero | Rara vez (por diseño del programa) |
| Texto del botón | "Inscribirme al programa" | texto | No |
| Alt de la foto | "Laura y Sebastián enseñando en una sesión en vivo." | texto | No |

### 2. Datos clave
- **Intención:** responder de un vistazo las dudas prácticas (formato, duración, nivel, tamaño del grupo, soporte, credencial).
- **Puntos clave (10):** virtual en vivo, sin pregrabados · terminas en 4 semanas · sesiones grabadas · sin conocimientos previos · grupo de máximo 30 · comunidad de WhatsApp · fundamentos que sirven con cualquier IA · mentores que enseñan y aplican · guías y recursos · certificado.
- **Datos:** semanas = 4; sesiones por semana = 2; duración de la sesión = 2 h 30 min; tamaño máximo del grupo = 30 (entero; cambia por cohorte y es el mismo número que el cupo de D1).

### 3. Presentación
- **Intención:** generar confianza con un video corto de los mentores.
- **Puntos clave:** título "En menos de 2 minutos…"; video de Laura y Sebastián con subtítulos y sin reproducción automática; prueba social: "más de 200 personas" en charlas, además de acompañamiento a profesionales y equipos.
- **Datos:** URL del video (no está en Notion); duración < 2 min; contador "más de 200 personas" (entero; cambia con el tiempo y es una afirmación que hay que verificar).

### 4. Para quién es
- **Intención:** que la persona se identifique en un perfil, y filtrar a quien busca otra cosa ("No te vendemos humo").
- **Puntos clave:** título "¿Es para ti?"; 3 perfiles (trabajas en una empresa / trabajas por tu cuenta o tienes un negocio / te da curiosidad); cierre: puedes empezar sin haber usado la IA antes; "No es para ti si…" buscas construir agentes para hacerte rico; "Lo que necesitas": computador, internet y una cuenta gratuita (Claude, ChatGPT o Gemini), con ayuda para crearla en la primera sesión; nota sobre los límites de las versiones gratuitas.
- **Datos:** lista de herramientas de ejemplo (Claude, ChatGPT, Gemini; cambia poco).

### 5. Resultados
- **Intención:** concretar qué logras, en tareas reconocibles.
- **Puntos clave (6):** que la IA repita lo que haces seguido · ordenar el trabajo y priorizar · crear y analizar sin resultados genéricos · pedir con claridad e iterar · cuidar tu información · saber cuándo confiar (alucinaciones; apunte a mano con humor). Cierre: eliges un proyecto personal la primera semana.
- **Datos:** ninguno.

### 6. Funcionamiento
- **Intención:** quitar la incertidumbre sobre qué pasa antes, durante y después.
- **Puntos clave (4 pasos):** una semana antes llegan por correo la invitación a WhatsApp y los datos de conexión · cada sesión tiene explicación, ejemplos en vivo y práctica, y no se avanza con dudas · entre sesiones trabajas el proyecto y preguntas en WhatsApp · al terminar la comunidad sigue abierta, las grabaciones se pueden ver hasta un mes después de la última sesión y recibes el certificado.
- **Datos:** antelación del correo = 1 semana; acceso a grabaciones = 1 mes después de la última sesión.

### 7. Programa (temario)
- **Intención:** mostrar un temario realista y gradual, sin abrumar.
- **Puntos clave:** título "Lo que vemos en las 8 sesiones"; resumen "8 sesiones · 2 por semana · 2 horas y media cada una"; 6 módulos con título, descripción y subtemas (Qué es la IA · Conceptos y uso seguro · De tareas a procesos · Productividad y planeación · Crear documentos, presentaciones e imágenes · Analizar información).
- **Datos:** número de sesiones = 8; número de módulos = 6 (se derivan de la lista). **Observación (hecho):** el título habla de 8 sesiones y la lista tiene 6 módulos; Notion no dice cómo se reparten.

### 8. Equipo
- **Intención:** credibilidad: saben explicar y han llevado la IA a empresas.
- **Puntos clave:** título "Quiénes te enseñan"; Laura Villada (estratega de adopción de IA, magíster en ingeniería, 5 años de docente, directora de operaciones en una empresa de tecnología de EE. UU.); Sebastián Rico (ingeniero de IA, más de 8 años en tecnología, líder de equipos). Cada uno con foto individual. Cierre: "Uno de los dos será tu mentor".
- **Datos:** años de experiencia (5 y 8; cambian con el tiempo y hay que verificarlos).

### 9. Testimonios
- **Intención:** prueba social de experiencias reales.
- **Puntos clave:** título "Así fue aprender con nosotros"; 3 testimonios: Manuela A. (capacitación), Juan Pablo V. (consultoría con Laura) y Claudia M. (consultoría con Sebastián).
- **Datos:** nombre abreviado, contexto (tipo de servicio y mentor). Ninguno viene de una cohorte de Squai One.

### 10. Precio e inscripción
- **Intención:** cerrar la venta con urgencia (descuento con fecha) y transparencia (qué incluye, fechas, cupo).
- **Puntos clave:** título "Aprende IA sin sentirte perdido"; precio regular tachado y precio con descuento; "20% de descuento hasta el 31 de diciembre"; apunte a mano "Ahorras $110.000…"; lista "Qué incluye" (6 ítems); fechas; cupo; botón; texto legal "Al inscribirte aceptas los términos" con enlace.
- **Datos:**

| Dato | Valor en Notion | Tipo | ¿Cambia? |
|---|---|---|---|
| Precio regular | $550.000 COP / 185 USD | monto × moneda | Sí |
| Precio con descuento | $440.000 COP / 147 USD | monto × moneda | Sí |
| Fin del descuento | 31 dic (2026) | fecha | Sí |
| Ahorro | $110.000 (COP) | derivado | Sí |
| Cierre de inscripciones | 22 ene 2027 | fecha | Sí |
| Inicio / fin | 26 ene / 18 feb 2027 | fechas | Sí |
| Horario | mar y jue, 6:30–9:00 p. m. COL; 5:30–8:00 p. m. CDMX | horario × zona | Sí |
| Cupo | 30 | entero | Sí |
| Qué incluye | 6 ítems | lista | Poco |

### 11. Preguntas frecuentes
- **Intención:** resolver objeciones de nivel, costo, ausencias, horario, valor frente a lo gratis, certificado, pago y conexión.
- **10 preguntas:** ¿Necesito saber de tecnología? · ¿Tengo que pagar alguna herramienta? · ¿Qué pasa si falto? · ¿Qué pasa si no puedo asistir o seguir? (cesión del cupo y devolución por fuerza mayor) · ¿Cuál es el horario en mi país? · Si ya uso la IA, ¿me sirve? · ¿En qué se diferencia de lo gratis? · ¿Qué certificado recibo? · ¿Cómo pago? · ¿Cómo me conecto? Cierre: "¿Sigues con dudas? Escríbenos" (enlace a WhatsApp).
- **Datos:**
  - Horario por país: México 5:30–8:00; Perú y Ecuador 6:30–9:00; Venezuela 7:30–10:00; Argentina, Chile y Uruguay 8:30–11:00. Es una tabla país → rango que cambia por cohorte y por horario de verano.
  - Certificado: nombre "Fundamentos de Inteligencia Artificial Generativa"; asistencia mínima 80 % (7 de 8).
  - Medios de pago: tarjeta débito o crédito, PSE, Nequi y Bre-B; fuera de Colombia, solo tarjeta.
  - Enlace de WhatsApp: no está en Notion.

### Pie de página y "En toda la página"
- Pie: "Mismos datos del footer oficial", así que no cambia.
- Global: botón de WhatsApp con el texto "¿Dudas? Escríbenos". El número o enlace no está en Notion ni en el repo: no hay ningún enlace `wa.me` ni `api.whatsapp` en `src/`.

**Verificaciones aritméticas (hechos calculados):**
- 8 × 2,5 h = 20 h ✓.
- Entre el 26 ene y el 18 feb de 2027, martes y jueves, hay 8 sesiones ✓: el 26 ene de 2027 es martes y el 18 feb es jueves.
- 550.000 × 0,8 = 440.000 ✓. 185 × 0,8 = **148**, no 147 ✗: 147 USD es un 20,5 %.
- Desfases horarios para ene–feb de 2027 frente a Colombia (UTC−5): CDMX UTC−6 ✓, Venezuela UTC−4 ✓, Argentina/Uruguay UTC−3 ✓, Chile continental en horario de verano UTC−3 ✓. Desde abril Chile pasa a UTC−4, así que la tabla no sirve para otras cohortes sin revisarla.

---

## 2. Mapeo Notion → contenido actual

Estructura actual de la página (hecho): `ServiceHero` → `ServicePayback` → `ServiceBento` (desafío) → `ServiceCapabilities` → `Checkout` → `Faq` → `Footer` (`src/pages/servicios/[slug].astro:62-96`). Los títulos de desafío y capacidades salen de `labels.challenge` y `labels.capabilities` (`src/lib/content.ts:40-41`).

| # Notion | Campos existentes que ya lo llevan | Qué falta | Nota |
|---|---|---|---|
| 1 Encabezado | `slogan` (`squai-one.json:4`); `cta.label` "Potencia tus habilidades" (`:7`); eyebrow `program.status` + `program.name` (`copies.json:752-753`, `ServiceHero.astro:22-28`) | subtítulo; los tres datos del programa; foto y su alt; el botón de Notion dice "Inscribirme al programa" | `program.status` fijo contradice el estado calculado (ver §4). Hay 4 textos de botón de inscripción distintos: `cta.label`, `labels.reserve` (`copies.json:221`), `ui.navigation.oneCta` (`:57`) y `discoverLabel` (`squai-one.json:11`). |
| 2 Datos clave | parcial: `program.duration/schedule/modality` + `ui.program` (`copies.json:146-149`, `:755-757`), que se pintan en el checkout (`Checkout.astro:164-173`) | lista de 10 ítems (título + descripción) | `program.duration` dice 5 semanas: **contradice**. El tipo `card {t,d}` del schema (`schema.ts:17`) sirve para la lista. |
| 3 Presentación | ninguno | título, URL del video, subtítulos, texto de apoyo | Un iframe o video externo toca la CSP (preguntar antes, `AGENTS.md`). |
| 4 Para quién es | parcial: `challenge.cards` (3 dolores, `squai-one.json:24-37`); FAQ "¿Qué necesito para participar?" (`:89-92`); FAQ general "¿Qué herramientas vamos a usar?" (`copies.json:356-360`) | perfiles, "no es para ti", lista "lo que necesitas", nota de versiones gratuitas | El desafío expresa el mismo público desde el dolor. El "sin vender humo" ya está en `statement` (`copies.json`, home). |
| 5 Resultados | parcial: `payback.headline/body` (`squai-one.json:16-21`) y `capabilities.groups` Entender/Practicar/Ampliar (`:39-62`) | 6 resultados concretos + cierre con el proyecto personal | Aquí Notion tiene más detalle que lo actual. |
| 6 Funcionamiento | parcial: FAQ "¿Cómo me inscribo?" (`squai-one.json:95-98`); `thanks.approvedBody` (`copies.json:163`) | los 4 pasos | — |
| 7 Programa | solo la etiqueta "Nuestro programa" (`copies.json:223`) | título, resumen, texto de apoyo, módulos {título, descripción, subtemas[]} | No hay un tipo con subtemas: hace falta un schema nuevo. |
| 8 Equipo | `squadGrid` Laura y Sebastián (`copies.json:276-289`), `ui.team.intro` (`:35-39`); fotos `teamPhotos` (`schema.ts:26`) | sección en esta página, bios con credenciales, cierre "uno de los dos será tu mentor" | Hoy `Team` solo sale en la home. Cambiar `role` afecta al JSON-LD (ver §3). |
| 9 Testimonios | ninguno | lista {cita, nombre, contexto} | — |
| 10 Precio e inscripción | `ui.checkout.title/copy/investment/currency/status/formTitle/formSubtitle` (`copies.json:151-197`); precio en vivo desde D1 (`Checkout.astro:207-252`); casillas de términos y privacidad (`copies.json:102-104`, `:131-133`; `Checkout.astro:100-110`) | precio tachado, fecha del fin del descuento, "Qué incluye", fechas, cupo | `investment.copy` dice "cinco semanas" (`copies.json:178`): **contradice**. `formSubtitle` no menciona Bre-B. `status.upcomingBody` repite la fecha de apertura de D1 a mano (`copies.json:193`). |
| 11 FAQ | `faqs` de Squai One (7, `squai-one.json:63-106`) | ver la tabla siguiente | — |
| Pie | `footerCols`, `footerServices` (`copies.json`) | — | Sin cambios. |
| WhatsApp global | ninguno | texto en contenido + URL en configuración | — |

**FAQ, una a una:**

| FAQ de Notion | FAQ actual equivalente | Estado |
|---|---|---|
| ¿Necesito saber de tecnología? | home "¿Necesito saber programar…?" (`copies.json:317`); One "¿Qué necesito para participar?" (`squai-one.json:89`) | parcial |
| ¿Tengo que pagar alguna herramienta? | home "¿Qué herramientas vamos a usar?" (`copies.json:356`) | parcial |
| ¿Qué pasa si falto? | "¿Qué pasa si no puedo asistir a una clase en vivo?" (`squai-one.json:83-86`) | parcial: lo actual dice grabadas "durante el programa"; Notion, hasta 1 mes después |
| ¿Qué pasa si no puedo asistir o seguir? | — | falta |
| ¿Cuál es el horario en mi país? | "¿Cuándo son las clases…?" (`squai-one.json:77-80`) | **contradice** (fechas por correo, 4 h × 5 semanas) |
| Si ya uso la IA, ¿me sirve? | — (algo en `payback`) | falta |
| ¿En qué se diferencia de lo gratis? | "¿En qué se diferencia Squai de los otros 500 programas…?" (`squai-one.json:65-68`) | parcial, con otro ángulo |
| ¿Qué certificado recibo? | home "¿Al terminar me dan un certificado?" (`copies.json:337`) | parcial: sin el requisito del 80 % |
| ¿Cómo pago? | `formSubtitle` (`copies.json:159`) | parcial: falta Bre-B |
| ¿Cómo me conecto? | — | falta |

**Contenido actual sin equivalente en Notion (hecho):**
- `payback` (headline/body) y `ctaSecondary`.
- Las 3 tarjetas de `challenge`.
- Los 3 grupos de `capabilities`.
- Los campos de la tarjeta de la home: `cardCopy`, `discoverLabel`, `menuAudience`, `accent`, `span`, `tone`, `order`.
- En `ui.checkout`: `copy` (3 párrafos), `thanks.*`, `status.*`, `button.*`, `currency.*`.
- Las FAQ "¿Hay cupos limitados?" (`squai-one.json:71-74`), "¿Cómo me inscribo?" (`:95-98`) y "¿Llenar el formulario me obliga a pagar?" (`:101-104`).
- `seoTitle` y `seoDescription`.

**Dónde lo actual ya transmite la intención de Notion con más detalle (recomendación: conservarlo):**
- `ui.checkout.copy` (`copies.json:153-157`) explica por qué hay pocos cupos ("avatar silenciado") y que es un pago único sin cobros automáticos. Notion solo dice "máximo 30".
- Las FAQ "¿Llenar el formulario me obliga a pagar?" y "¿Cómo me inscribo?" explican el flujo de orden y pago que Notion no cubre (`GLOSSARY.md:19-25`).
- Las dos casillas explícitas de términos y privacidad (`Checkout.astro:100-110`, #54) son más fuertes que el texto pasivo "Al inscribirte aceptas…" de Notion.
- `ui.checkout.status` y `thanks.enrolled*` cubren estados (próximamente, cerrado, ya inscrito) que Notion no contempla.
- La FAQ "¿Hay cupos limitados?" añade la regla de asignación "en el orden en que se aprueba el pago".
- `challenge` y `capabilities` comunican lo mismo que "Para quién es" y "Resultados" con otro tono. Aquí Notion es más concreto, así que conviene decidir sección por sección (pregunta abierta 6).

---

## 3. Datos configurables: dónde viven

Reglas aplicables (hecho):
- El contenido editable va en JSON validado por `schema.ts` y reflejado en `.pages.yml`.
- La configuración de runtime (rutas de API, URL de reservas) va en `src/config/`.
- Prohibido meter datos no verificados en JSON-LD (precios, fechas, direcciones) (`AGENTS.md`, `seo.ts:8-11`).
- El precio no va en el contenido: vive en D1 `program_prices` (`schema.ts:107-111`, `src/config/checkout.ts:1-5`).

| Dato | Dónde está hoy | Recomendación | Motivo |
|---|---|---|---|
| Precios COP/USD (regular y con descuento) | D1 `program_prices` (`0007:59-63`) | **D1** (sin cambio) | Es lo que se firma para Bold; cambia solo con `valid_from`. |
| Precio tachado y fecha de fin del descuento | No se expone: la API solo devuelve `prices` vigentes, `defaultCurrency` y `status` (`program.service.ts:28-30`, `:79-85`) | **D1 vía API**: el siguiente precio y su `valid_from` | Si va escrito en el contenido, el 1 de enero quedaría un "20 % de descuento" falso. Exponerlo cambia `GET /api/checkout/program`, un contrato público: hay que preguntar. |
| % de descuento y "Ahorras $110.000" | — | **Derivados** en el cliente a partir del precio vigente y el siguiente | Evita el error 147 frente a 148 y la desincronización. |
| Apertura y cierre de inscripciones (1 dic, 22 ene) | D1 `program_limits.opens_at/closes_at` (`0008:27-28`); repetido a mano en `ui.checkout.status.upcomingBody` (`copies.json:193`) | **D1**; para mostrarlo, exponerlo en la API o aceptar duplicarlo en el contenido | Dos fuentes divergen. |
| Cupo (30) | D1 `program_limits.capacity` (`0008:21`) | D1 manda; el texto "máximo 30 personas" se repite en 5 sitios de Notion | Si se duplica en el contenido, hay que documentar que debe coincidir. |
| Estado (abierto/próximamente/cerrado) | Calculado en el Worker (`program.service.ts:52-56`); fijo en `program.status` (`copies.json:752`) y `formSubtitle` "Inscripciones abiertas" (`:159`) | **Calculado**; quitar o volver dinámicos los textos fijos | Hoy el hero miente: dice "abiertas" y el programa está en próximamente. |
| Inicio/fin (26 ene–18 feb 2027), días, horario COL | D1 `programs.starts_on/ends_on/schedule`, solo para el correo (`0007:26-30`, `email.service.ts:106`) | **Contenido** (un objeto de cohorte en `program` de `copies.json`) para el HTML estático | Hace falta en HTML (SEO y sin JS) y lo edita marketing. Duplica a D1 (pregunta abierta). |
| Horarios por país | — | **Contenido** (lista país → rango) | Cambia por cohorte y horario de verano (Chile). |
| Sesiones (8), por semana (2), duración (2 h 30 min), semanas (4), horas (20) | Texto libre `program.duration` (`copies.json:755`) | **Contenido**, como campos numéricos o texto en el objeto de programa | Es diseño del programa, editorial. También alimenta `courseSchema`. |
| Qué incluye, datos clave, temario, resultados, perfiles, pasos, testimonios | — | **Contenido** (schema nuevo + `.pages.yml`) | Editorial. Cambiar `schema.ts` exige preguntar. |
| Asistencia mínima del certificado (80 %, 7/8), grabaciones 1 mes, correo 1 semana antes | — | **Contenido** (texto) | Editorial y legal; debe coincidir con los términos. |
| Medios de pago | `formSubtitle` (`copies.json:159`) | **Contenido** | Depende de lo que tenga activo Bold; hay que verificarlo. |
| URL de WhatsApp | no existe | **`src/config/`** (como `booking.ts`), con el texto del botón en el contenido | Es un enlace de contacto de runtime, igual que el de reservas. |
| URL del video | no existe | **Contenido** si cambia por cohorte, o `src/config/` si es fija; en ambos casos revisar la CSP | Un iframe de YouTube o Vimeo requiere `frame-src`, y la CSP está en la lista de "preguntar antes". |
| Fotos individuales y la de clase | `teamPhotos` en código (`schema.ts:24-26`) | **Código** (añadir una foto es un cambio de código según el propio schema) | — |
| "Más de 200 personas", años de experiencia | — | **Contenido** | Afirmaciones que hay que verificar. |
| Versión de los términos ("noviembre de 2026") | `legal.terms.updated` (`copies.json:372`) | **Contenido** | — |

**Riesgos en JSON-LD (hecho + recomendación):**
- `courseSchema` lleva datos fijos: `timeRequired: 'PT20H'`, `duration: 'PT20H'`, `courseWorkload: '4 horas por semana durante 5 semanas'` y `educationalCredentialAwarded` (`seo.ts:150-151`, `:168-170`). Con Notion, `courseWorkload` pasa a ser falso: serían 5 h por semana durante 4 semanas. **Recomendación:** derivarlo del contenido nuevo o corregirlo en el mismo cambio.
- **No añadir** a `Course`/`CourseInstance`: `offers`/`price` (vive en D1 y cambia el 1 ene), `startDate`/`endDate` (la regla de `AGENTS.md` nombra "dates"), `maximumAttendeeCapacity`, `review`/`aggregateRating` a partir de los testimonios (no vienen de este programa), ni la cifra de 200 personas. Si se quieren fechas, es una decisión humana (pregunta abierta 9).
- `faqSchema(service.faqs)` publica todas las FAQ (`[slug].astro:53`). Las FAQ de Notion "¿Cuál es el horario en mi país?" y "¿Qué pasa si falto?" llevan horarios y plazos de la cohorte al JSON-LD. **Recomendación:** no poner precios en las respuestas de las FAQ, y decidir si los horarios de la cohorte pueden ir en `FAQPage`.
- `organizationSchema` detecta a los fundadores con `/fundador/i` sobre `squadGrid[].role` (`seo.ts:58`). Si el rol se cambia por el de Notion ("Estratega de adopción de IA. Magíster en ingeniería."), Laura y Sebastián desaparecen de `founder`. **Recomendación:** usar un campo de bio aparte o un indicador de fundador.
- `llms.txt` publica `program.duration/schedule/modality` (`src/pages/llms.txt.ts:51-55`), así que hereda la contradicción de las 5 semanas.

---

## 4. Brecha de términos

La página `/terminos-de-servicio` (`src/pages/terminos-de-servicio.astro:1-11`) pinta `legal.terms` con `LegalSections` (`src/components/LegalSections.astro:7-16`). El texto vive en `src/content/copies.json:369-551` y su forma en `schema.ts:58-67`: secciones planas {título, bloques de párrafo o lista}, sin subtítulos. En el CMS se edita en `.pages.yml:2003+` ("Términos de Servicio").

| Cláusula de Notion | ¿Está en la página actual? | Cita actual | Destino propuesto |
|---|---|---|---|
| 1. Quiénes somos (Squai, NIT 902071792) | **Sí** | "Quiénes somos", Squai S.A.S., NIT 902.071.792 (`copies.json:375-381`) | Página existente (sin cambio) |
| 1. Al inscribirte y pagar aceptas | **Parcial** | §1 "Al inscribirte o participar…" (`copies.json:388-394`) | Página existente (sin cambio; ya es más amplia) |
| 2. El programa: virtual en vivo, 8 sesiones de 2 h 30, mar/jue 6:30–9:00 p. m., 26 ene–18 feb 2027 | **Parcial** | §2 "programas educativos en vivo" (`copies.json:401-407`) | **Programas de Squai One** |
| 2. Grupo de máximo 30 personas | **Parcial** | §2 "cupos limitados" (`copies.json:407`), sin número | **Programas de Squai One** |
| 3. Inscripciones del 1 dic 2026 al 22 ene 2027 o hasta llenar los 30 cupos | **No** | — | **Programas de Squai One** |
| 3. El precio incluye IVA e impuestos; pagas lo que ves | **No** | — (el código ya declara el IVA 19 % incluido, `src/config/checkout.ts:9-14`) | **Programas de Squai One** |
| 3. Valor $550.000 COP (185 USD) | **No: contradice** | §4 "$399.000 COP (aprox. $129 USD)" (`copies.json:427-433`) | **Programas de Squai One**, y reescribir o quitar §4 |
| 3. Hasta el 31 dic 2026: $440.000 COP (147 USD) | **No** | — | **Programas de Squai One** |
| 3. Se aplica el precio vigente en la fecha del pago | **Parcial: contradice** | §4 "el precio informado formalmente al abrir tu inscripción es el que se mantendrá" (`copies.json:433`) | Decidir la regla (ver contradicciones) y dejarla en un solo sitio |
| 3. Medios de pago visibles en el botón de inscripción | **No** | — | **Programas de Squai One** |
| 3. El cupo queda confirmado al completar el pago | **Sí (equivalente)** | §2 "se asignan en el orden en que se aprueba el pago" (`copies.json:407`) | Página existente (sin cambio) |
| 4. Qué incluye (8 sesiones, grabaciones, WhatsApp, guías, certificado, acompañamiento) | **No** | — | **Programas de Squai One** |
| 5. Correo con el enlace una semana antes; requisitos (computador, internet, cuenta gratuita) | **No** | — | **Programas de Squai One** |
| 5. Cada herramienta de IA tiene sus términos y límites, que Squai no controla | **No** | (§9 trata de la aplicación de lo aprendido, que es otra cosa, `copies.json:499-505`) | **Programas de Squai One** (o la página general, si se quiere aplicar a todos los servicios) |
| 6. Sesiones grabadas, se pueden ver hasta 1 mes después de la última | **No** | §5 solo cita las grabaciones como material protegido (`copies.json:440-446`) | **Programas de Squai One** |
| 6. Certificado con asistencia ≥ 80 % (7/8); una falta avisada y justificada no cuenta | **No** | — | **Programas de Squai One** |
| 7. Cesión del cupo a otra persona por team@squai.io | **No** | §7 solo "escríbenos para coordinar tu caso" (`copies.json:466-472`) | **Programas de Squai One** |
| 8. Devolución por fuerza mayor del participante (accidente o enfermedad), antes o durante | **Parcial** | §7 cubre la cancelación por parte de Squai (fuerza mayor o falta de cupo mínimo: reprogramar o devolver) (`copies.json:472`); §8 la reprogramación de una clase (`copies.json:486-492`) | **Programas de Squai One** (lo del participante); §7 y §8 actuales se quedan |
| 9. Uso del material: personal, no compartir ni publicar | **Sí (más detalle)** | §5 "no revenderlas, subirlas a un Drive público…" (`copies.json:440-446`) | Página existente (sin cambio) |
| 10. Datos según la "Política de tratamiento de datos" | **Parcial** | Los términos no enlazan la política; existe `/politica-de-privacidad` ("Política de Privacidad", `copies.json:553+`) | Página existente: añadir el enlace a `/politica-de-privacidad` (con el nombre del sitio, no el de Notion) |
| 11. Contacto team@squai.io | **Sí (más detalle)** | §11 con mención a la SIC (`copies.json:525-547`) | Página existente (sin cambio) |
| Encabezado "Versión de noviembre de 2026" | **Parcial** | `updated: "14 de septiembre de 2026"` (`copies.json:372`) | Actualizar `updated` al publicar |

Cláusulas actuales sin equivalente en Notion, que se conservan (recomendación): §3 veracidad de los datos, §6 convivencia (retiro sin reembolso), §7 cancelación por parte de Squai, §8 ajustes de instructor y clase, §9 responsabilidad de aplicación, §10 cambios a los términos, y la mención a la SIC en §11.

**Contradicciones entre Notion, la página actual y el sistema (hecho):**

1. **Precio**: la página dice $399.000/129 USD (`copies.json:433`). Notion y D1 dicen $440.000/147 → $550.000/185 (`0007:59-63`). La página está desactualizada y publicada.
2. **Momento que fija el precio**: tres versiones distintas.
   - Notion: "el precio vigente en la fecha del pago".
   - Página actual: el precio "informado al abrir tu inscripción".
   - Sistema: "La orden toma el precio vigente cuando se crea" (`GLOSSARY.md:12`). La orden se crea al enviar el formulario, antes de pagar (`GLOSSARY.md:20`), y el monto firmado sale de esa orden (`docs/bold-checkout.md:27-32`, `:50-52`).

   Caso límite: alguien envía el formulario el 31 dic a las 23:59 y paga (o le aprueban un PSE pendiente) el 1 ene. El sistema le cobra $440.000; la cláusula de Notion diría $550.000.
3. **"Inscriban y paguen hasta el 31 de diciembre"**: con PSE, un pago puede quedar `PENDING` y aprobarse después (`copies.json:165`). Hay que decidir si cuenta la creación de la orden o la aprobación.
4. **20 % de descuento en USD**: 147 USD no es el 20 % de 185 (sería 148).
5. **Ámbito**: los términos actuales cubren también los servicios para empresas (§1, `copies.json:394`). Los de Notion son solo del programa. Por eso la sección nueva debe ser un apartado dentro de la página, no reemplazarla.
6. **Nombre de la política**: Notion habla de "Política de tratamiento de datos"; el sitio la llama "Política de Privacidad" (`copies.json:224`).

**Encaje técnico (hecho):** `legalPage` no admite subtítulos ni anidar (`schema.ts:58-67`). Una sección "Programas de Squai One" con 7 temas tendría que ir de una de estas formas:
- (a) una sola sección con párrafos y listas en secuencia;
- (b) varias secciones con prefijo ("Programas de Squai One: inscripción y pago", …);
- (c) un cambio de schema para admitir subsecciones. Cambiar `schema.ts` exige preguntar (`AGENTS.md`).

---

## Preguntas abiertas (decisión humana)

1. **Regla del precio**: ¿cuenta el envío del formulario, que es lo que hace hoy el sistema, o la aprobación del pago, que es lo que dice Notion? ¿Y qué pasa con un PSE aprobado después del 31 dic?
2. **USD con descuento**: ¿147 o 148? Si es 147, ¿se deja de decir "20 %" en USD o se muestra el ahorro en monto?
3. **Precio tachado y fecha de fin del descuento**: ¿se amplía `GET /api/checkout/program` para devolver el siguiente precio y su `valid_from` (contrato público), o se escriben en el contenido y se acepta editarlos a mano el 1 de enero?
4. **Fechas y horario de la cohorte**: ¿van en el contenido (HTML estático y CMS) duplicando `programs.starts_on/ends_on/schedule` de D1, o se exponen desde D1? ¿Quién mantiene que coincidan?
5. **Cupo y fechas de inscripción**: ¿se aceptan "30" y "22 de enero" escritos en el contenido y en los términos, sabiendo que la fuente de verdad es `program_limits`? (Lo mismo vale para `status.upcomingBody`, que ya repite "1 de diciembre".)
6. **Secciones que se solapan**: ¿se conservan `payback`, `challenge` y `capabilities`, o los sustituyen "Resultados" y "Para quién es" de Notion? ¿Y la FAQ "¿Cuándo son las clases…?", que contradice a Notion?
7. **"Programas de Squai One"**: ¿es un apartado dentro de `/terminos-de-servicio`, que es lo que se recomienda? ¿En qué formato: (a), (b) o (c) con cambio de schema? ¿Los datos de la cohorte (fechas, precios) van en los términos o se remite a "lo publicado en la página del programa"?
8. **§4 actual de los términos ($399.000)**: ¿se quita ya, aunque el rediseño no esté listo?
9. **JSON-LD**: ¿se corrige `courseWorkload` (4 semanas, 5 h por semana)? ¿Se permiten `startDate`/`endDate` en `CourseInstance` cuando estén confirmados, o siguen excluidos?
10. **Datos que no están en Notion**: el número o enlace de WhatsApp, la URL y el proveedor del video (afecta a la CSP), y las fotos individuales y la de clase (¿son `team1.webp` y `team2.webp`?).
11. **Verificación de afirmaciones**: "más de 200 personas", "magíster en ingeniería", "directora de operaciones en EE. UU.", "más de 8 años", Bre-B como medio activo en Bold, y el consentimiento de Manuela A., Juan Pablo V. y Claudia M. para publicar sus testimonios.
12. **Temario**: ¿cómo se reparten los 6 módulos en 8 sesiones? ¿El título "Lo que vemos en las 8 sesiones" se mantiene con 6 bloques?
13. **Rol de los fundadores**: si `squadGrid[].role` adopta las credenciales de Notion, ¿cómo se marca quién es fundador para el JSON-LD (`seo.ts:58`)?
14. **Hero**: ¿se elimina el `program.status` fijo ("Inscripciones abiertas") o se reemplaza por el estado calculado?
