/* ---------------------------------------------------------------------------
   SEO: constantes, URL canónica y constructores de JSON-LD.

   Las copias viven en src/content/copies.json (título, descripción y los
   textos por servicio); aquí solo está la mecánica que las convierte en
   entidades schema.org.

   Regla de este archivo: solo entra información verificable en el contenido
   del sitio. Nada de precios, fechas, direcciones ni perfiles sociales que no
   estén declarados: un dato inventado en JSON-LD es una penalización de
   confianza, no una oportunidad.
--------------------------------------------------------------------------- */

import type { Faq, Service, SiteContent } from './content';

/** Dominio canónico. Debe coincidir con `site` en astro.config.mjs. */
export const SITE_URL = 'https://squai.io';

export const SITE_NAME = 'Squai';
export const SITE_LOCALE = 'es_CO';
export const SITE_LANG = 'es';
export const CONTACT_EMAIL = 'team@squai.io';

/** Imagen social por defecto (1200x630). Generada con `pnpm og`. */
export const DEFAULT_OG_IMAGE = '/og/squai-og.png';
export const DEFAULT_OG_ALT = 'Squai — Aprende IA, potencia tus habilidades';

/** @id estables para que las entidades se referencien entre sí en vez de duplicarse. */
export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;

export const absoluteUrl = (path: string) => new URL(path, SITE_URL).href;

/**
 * Normaliza `Astro.url.pathname` a la forma canónica del sitio: sin `.html`
 * (el build usa `build.format: 'file'`, así que en build el pathname llega como
 * `/servicios/squai-one.html`) y sin barra final. La raíz se queda en `/`.
 */
export const canonicalPath = (pathname: string) => {
  const clean = pathname
    .replace(/\/index\.html$/, '/')
    .replace(/\.html$/, '')
    .replace(/\/+$/, '');
  return clean || '/';
};

/** Las respuestas del FAQ son una lista de párrafos; el schema quiere texto. */
const answerText = (faq: Faq) => faq.a.join('\n\n');

/**
 * Título y descripción de la página de un servicio. Si el servicio no declara
 * los suyos en copies.json, se cae a la plantilla `seo.serviceTitle` y al
 * slogan, que es lo que hacía la página antes de tener metadatos propios.
 */
export const serviceSeo = (service: Service, template: string) => ({
  title: service.seoTitle || template.replace('{service}', service.name),
  description: service.seoDescription || service.slogan,
});

/* --- JSON-LD ---------------------------------------------------------------
   Vocabulario schema.org, sintaxis JSON-LD: es el formato que Google
   recomienda y el que mejor leen los buscadores con IA.
   https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
--------------------------------------------------------------------------- */

type Json = Record<string, unknown>;

/**
 * La organización. Solo campos comprobables: nombre, sitio, logo, correo del
 * footer, idioma y las personas que el sitio declara como cofundadoras.
 * `sameAs` sale de `socials`: hoy los href están vacíos, así que no se emite.
 */
export const organizationSchema = (content: SiteContent): Json => {
  const sameAs = content.socials.map((social) => social.href).filter(Boolean);
  const founders = content.instructors.filter((person) => /fundador/i.test(person.role));

  return {
    '@type': ['Organization', 'EducationalOrganization'],
    '@id': ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    email: CONTACT_EMAIL,
    description: content.seo.description,
    slogan: content.tagline,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/og/squai-logo.png'),
      width: 1200,
      height: 400,
    },
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    knowsLanguage: ['es'],
    areaServed: { '@type': 'Place', name: 'Latinoamérica' },
    ...(sameAs.length ? { sameAs } : {}),
    founder: founders.map((person) => ({
      '@type': 'Person',
      name: person.name,
      jobTitle: person.role,
      sameAs: [person.linkedin],
    })),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: CONTACT_EMAIL,
      availableLanguage: ['Spanish'],
    },
  };
};

/** El sitio como entidad, para que las URLs cuelguen de algo con nombre. */
export const websiteSchema = (): Json => ({
  '@type': 'WebSite',
  '@id': SITE_ID,
  url: SITE_URL,
  name: SITE_NAME,
  inLanguage: SITE_LANG,
  publisher: { '@id': ORG_ID },
});

/**
 * FAQPage con las preguntas que ya están en el HTML. Google restringió el rich
 * result de FAQ a sitios de gobierno y salud (agosto 2023), pero el marcado
 * sigue siendo válido y es la forma más directa de que un motor con IA extraiga
 * pares pregunta/respuesta de la página.
 * https://developers.google.com/search/blog/2023/08/howto-faq-changes
 */
export const faqSchema = (items: Faq[], pageUrl: string): Json => ({
  '@type': 'FAQPage',
  '@id': `${pageUrl}#faq`,
  inLanguage: SITE_LANG,
  mainEntity: items.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: answerText(item) },
  })),
});

export const breadcrumbSchema = (crumbs: { name: string; path: string }[]): Json => ({
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    item: absoluteUrl(crumb.path),
  })),
});

export const webPageSchema = (page: { url: string; title: string; description: string }): Json => ({
  '@type': 'WebPage',
  '@id': `${page.url}#webpage`,
  url: page.url,
  name: page.title,
  description: page.description,
  inLanguage: SITE_LANG,
  isPartOf: { '@id': SITE_ID },
  about: { '@id': ORG_ID },
});

/**
 * El curso de Squai One. `timeRequired` sale de `cohort.duration`
 * ("5 semanas · 20 horas") y `courseWorkload` de repartir esas 20 horas entre
 * las 5 semanas. El certificado está declarado en el FAQ y en la cohorte.
 * Sin `offers` ni `startDate`: el contenido no declara precio ni fecha.
 * https://developers.google.com/search/docs/appearance/structured-data/course
 */
export const courseSchema = (content: SiteContent, service: Service, pageUrl: string): Json => ({
  '@type': 'Course',
  '@id': `${pageUrl}#course`,
  name: content.cohort.name,
  description: service.cardCopy,
  url: pageUrl,
  inLanguage: SITE_LANG,
  timeRequired: 'PT20H',
  educationalLevel: 'Principiante',
  educationalCredentialAwarded: 'Certificado digital de finalización',
  provider: { '@id': ORG_ID },
  hasCourseInstance: {
    '@type': 'CourseInstance',
    courseMode: 'Online',
    courseWorkload: 'PT4H',
    inLanguage: SITE_LANG,
  },
});

/** Squai Grow y Squai Learn son servicios, no cursos con cohorte. */
export const serviceSchema = (service: Service, pageUrl: string): Json => ({
  '@type': 'Service',
  '@id': `${pageUrl}#service`,
  name: service.name,
  serviceType: service.slug === 'squai-learn'
    ? 'Formación en IA para instituciones educativas'
    : 'Formación y adopción de IA en organizaciones',
  description: service.cardCopy,
  url: pageUrl,
  provider: { '@id': ORG_ID },
  areaServed: { '@type': 'Place', name: 'Latinoamérica' },
  availableLanguage: ['Spanish'],
  /* `menuAudience` es la etiqueta corta ("Personas", "Empresas"); `audience`
     es la frase larga de la tarjeta, que no funciona como tipo de audiencia. */
  audience: { '@type': 'Audience', audienceType: service.menuAudience },
});

/** Los tres servicios enlazados desde la home, en orden. */
export const servicesItemList = (services: Service[]): Json => ({
  '@type': 'ItemList',
  name: 'Servicios de Squai',
  itemListElement: services.map((service, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: `${service.name} — ${service.menuAudience}`,
    url: absoluteUrl(`/servicios/${service.slug}`),
  })),
});

/** Grafo de la home: organización, sitio, página, servicios y FAQ. */
export const homeGraph = (content: SiteContent): Json[] => [
  organizationSchema(content),
  websiteSchema(),
  webPageSchema({ url: `${SITE_URL}/`, title: content.seo.title, description: content.seo.description }),
  servicesItemList(content.services),
  faqSchema(content.faqs, `${SITE_URL}/`),
];
