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

export const SITE_URL = 'https://squai.io';
export const SITE_NAME = 'Squai';
export const SITE_LOCALE = 'es_CO';
export const SITE_LANG = 'es-419';
export const CONTACT_EMAIL = 'team@squai.io';
export const DEFAULT_OG_IMAGE = '/og/squai-og.png';
export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;

export const absoluteUrl = (path: string) => new URL(path, SITE_URL).href;

const removeTrailingSlashes = (path: string) => {
  let end = path.length;

  while (end > 0 && path[end - 1] === '/') {
    end -= 1;
  }

  return path.slice(0, end);
};

export const canonicalPath = (pathname: string) => {
  const clean = removeTrailingSlashes(
    pathname
      .replace(/\/index\.html$/, '/')
      .replace(/\.html$/, ''),
  );
  return clean || '/';
};

const answerText = (faq: Faq) => faq.a.join('\n\n');

export const serviceSeo = (service: Service, template: string) => ({
  title: service.seoTitle || template.replace('{service}', service.name),
  description: service.seoDescription || service.slogan,
});


type Json = Record<string, unknown>;

export const organizationSchema = (content: SiteContent): Json => {
  const sameAs = content.socials.map((social) => social.href).filter(Boolean);
  const founders = content.squadGrid.filter((person) => /fundador/i.test(person.role));

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
    knowsAbout: [
      'Inteligencia artificial generativa',
      'Formación en inteligencia artificial',
      'Adopción de inteligencia artificial',
      'Uso seguro y ético de inteligencia artificial',
    ],
    areaServed: { '@type': 'Place', name: 'Latinoamérica' },
    ...(sameAs.length ? { sameAs } : {}),
    founder: founders.map((person) => ({
      '@type': 'Person',
      name: person.name,
      jobTitle: person.role,
      ...(person.linkedin ? { sameAs: [person.linkedin] } : {}),
    })),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: CONTACT_EMAIL,
      availableLanguage: ['Spanish'],
    },
  };
};

export const websiteSchema = (): Json => ({
  '@type': 'WebSite',
  '@id': SITE_ID,
  url: SITE_URL,
  name: SITE_NAME,
  description: 'Entrenamiento y formación práctica en inteligencia artificial para Latinoamérica.',
  inLanguage: SITE_LANG,
  publisher: { '@id': ORG_ID },
});

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

export const courseSchema = (content: SiteContent, service: Service, pageUrl: string): Json => ({
  '@type': 'Course',
  '@id': `${pageUrl}#course`,
  name: content.program.name,
  description: service.cardCopy,
  url: pageUrl,
  inLanguage: SITE_LANG,
  timeRequired: 'PT20H',
  educationalLevel: 'Principiante',
  educationalCredentialAwarded: 'Certificado digital de finalización',
  teaches: [
    'Fundamentos de inteligencia artificial generativa',
    'Uso práctico de herramientas de inteligencia artificial',
    'Evaluación y mejora de respuestas generadas por IA',
    'Uso seguro y responsable de la inteligencia artificial',
  ],
  provider: { '@id': ORG_ID },
  hasCourseInstance: {
    '@type': 'CourseInstance',
    courseMode: 'Online',
    courseWorkload: 'PT20H',
    inLanguage: SITE_LANG,
  },
});

export const serviceSchema = (service: Service, pageUrl: string): Json => ({
  '@type': 'Service',
  '@id': `${pageUrl}#service`,
  name: service.name,
  serviceType: service.slug === 'squai-learn'
    ? 'Entrenamiento en IA para comunidades educativas'
    : 'Entrenamiento en IA para empresas y equipos',
  description: service.cardCopy,
  url: pageUrl,
  provider: { '@id': ORG_ID },
  areaServed: { '@type': 'Place', name: 'Latinoamérica' },
  availableLanguage: ['Spanish'],
  audience: { '@type': 'Audience', audienceType: service.menuAudience },
});

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

export const homeGraph = (content: SiteContent): Json[] => [
  organizationSchema(content),
  websiteSchema(),
  webPageSchema({ url: `${SITE_URL}/`, title: content.seo.title, description: content.seo.description }),
  servicesItemList(content.services),
  faqSchema(content.faqs, `${SITE_URL}/`),
];
