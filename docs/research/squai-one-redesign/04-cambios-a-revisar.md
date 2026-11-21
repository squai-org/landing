# Cambios a revisar después del rediseño

Textos y datos que se editan desde el CMS y que conviene revisar cuando termine la implementación del diseño. Ninguno bloquea el rediseño. Cada implementador añade aquí lo que encuentre, con su ticket.

| Dónde | Qué revisar | Origen |
|---|---|---|
| Términos, sección 4 "Precios e inversión" | Dice "$399.000 COP (aprox. $129 USD)" y que el precio informado al abrir la inscripción se respeta. El sistema cobra el Precio vigente al enviar el formulario. Quitar la cifra y alinear la regla con la sección 12. | #74 |
| Términos, sección 12 "Programas de Squai One" | Borrador. Falta nombrar quién lo revisa. Cláusulas a revisar: Precio e IVA, fuerza mayor del participante, cesión del cupo, 80 % de asistencia, grabaciones, herramientas de IA de terceros y datos personales. Detalle en `notes/74.md`. | #74 |
| Términos, fecha `updated` | Dice "14 de septiembre de 2026". Actualizar al publicar los cambios. | #74 |
| Servicio Squai One, `syllabus` (temario) | Notion no se pudo leer en esta tarea: los temas y las sesiones de cada módulo se redactaron a partir de la nota 02 y de las intenciones de Resultados. Validar subtemas y el reparto de los 6 módulos en 8 sesiones con el dueño (reparto en `notes/68.md`). | #68 |
| Servicio Squai One, FAQ "¿Cuándo son las clases y cuánto duran?" | Dice "5 horas semanales durante 4 semanas" y que las fechas llegan por correo; Notion dice 2 sesiones de 2 h 30 por semana. Lo corrige #72. | #68 |
| `company.phone` en copies.json | Vale "[TELEFONO PENDIENTE]", así que el botón flotante de WhatsApp no se muestra. Falta el número corporativo real (con indicativo de país); al cargarlo, el botón aparece solo y abre `wa.me` con ese número. Revisar también el mensaje precargado en `ui.whatsapp.message`. | #73 |
