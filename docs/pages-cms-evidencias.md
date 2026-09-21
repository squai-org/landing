# Pages CMS — registro y evidencias

Plantilla para rellenar durante la migración. Sin estos registros no se
consideran superadas las fases correspondientes de
[`pages-cms.md`](pages-cms.md). Se actualiza en el repositorio, en el mismo
commit que el cambio al que se refiere.

## 1. Entorno operativo (fase 1)

| Dato | Valor |
| :--- | :---- |
| Cuenta GitHub del editor | _pendiente_ |
| Administradores de `squai-org` que pueden instalar GitHub Apps | _pendiente_ |
| Plan de GitHub de la organización | _pendiente_ |
| Rama que representa producción | _pendiente_ |
| Política vigente para aceptar cambios en esa rama | _pendiente_ |
| Rama a la que escucha Cloudflare Builds | _pendiente_ |
| Plan de Cloudflare de la cuenta | _pendiente_ |
| Versión activa del Worker | _pendiente_ |
| Commit de la versión activa | _pendiente_ |
| Último despliegue exitoso (fecha) | _pendiente_ |
| Responsable autorizado para revertir un despliegue | _pendiente_ |

Consumo observado antes del corte:

| Recurso | Consumo | Fecha de la lectura |
| :------ | :------ | :------------------ |
| Workers (solicitudes dinámicas) | _pendiente_ | _pendiente_ |
| Workers Builds (minutos) | _pendiente_ | _pendiente_ |
| D1 (lecturas, escrituras, almacenamiento) | _pendiente_ | _pendiente_ |

Aceptación de la fase:

- [ ] La cuenta editorial accede al repositorio.
- [ ] Un administrador puede instalar una GitHub App solo en `landing`.
- [ ] La rama de producción coincide con la configurada en Cloudflare.
- [ ] El despliegue activo se puede asociar a un commit concreto.
- [ ] Hay acceso al historial de versiones para iniciar una recuperación.

## 2. Acceso y seguridad (fase 4)

| Dato | Valor |
| :--- | :---- |
| Fecha de instalación de la GitHub App | _pendiente_ |
| Alcance de la instalación | _pendiente_ (tiene que ser solo `squai-org/landing`) |
| Permisos concedidos | _pendiente_ |
| 2FA activo en la cuenta editorial | _pendiente_ |
| Dónde se guardan los códigos de recuperación | _pendiente_ (fuera del dispositivo principal) |
| Otros usuarios editoriales o invitaciones pendientes | _pendiente_ (tiene que ser ninguno) |

Aceptación de la fase:

- [ ] Inicio de sesión correcto con la cuenta autorizada.
- [ ] Pages CMS muestra `landing` y ningún otro repositorio.
- [ ] El repositorio se abre desde Pages CMS con acceso de lectura.
- [ ] Un cambio de prueba fuera de producción aparece en el historial de Git con la autoría esperada.
- [ ] Al cerrar sesión, el contenido no se puede editar.

## 3. Publicación controlada (fase 5)

- [ ] Un cambio válido crea versión candidata sin afectar a producción.
- [ ] Un cambio inválido no produce versión promovible.
- [ ] La candidata contiene el cambio mientras producción conserva la versión anterior.
- [ ] Al promover, la versión activa coincide con la revisión aprobada.
- [ ] La reversión a la versión anterior restaura el contenido previo.

| Prueba | Versión candidata | Commit | Resultado |
| :----- | :---------------- | :----- | :-------- |
| Cambio válido | _pendiente_ | _pendiente_ | _pendiente_ |
| Cambio inválido | _pendiente_ | _pendiente_ | _pendiente_ |
| Reversión | _pendiente_ | _pendiente_ | _pendiente_ |

## 4. Validación por área (fase 6)

Cada escenario se ejecuta sobre la versión candidata y se restaura antes de
pasar al grupo siguiente. Para cada uno se anota el cambio hecho, la candidata
revisada, el resultado observado y la restauración.

### Inicio y contenido institucional

- [ ] Cambiar el titular principal y comprobar que aparece exacto.
- [ ] Modificar un texto de varios párrafos y verificar la separación.
- [ ] Reordenar un elemento repetible y comprobar el orden nuevo.
- [ ] Restaurar y confirmar que no quedan cambios residuales.

### Servicios

- [ ] Cambiar nombre visible, descripción y llamada a la acción de un servicio.
- [ ] Confirmar que `/servicios/<slug>` no cambia al editar texto visible.
- [ ] Modificar una capacidad y verificar que las otras quedan intactas.
- [ ] Intentar un slug duplicado en contenido de prueba y confirmar el rechazo antes de producción.

### Equipo y preguntas frecuentes

- [ ] Cambiar nombre, cargo y descripción de una persona sin alterar su foto.
- [ ] Añadir una pregunta de prueba y verificar que aparece una sola vez.
- [ ] Cambiar el orden de las preguntas y comprobar el mismo orden en la página.
- [ ] Eliminar la pregunta de prueba y confirmar la cantidad original.

### SEO y legales

- [ ] Cambiar título y descripción SEO en contenido de prueba.
- [ ] Confirmar los metadatos resultantes en la candidata.
- [ ] Modificar una sección legal y verificar que el resto se conserva.
- [ ] Confirmar que la fecha visible de actualización corresponde al contenido guardado.

### Formularios y captación de leads

- [ ] Los textos editables de los formularios aparecen correctamente.
- [ ] Envío válido del formulario de contacto.
- [ ] Envío válido del formulario de lista de espera.
- [ ] Respuesta de éxito visible y ambos registros presentes en D1.
- [ ] Caso inválido: mensaje de error y ningún lead creado.

| Área | Cambio | Candidata | Resultado | Restaurado |
| :--- | :----- | :-------- | :-------- | :--------- |
| Inicio | _pendiente_ | _pendiente_ | _pendiente_ | _pendiente_ |
| Servicios | _pendiente_ | _pendiente_ | _pendiente_ | _pendiente_ |
| Equipo y FAQ | _pendiente_ | _pendiente_ | _pendiente_ | _pendiente_ |
| SEO y legales | _pendiente_ | _pendiente_ | _pendiente_ | _pendiente_ |
| Formularios | _pendiente_ | _pendiente_ | _pendiente_ | _pendiente_ |

## 5. Corte a producción (fase 7)

| Dato | Valor |
| :--- | :---- |
| Cambio publicado | _pendiente_ |
| Commit | _pendiente_ |
| Versión de Cloudflare promovida | _pendiente_ |
| Quién aprobó | _pendiente_ |
| Fecha y hora | _pendiente_ |
| Restauración del cambio de prueba | _pendiente_ |

## 6. Evidencias de aceptación

| Evidencia | Referencia |
| :-------- | :--------- |
| Primera publicación productiva | _pendiente_ |
| Primer cambio rechazado por validación | _pendiente_ |
| Primera recuperación de versión | _pendiente_ |
| Prueba de contacto y de lista de espera | _pendiente_ |
| Revisión de permisos de la GitHub App | _pendiente_ |

## 7. Comprobaciones ya hechas en el repositorio

Verificado antes de habilitar el CMS, con el código de Pages CMS y el contrato
de este repositorio:

| Comprobación | Resultado |
| :----------- | :-------- |
| `.pages.yml` válido contra el esquema de configuración de Pages CMS | correcto |
| Un guardado sin cambios en cada uno de los 44 nodos | archivo byte a byte igual |
| Toda propiedad del contenido está declarada o excluida a propósito | sin huecos |
| Valores inválidos representativos (tono inventado, color sin `#`, foto fuera del mapa, plantilla SEO sin `{service}`, enlace con `javascript:`, lista obligatoria vacía, slug duplicado) | rechazados por el formulario y por el build |
| HTML generado antes y después de la migración del contrato | idéntico |
