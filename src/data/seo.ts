/* ---------------------------------------------------------------------------
   SEO: constantes, metadatos por página y constructores de JSON-LD.

   Regla de este archivo: aquí solo entra información verificable dentro del
   repositorio (src/data/landing.ts, las páginas legales y el footer). Nada de
   precios, fechas, direcciones, número de alumnos o perfiles sociales que no
   estén confirmados: un dato inventado en JSON-LD es una penalización de
   confianza, no una oportunidad.
--------------------------------------------------------------------------- */

import { cohort, faqs, instructors, services, type Faq, type Service } from './landing';

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

/* --- Metadatos por página -------------------------------------------------
   Título: <= ~60 caracteres para que no se corte en el SERP.
   Descripción: 140-160 caracteres, con el término de búsqueda al principio y
   una razón concreta para hacer clic. Google puede reescribirla, pero es la
   que usan los buscadores con IA como resumen de la página.
   https://developers.google.com/search/docs/appearance/snippet             */

export interface PageSeo {
  title: string;
  description: string;
}

export const homeSeo: PageSeo = {
  title: 'Squai — Aprende IA, potencia tus habilidades',
  description:
    'Formación en inteligencia artificial para personas, equipos y comunidades educativas que no vienen de la tecnología. En vivo, en español y con práctica desde el primer día.',
};

/** Overrides de <title> y meta description por servicio. */
export const serviceSeo: Record<string, PageSeo> = {
  'squai-one': {
    title: 'Squai One — Curso de IA en vivo para personas | Squai',
    description:
      'Cohortes en vivo de inteligencia artificial generativa para personas sin perfil técnico: 5 semanas, 20 horas, 100% virtual y en español. Únete a la lista de espera.',
  },
  'squai-grow': {
    title: 'Squai Grow — Adopción de IA para equipos | Squai',
    description:
      'Acompañamos a equipos y organizaciones a llevar la IA a sus procesos reales: formación, adopción, criterio para decidir dónde aplicarla y uso seguro de la información.',
  },
  'squai-learn': {
    title: 'Squai Learn — IA para comunidades educativas | Squai',
    description:
      'Formación en inteligencia artificial para docentes y estudiantes: criterio, uso responsable y prácticas de aula para instituciones educativas de habla hispana.',
  },
};

/* --- JSON-LD ---------------------------------------------------------------
   Vocabulario schema.org, sintaxis JSON-LD: es el formato que Google
   recomienda y el que mejor leen los buscadores con IA.
   https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
--------------------------------------------------------------------------- */

type Json = Record<string, unknown>;

/**
 * La organización. Solo campos comprobables: nombre, sitio, logo, correo del
 * footer, idioma y las dos personas que el sitio declara como cofundadoras.
 * Sin `sameAs` porque los perfiles sociales de src/data/landing.ts están vacíos.
 */
export const organizationSchema = (): Json => ({
  '@type': ['Organization', 'EducationalOrganization'],
  '@id': ORG_ID,
  name: SITE_NAME,
  url: SITE_URL,
  email: CONTACT_EMAIL,
  description:
    'Squai enseña inteligencia artificial a personas, equipos y comunidades educativas que no vienen del mundo técnico.',
  slogan: 'Aprende IA, potencia tus habilidades.',
  logo: {
    '@type': 'ImageObject',
    url: absoluteUrl('/og/squai-logo.png'),
    width: 1200,
    height: 400,
  },
  image: absoluteUrl(DEFAULT_OG_IMAGE),
  knowsLanguage: ['es'],
  areaServed: { '@type': 'Place', name: 'Latinoamérica' },
  founder: instructors.map((person) => ({
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
});

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
    acceptedAnswer: { '@type': 'Answer', text: item.a },
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
 * El curso de Squai One. `timeRequired` y `courseWorkload` salen de
 * `cohort.duration` ("5 semanas · 20 horas") y `cohort.schedule` (dos sesiones
 * de dos horas por semana). Sin `offers` ni `startDate`: el repositorio no
 * tiene precio ni fecha de cohorte y la inscripción todavía no está abierta.
 * https://developers.google.com/search/docs/appearance/structured-data/course
 */
export const courseSchema = (pageUrl: string): Json => ({
  '@type': 'Course',
  '@id': `${pageUrl}#course`,
  name: cohort.name,
  description:
    'Programa en vivo de fundamentos de inteligencia artificial generativa para personas sin perfil técnico: cómo funciona un modelo, cómo pedirle bien y cómo aplicarlo a casos propios.',
  url: pageUrl,
  inLanguage: SITE_LANG,
  timeRequired: 'PT20H',
  educationalLevel: 'Principiante',
  teaches: [
    'Cómo funciona un modelo de lenguaje',
    'Cómo escribir instrucciones que devuelvan lo que necesitas',
    'Cómo aplicar IA generativa a tareas propias',
    'Qué información no conviene compartir con una IA',
  ],
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
  serviceType: service.name === 'Squai Learn' ? 'Formación en IA para instituciones educativas' : 'Adopción de IA en organizaciones',
  description: service.cardCopy,
  url: pageUrl,
  provider: { '@id': ORG_ID },
  areaServed: { '@type': 'Place', name: 'Latinoamérica' },
  availableLanguage: ['Spanish'],
  audience: { '@type': 'Audience', audienceType: service.audience },
});

/** Los tres servicios enlazados desde la home, en orden. */
export const servicesItemList = (): Json => ({
  '@type': 'ItemList',
  name: 'Servicios de Squai',
  itemListElement: services.map((service, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: `${service.name} — ${service.audience}`,
    url: absoluteUrl(`/servicios/${service.slug}`),
  })),
});

/** Grafo de la home: organización, sitio, página, servicios y FAQ. */
export const homeGraph = (): Json[] => [
  organizationSchema(),
  websiteSchema(),
  webPageSchema({ url: `${SITE_URL}/`, title: homeSeo.title, description: homeSeo.description }),
  servicesItemList(),
  faqSchema(faqs, `${SITE_URL}/`),
];
