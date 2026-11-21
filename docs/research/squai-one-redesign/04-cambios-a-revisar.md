# Cambios a revisar después del rediseño

Textos y datos que se editan desde el CMS y que conviene revisar cuando termine la implementación del diseño. Ninguno bloquea el rediseño. Cada implementador añade aquí lo que encuentre, con su ticket.

| Dónde | Qué revisar | Origen |
|---|---|---|
| Términos, sección 4 "Precios e inversión" | Dice "$399.000 COP (aprox. $129 USD)" y que el precio informado al abrir la inscripción se respeta. El sistema cobra el Precio vigente al enviar el formulario. Quitar la cifra y alinear la regla con la sección 12. | #74 |
| Términos, sección 12 "Programas de Squai One" | Borrador. Falta nombrar quién lo revisa. Cláusulas a revisar: Precio e IVA, fuerza mayor del participante, cesión del cupo, 80 % de asistencia, grabaciones, herramientas de IA de terceros y datos personales. Detalle en `notes/74.md`. | #74 |
| Términos, fecha `updated` | Dice "14 de septiembre de 2026". Actualizar al publicar los cambios. | #74 |
| `company.phone` en copies.json | Vale "[TELEFONO PENDIENTE]", así que el botón flotante de WhatsApp no se muestra. Falta el número corporativo real (con indicativo de país); al cargarlo, el botón aparece solo y abre `wa.me` con ese número. Revisar también el mensaje precargado en `ui.whatsapp.message`. | #73 |
| FAQ de Squai One "¿Cuándo son las clases y cuánto duran?" (`squai-one.json`, `faqs`) | Dice que las fechas y el horario llegan por correo de confirmación, pero ahora la página los publica desde la base de datos. La cifra "5 horas semanales durante 4 semanas" es coherente con 8 sesiones de 2,5 h, aunque Notion habla de 2 sesiones por semana. Reescribir al fusionar las FAQ. | #67 (lo fusiona #72) |
| `ui.checkout.investment.copy` y `program.duration/schedule/modality` (`copies.json`) | Se siguen pintando en el bloque de inscripción y en `llms.txt`. `program.schedule` dice "100% virtual..." bajo la etiqueta "Modalidad"; las etiquetas de `ui.program` están desplazadas (Duración/Modalidad/Resultado). Revisar al tocar inscripción. | #67 |
| Cupo en datos clave | El texto no lleva cifra ("cupos limitados"): Notion dice máximo 30, pero el cupo real vive en `program_limits.capacity` y el endpoint de lectura no lo devuelve. Si se quiere mostrar el número, hay que ampliar `GET /api/checkout/program` con ese campo (requiere aprobar el contrato). | #67 |
| Hero: foto | El hero usa la foto de landing-design (mujer con portátil) por decisión del dueño; Notion pide una foto de Laura y Sebastián dando una sesión. Cambiar `src/assets/one/persona-laptop.webp` y `hero.photoAlt` cuando exista. | #67 |
| Hero: precio | Notion pone el precio con descuento junto al inicio y el horario. No se incluyó: lo cubre el ticket de inversión, con datos de D1. | #67 |
