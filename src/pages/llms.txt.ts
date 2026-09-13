/* ---------------------------------------------------------------------------
   /llms.txt — resumen del sitio en Markdown plano para modelos de lenguaje.

   Propuesta de llmstxt.org: un archivo en la raíz, en Markdown, con un H1, un
   blockquote de resumen y listas de enlaces con una nota por enlace. No lo
   consume Google; lo consumen agentes y asistentes que entran a la web y
   tienen que decidir qué páginas leer sin gastar contexto en el HTML entero.
   https://llmstxt.org/

   Se genera desde src/data/landing.ts, así que no se desincroniza de la página.
--------------------------------------------------------------------------- */

import type { APIRoute } from 'astro';

import { cohort, faqs, services } from '../data/landing';
import { CONTACT_EMAIL, SITE_URL } from '../data/seo';

export const GET: APIRoute = () => {
  const serviceLines = services
    .map((service) => `- [${service.name} — ${service.audience}](${SITE_URL}/servicios/${service.slug}): ${service.slogan} ${service.cardCopy}`)
    .join('\n');

  const faqLines = faqs.map((faq) => `- **${faq.q}** ${faq.a}`).join('\n');

  const body = `# Squai

> Squai enseña inteligencia artificial a personas, equipos y comunidades educativas que no vienen del mundo técnico. Formación en vivo, en español, que empieza por entender cómo funciona un modelo y sigue con casos reales de quien aprende.

Squai trabaja en español con Latinoamérica. Las sesiones en vivo se coordinan en hora Colombia. Las cohortes abiertas son 100% virtuales y con grabaciones; con equipos e instituciones el trabajo puede ser virtual o presencial.

## Servicios

${serviceLines}

## Programa con lista de espera

- **${cohort.name}** (${cohort.ecosystem}): ${cohort.duration}. ${cohort.schedule}. ${cohort.modality}. Estado: ${cohort.status.toLowerCase()} — ${cohort.seats.toLowerCase()}.

## Páginas

- [Inicio](${SITE_URL}/): qué hace Squai, servicios, equipo y preguntas frecuentes.
- [Términos de Servicio](${SITE_URL}/terminos-de-servicio)
- [Política de Privacidad](${SITE_URL}/politica-de-privacidad)

## Preguntas frecuentes

${faqLines}

## Contacto

- Correo: ${CONTACT_EMAIL}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
