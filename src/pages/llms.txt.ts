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

import { getSiteContent } from '../lib/content';
import { CONTACT_EMAIL, SITE_URL } from '../lib/seo';

export const GET: APIRoute = async () => {
  const { cohort, faqs, legal, seo, services } = await getSiteContent();

  const serviceLines = services
    .map(
      (service) =>
        `- [${service.name} — ${service.audience}](${SITE_URL}/servicios/${service.slug}): ${service.slogan} ${service.cardCopy}`
    )
    .join('\n');

  const faqLines = faqs.map((faq) => `- **${faq.q}** ${faq.a.join(' ')}`).join('\n');

  const body = `# Squai

> ${seo.description}

Squai trabaja en español con toda Latinoamérica.

## Servicios

${serviceLines}

## Programa con lista de espera

**${cohort.name}** (${cohort.ecosystem}) — ${cohort.status}.

- ${cohort.duration}
- ${cohort.schedule}
- ${cohort.modality}

## Páginas

- [Inicio](${SITE_URL}/): qué hace Squai, servicios, equipo y preguntas frecuentes.
- [${legal.terms.title.split('|')[0].trim()}](${SITE_URL}/terminos-de-servicio)
- [${legal.privacy.title.split('|')[0].trim()}](${SITE_URL}/politica-de-privacidad)

## Preguntas frecuentes

${faqLines}

## Contacto

- Correo: ${CONTACT_EMAIL}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
