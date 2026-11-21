# Cambios a revisar después del rediseño

Textos y datos que se editan desde el CMS y que conviene revisar cuando termine la implementación del diseño. Ninguno bloquea el rediseño. Cada implementador añade aquí lo que encuentre, con su ticket.

| Dónde | Qué revisar | Origen |
|---|---|---|
| Términos, sección 4 "Precios e inversión" | Dice "$399.000 COP (aprox. $129 USD)" y que el precio informado al abrir la inscripción se respeta. El sistema cobra el Precio vigente al enviar el formulario. Quitar la cifra y alinear la regla con la sección 12. | #74 |
| Términos, sección 12 "Programas de Squai One" | Borrador. Falta nombrar quién lo revisa. Cláusulas a revisar: Precio e IVA, fuerza mayor del participante, cesión del cupo, 80 % de asistencia, grabaciones, herramientas de IA de terceros y datos personales. Detalle en `notes/74.md`. | #74 |
| Términos, fecha `updated` | Dice "14 de septiembre de 2026". Actualizar al publicar los cambios. | #74 |
| Testimonios de Squai One (`testimonials` en squai-one.json) | Faltan: la sección está construida pero sin contenido, porque el texto de las citas de Manuela A. (capacitación), Juan Pablo V. (consultoría con Laura) y Claudia M. (consultoría con Sebastián) solo está en Notion y no había acceso. Cargarlas en Pages CMS (Squai One → Testimonios); la sección aparece sola. | #69 |
| Fotos del equipo en Squai One | Notion pide fotos individuales (se usan `team1.webp` y `team2.webp`) y una foto de la clase, que no existe en el repo y no se usó. Pendiente aportarla. | #69 |
| Bios de Laura y Sebastián (`squadGrid` en copies.json) | Credenciales tomadas de la nota 02 (magíster en ingeniería, 5 años de docente, directora de operaciones en empresa de tecnología de EE. UU.; más de 8 años en tecnología, líder de equipos), no del texto literal de Notion. Las cifras cambian con el tiempo. | #69 |
