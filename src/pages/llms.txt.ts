/* ---------------------------------------------------------------------------
   /llms.txt — resumen del sitio en Markdown plano para modelos de lenguaje.

   Propuesta de llmstxt.org: un archivo en la raíz, en Markdown, con un H1, un
   blockquote de resumen y listas de enlaces con una nota por enlace. No lo
   consume Google; lo consumen agentes y asistentes que entran a la web y
   tienen que decidir qué páginas leer sin gastar contexto en el HTML entero.
   https://llmstxt.org/

   Se genera desde src/content/copies.json, así que no se desincroniza de la
   página: si cambian las copias, cambia este archivo en el siguiente build.
--------------------------------------------------------------------------- */

import type { APIRoute } from 'astro';

import { checkout } from '../config/checkout';
import { legalPaths } from '../config/legal';
import { getSiteContent } from '../lib/content';
import { CONTACT_EMAIL, SITE_URL } from '../lib/seo';

export const GET: APIRoute = async () => {
  const { program, faqs, legal, seo, services } = await getSiteContent();

  const serviceLines = services
    .map(
      (service) =>
        `- [${service.name} — ${service.audience}](${SITE_URL}/servicios/${service.slug}): ${service.slogan} ${service.cardCopy}`
    )
    .join('\n');

  const faqLines = faqs.map((faq) => `- **${faq.q}** ${faq.a.join(' ')}`).join('\n');

  const body = `# Squai

> ${seo.description}

Squai trabaja en español.

## Qué ayuda a lograr Squai

- Aprender inteligencia artificial con práctica y sin tecnicismos.
- Capacitar equipos para integrar IA en tareas y procesos reales.
- Adoptar la inteligencia artificial con criterios de seguridad, ética y revisión humana.
- Integrar inteligencia artificial en instituciones educativas para usar IA.
- Formar docentes, estudiantes e instituciones educativas para usar IA.

## Servicios

${serviceLines}

## Programa actual

**${program.name}** (${program.ecosystem}). Si las inscripciones están abiertas, el precio y el pago están en [la página del programa](${SITE_URL}/servicios/${checkout.program}#inscripcion).

- ${program.duration}
- ${program.schedule}
- ${program.modality}

## Páginas

- [Inicio](${SITE_URL}/): qué hace Squai, servicios, equipo y preguntas frecuentes.
- [${legal.terms.title.split('|')[0].trim()}](${SITE_URL}${legalPaths.terms})
- [${legal.privacy.title.split('|')[0].trim()}](${SITE_URL}${legalPaths.privacy})

## Preguntas frecuentes

${faqLines}

## Contacto

- Correo: ${CONTACT_EMAIL}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
