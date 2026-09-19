# Pages CMS

Interfaz editorial para que una sola persona actualice los textos del sitio sin
editar archivos. [Pages CMS](https://pagescms.org/docs/) es gratuito, de código
abierto y edita directamente los archivos versionados en GitHub: no añade base
de datos de contenido ni API que el sitio tenga que consultar.

## Decisión de arquitectura

Se usa la versión alojada. El flujo es:

1. El editor entra a Pages CMS con su cuenta de GitHub.
2. Pages CMS lee `.pages.yml` y muestra las áreas editoriales como formularios.
3. Al guardar, escribe un commit en `src/content/copies.json`.
4. Cloudflare construye una versión nueva del Worker a partir de ese commit.
5. La versión se revisa y solo entonces se promueve a producción.

El tráfico público no pasa por el CMS en ningún momento:

| Recorrido | Quién responde |
| :-------- | :------------- |
| Visitas | Los archivos estáticos que genera Astro, servidos por el Worker |
| Formularios | `POST /api/*` en el mismo Worker, que valida y escribe en D1 |

Pages CMS solo habla con GitHub. Si el CMS se cae, el sitio publicado y los
formularios siguen funcionando igual.

## Qué hay en el repositorio

| Archivo | Papel |
| :------ | :---- |
| `src/content/copies.json` | Todo el contenido, bajo la clave `site` |
| `src/content/schema.ts` | El contrato: se valida en cada build y decide qué llega a producción |
| `.pages.yml` | El modelo editorial: traduce el contrato a formularios |

`.pages.yml` define seis áreas, todas sobre el mismo archivo:

| Área | Claves de `site` que administra |
| :--- | :------------------------------ |
| Inicio | `tagline`, `heroLines`, `heroVerbs`, `heroSubtitle`, `program`, `statement`, `whatWeDo`, `capabilities`, `impact`, `labels` |
| Servicios | `services` |
| Equipo e historia | `originStory`, `squadGrid`, `socials` |
| Preguntas frecuentes | `faqs` |
| SEO y textos legales | `seo`, `legal` |
| Interfaz y formularios | `ui` |

`navLinks` y `footerCols` quedan fuera: son estructura (destinos de scroll,
claves de etiqueta y la exclusividad `t` / `labelKey`) y no aportan texto que no
se pueda editar desde `labels` o `ui`. `settings.content.merge: true` hace que
cada guardado mezcle lo editado con el archivo que ya está en GitHub, así que
esas claves no declaradas se conservan intactas.

### Cómo se protege el contenido estructural

- **No hay medios.** `.pages.yml` no declara `media`, así que no se pueden subir
  imágenes. Las fotos del equipo se resuelven por una relación fija entre la
  ruta editorial y el recurso compilado (`src/components/Team.astro`), de modo
  que `img` es una lista cerrada con las seis rutas que ese mapa conoce.
- **Las rutas no se editan.** `slug` y los destinos de scroll (`cta.target`) son
  `readonly`: el editor los ve y no los cambia. Editar el texto de un servicio
  nunca mueve `/servicios/<slug>`.
- **Las opciones cerradas son selección.** Tono visual, formulario que abre un
  botón y foto del equipo son desplegables. El contrato cierra los mismos
  conjuntos: un tono fuera de la paleta o un `span` con una clase arbitraria
  rompen el build, porque ambos valores se interpolan como clases CSS.
- **Los formatos se validan en el formulario.** Colores en hexadecimal completo,
  enlaces limitados a ruta interna, `https://`, `mailto:` o ancla, la plantilla
  de SEO obligada a contener `{service}` y el texto alternativo de las fotos
  obligado a contener `{name}` y `{role}`.
- **Los textos largos siguen siendo listas de párrafos.** No hay formato
  enriquecido: el frontend no tiene política de sanitizado para HTML.

### Guardar no reordena el archivo

Pages CMS reescribe el JSON completo con dos espacios de sangría, en el orden en
que `.pages.yml` declara los campos, y descarta los valores vacíos. El
contenido y la configuración ya están alineados con eso, y el contrato acepta
como "sin valor" la ausencia de `tone`, `cta.modal`, `cta.target`,
`socials[].href` y el `target` de los enlaces del footer. Consecuencia práctica:
un guardado sin cambios deja `copies.json` byte a byte igual, y un guardado con
un cambio produce un diff que solo contiene ese cambio.

Si el contrato cambia, hay que cambiar `.pages.yml` en el mismo commit: el orden
de los campos dentro de una lista es el orden de las claves en el archivo.

## Fase 1 — entorno operativo

Antes de tocar nada hay que dejar registrado en
[`pages-cms-evidencias.md`](pages-cms-evidencias.md) quién administra qué: la
cuenta editorial, quién puede instalar GitHub Apps en `squai-org`, la rama que
representa producción, a qué rama escucha Cloudflare Builds, la versión activa
del Worker y quién tiene autoridad para revertir un despliegue.

La fase se acepta solo si se puede demostrar que la cuenta editorial accede al
repositorio, que un administrador puede instalar una GitHub App **solo** en
`landing`, que la rama de producción coincide con la configurada en Cloudflare,
que el despliegue activo se puede asociar a una revisión concreta de Git y que
hay acceso al historial de versiones desde el que iniciar una recuperación.

## Fase 4 — acceso y seguridad

1. Entrar a Pages CMS con la cuenta de GitHub definida como editor.
2. Instalar la [GitHub App de Pages CMS](https://pagescms.org/docs/guides/installing/github-app/)
   con alcance **solo** `squai-org/landing`, nunca "All repositories"
   ([cómo limitar la instalación](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party)).
3. Registrar los permisos concedidos antes de aprobar la instalación.
4. Comprobar que no hay otros usuarios editoriales ni invitaciones pendientes.
5. Activar 2FA en la cuenta editorial y guardar los códigos de recuperación
   fuera del dispositivo principal.

Procedimientos que tienen que quedar escritos y probados:

| Necesidad | Dónde se resuelve |
| :-------- | :---------------- |
| Revocar el acceso del editor | GitHub → Settings → Applications → Authorized GitHub Apps |
| Retirar la app del repositorio | `squai-org` → Settings → GitHub Apps → Configure → Uninstall |
| Cambiar la cuenta editorial | Retirar la instalación y repetir esta fase con la cuenta nueva |
| Revisar autoría | Historial de `src/content/copies.json` en GitHub |
| Recuperar acceso | Códigos de recuperación de GitHub de la cuenta editorial |

## Fase 5 — publicación controlada

Tres estados distintos, y ninguno implica el siguiente:

1. **Guardado**: el cambio existe como commit en GitHub.
2. **Candidata**: hay una versión construida, con dirección propia de revisión.
3. **Producción**: esa versión atiende el tráfico real.

```
pnpm version:upload    # construye y sube una versión candidata (no recibe tráfico)
pnpm version:promote   # promueve la versión elegida al 100% del tráfico
```

`version:upload` usa [`wrangler versions upload`](https://developers.cloudflare.com/workers/versions-and-deployments/):
deja la versión disponible en su propia URL de vista previa sin tocar la activa.
`version:promote` es la acción consciente que reemplaza producción. Para que un
guardado en el CMS genere una candidata en lugar de un despliegue directo, la
rama editorial tiene que estar configurada en
[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) como
rama de vista previa, no como rama de producción.

Un cambio que además necesite una migración de D1 no va por aquí: va por
`pnpm deploy`, que aplica las migraciones antes de desplegar. Un cambio de texto
no toca D1 (`wrangler d1 migrations apply` no hace nada si no hay migraciones
pendientes), así que publicar contenido nunca depende del estado de la base.

Si la construcción falla, no hay candidata y la versión activa sigue intacta. El
build es la única puerta y valida el contrato completo: un campo obligatorio
vacío, un slug duplicado, un enlace con `javascript:` o un tono inventado
detienen la construcción.

Controles obligatorios antes de promover:

- [ ] La construcción terminó correctamente.
- [ ] La validación del contrato editorial pasó.
- [ ] Las páginas afectadas se ven bien en la candidata.
- [ ] Los enlaces y la navegación que se tocaron funcionan.
- [ ] Los formularios siguen enviando y respondiendo en la candidata.

## Fase 7 — corte a producción

1. Suspender las ediciones manuales de `copies.json` durante el corte.
2. Comparar el contenido que administra el CMS con la versión activa.
3. Publicar desde el CMS un cambio pequeño, visible y reversible.
4. Revisar la candidata y promoverla.
5. Registrar en [`pages-cms-evidencias.md`](pages-cms-evidencias.md) la revisión
   de Git, la versión de Cloudflare y quién aprobó.

Después: comprobar el cambio en el dominio productivo, recorrer inicio,
servicios y páginas legales desde la navegación real, enviar un contacto y una
inscripción de prueba y confirmar que quedaron en D1, y devolver el contenido a
su estado anterior con otro cambio editorial controlado.

## Fase 8 — operación

Por publicación:

1. Editar en Pages CMS.
2. Revisar el resumen de cambios antes de guardar.
3. Esperar la versión candidata.
4. Revisar las páginas y funciones afectadas.
5. Promover, o corregir sin tocar producción.

Control periódico:

- Revisar accesos y la instalación de la GitHub App.
- Revisar el consumo de Workers, Workers Builds y D1 en el panel.
- Confirmar que el último despliegue se puede relacionar con un commit.
- Ejecutar una reversión controlada sobre contenido no crítico.
- Actualizar `.pages.yml` con cualquier cambio del contrato editorial.

Reglas permanentes:

- Ningún campo nuevo se publica sin pasar antes por el inventario editorial.
- Ningún cambio de `src/content/schema.ts` se considera terminado sin actualizar
  `.pages.yml`.
- Ningún secreto vive en contenido administrado por el CMS.
- No se habilita carga de medios hasta resolver el tratamiento de imágenes.
- No se promueve una versión con comprobaciones afectadas sin completar.

## Recuperación

**Error detectado antes de promover.** No promover. Corregir desde Pages CMS,
esperar la construcción nueva y repetir solo las comprobaciones afectadas.

**Error detectado después de promover.** Restaurar la versión estable anterior
con [rollback de Cloudflare](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/),
confirmar la recuperación en el dominio productivo, revertir o corregir el
commit editorial, generar una candidata nueva y promover solo tras verificar la
causa.

**Pérdida temporal de Pages CMS.** El sitio publicado no se toca. Comprobar que
producción y formularios siguen disponibles y usar el historial de Git como
fuente de contenido. No se sustituye el CMS durante el incidente salvo
necesidad operativa confirmada.

## Criterios de aceptación

1. El editor puede modificar todas las áreas aprobadas sin editar archivos.
2. Un cambio inválido no puede llegar a producción.
3. Las propiedades no editables se conservan después de guardar.
4. Publicar exige revisar una versión candidata.
5. Sitio, formularios y leads funcionan sin depender de Pages CMS.

La evidencia de cada punto se registra en
[`pages-cms-evidencias.md`](pages-cms-evidencias.md).

## Límites del esquema gratuito

Pages CMS no recibe tráfico público, así que el volumen de visitas no consume
recursos del CMS. Los límites que importan son los de Cloudflare y hay que
mirarlos en el panel real antes del corte:

| Recurso | Qué limita |
| :------ | :--------- |
| [Activos estáticos](https://developers.cloudflare.com/workers/platform/pricing/) | Gratuitos e ilimitados |
| [Workers Free](https://developers.cloudflare.com/workers/platform/pricing/) | Límite diario de solicitudes dinámicas (`/api/*`) |
| [Workers Builds Free](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/) | Límite mensual de minutos de construcción |
| [D1 Free](https://developers.cloudflare.com/d1/platform/pricing/) | Límites diarios de lectura y escritura, y almacenamiento |

La capacidad de captación de leads no se estima desde estos números: cada envío
ejecuta varias operaciones. Se mide con las métricas reales del Worker y de D1.

## Fuentes

- [Documentación de Pages CMS](https://pagescms.org/docs/) — [contenido](https://pagescms.org/docs/configuration/content/), [campos](https://pagescms.org/docs/configuration/content/fields/), [listas](https://pagescms.org/docs/configuration/content/list/), [ajustes](https://pagescms.org/docs/configuration/settings/), [operaciones](https://pagescms.org/docs/configuration/content/operations/)
- [GitHub App de Pages CMS](https://pagescms.org/docs/guides/installing/github-app/) y [alcance de instalación](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party)
- [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) y sus [límites](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/)
- [Versiones y despliegues](https://developers.cloudflare.com/workers/versions-and-deployments/) y [rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
- [Precios y límites de Workers](https://developers.cloudflare.com/workers/platform/pricing/) y [de D1](https://developers.cloudflare.com/d1/platform/pricing/)
