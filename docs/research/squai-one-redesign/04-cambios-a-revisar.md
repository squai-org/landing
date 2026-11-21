# Cambios a revisar después del rediseño

Textos y datos que se editan desde el CMS y que conviene revisar cuando termine la implementación del diseño. Ninguno bloquea el rediseño. Cada implementador añade aquí lo que encuentre, con su ticket.

| Dónde | Qué revisar | Origen |
|---|---|---|
| Términos, sección 4 "Precios e inversión" | Dice "$399.000 COP (aprox. $129 USD)" y que el precio informado al abrir la inscripción se respeta. El sistema cobra el Precio vigente al enviar el formulario. Quitar la cifra y alinear la regla con la sección 12. | #74 |
| Términos, sección 12 "Programas de Squai One" | Borrador. Falta nombrar quién lo revisa. Cláusulas a revisar: Precio e IVA, fuerza mayor del participante, cesión del cupo, 80 % de asistencia, grabaciones, herramientas de IA de terceros y datos personales. Detalle en `notes/74.md`. | #74 |
| Términos, fecha `updated` | Dice "14 de septiembre de 2026". Actualizar al publicar los cambios. | #74 |
| Sección Inversión (`ui.checkout.paymentMethods`) | Lista Tarjeta de crédito, Tarjeta débito, PSE, Nequi y Botón Bancolombia (los medios que ya nombra el correo de confirmación). Bre-B no está: confirmar en Bold si está activo y, solo entonces, añadirlo en el CMS. | #71 |
| Inversión (Squai One → Inversión en el CMS) | Precio de referencia, porcentaje de descuento y fecha límite quedaron vacíos: no hay cifra confirmada. Al llenarlos, el porcentaje debe coincidir con la diferencia real entre el Precio de referencia y el Precio vigente de D1 (el porcentaje se muestra tal cual se escribe). | #71 |
| `ui.checkout.formSubtitle` | Dice "Inscripciones abiertas" fijo, pero el estado real viene de D1: con inscripciones próximas o cerradas se ve junto al aviso que lo contradice. Reescribir sin afirmar el estado. | #71 |
| `ui.program.duration/schedule/modality` | La sección de inscripción ya no pinta las tres tarjetas de duración, modalidad y resultado (las cubre la sección de datos clave). Además las etiquetas están cruzadas ("Modalidad" muestra el horario, "Resultado" la modalidad). Revisar si siguen haciendo falta. | #71 |
| Precios en D1 | En la rama base, la migración 0007 siembra COP 440.000 / USD 147 vigentes y COP 550.000 / USD 185 desde 2027-01-01. `develop` aún no trae el merge de precios del dueño: contrastar con los datos de producción antes de fijar el Precio de referencia. | #71 |
