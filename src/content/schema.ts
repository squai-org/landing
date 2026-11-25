import { z } from 'astro/zod';
import { youtubeVideoId } from '../lib/youtube';

const text = z.string().min(1);
const paragraphs = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : [value])
    .flatMap((item) => item.split(/\n\s*\n/))
    .map((item) => item.trim())
    .filter(Boolean))
  .pipe(z.array(text).min(1));
const link = z.string().regex(/^(?:\/(?!\/)|https:\/\/|mailto:|#)/);
const optionalLink = z.union([link, z.literal('')]);
// Un editor de formularios guarda los campos vacios como cadena vacia. Para el
// contrato eso significa "sin valor", no "valor invalido".
const optional = <T extends z.ZodTypeAny>(schema: T) => z.union([schema, z.literal('')]).transform((value) => value || undefined).optional();
const hex = text.regex(/^#[0-9a-fA-F]{6}$/);
const card = z.object({ t: text, d: text });
// Pages CMS descarta los valores vacios al guardar, asi que los campos que
// admiten "sin valor" llevan default: ausente y vacio significan lo mismo.
const tone = z.enum(['', 'peri', 'dark', 'teal', 'gold']).default('');
// `span` y `tone` se interpolan como clases CSS, asi que solo se aceptan los
// tokens que la retícula de global.css conoce.
const span = text.regex(/^span-[2-6](?: row-[2-5])?$/);
// Cada ruta es una clave del mapa de fotos compiladas de Team.astro. Anadir una
// foto nueva es un cambio de codigo, no editorial.
export const teamPhotos = ['/images/team1.webp', '/images/team2.webp', '/images/team3.webp', '/images/team4.webp', '/images/team5.webp', '/images/team6.webp'] as const;
const faq = z.object({ q: text, a: paragraphs, category: optional(text) });
const countWords = z.object({ one: text, many: text });
const optionalAmount = optional(z.number().int().positive());
const investment = z.object({
  referencePrice: z.object({ COP: optionalAmount, USD: optionalAmount }).default({}),
  discountPercent: optional(z.number().int().min(1).max(99)),
  discountDeadline: optional(text),
}).optional();
const labels = z.object({
  whatWeDo: text, services: text, team: text, faq: text, impact: text,
  origin: text, brand: text, reserve: text, call: text, challenge: text,
  capabilities: text, terms: text, privacy: text,
});
const labelKey = labels.keyof();
const capabilityGroup = z.object({ t: text, items: z.array(text).min(1), tone });
export const stepIllustrations = [
  '/illustrations/pasos/paso-2.svg',
  '/illustrations/pasos/paso-3.svg',
  '/illustrations/pasos/paso-4.svg',
  '/illustrations/incluye/incluye-4.svg',
] as const;
export const moduleIllustrations = [
  '/illustrations/sesiones/sesion-1.svg',
  '/illustrations/sesiones/sesion-2.svg',
  '/illustrations/sesiones/sesion-3.svg',
  '/illustrations/sesiones/sesion-4.svg',
  '/illustrations/sesiones/sesion-5.svg',
  '/illustrations/sesiones/sesion-6.svg',
  '/illustrations/sesiones/sesion-7.svg',
  '/illustrations/sesiones/sesion-8.svg',
] as const;
export const factIllustrations = [
  '/illustrations/datos/en-vivo.svg',
  '/illustrations/incluye/incluye-1.svg',
  '/illustrations/incluye/incluye-2.svg',
  '/illustrations/datos/sin-conocimientos.svg',
  '/illustrations/datos/grupo.svg',
  '/illustrations/datos/comunidad.svg',
  '/illustrations/datos/cualquier-ia.svg',
  '/illustrations/datos/mentores.svg',
  '/illustrations/incluye/incluye-3.svg',
  '/illustrations/incluye/incluye-4.svg',
] as const;
const audienceFit = z.object({
  title: text,
  handwritten: text,
  photoAlts: z.array(text).length(6),
  profiles: z.array(card).min(1),
});
const howItWorks = z.object({
  title: text,
  handwritten: text,
  steps: z.array(z.object({ t: text, d: text, illustration: z.enum(stepIllustrations), alt: text })).min(1),
});
const syllabus = z.object({
  title: text,
  handwritten: text,
  summary: text,
  topicsLabel: text,
  prevLabel: text.default('Ver sesiones anteriores'),
  nextLabel: text.default('Ver sesiones siguientes'),
  modules: z.array(z.object({
    t: text,
    d: optional(text),
    topics: z.array(text).min(1),
    illustration: z.enum(moduleIllustrations),
    alt: text,
  })).min(1),
});
const outcomes = z.object({ title: text, lead: text, handwritten: optional(text), pills: z.array(text).min(1) });
const marqueeItem = z.object({ text: optional(text), cohort: z.enum(['', 'dates', 'schedule']).default('') })
  .refine((item) => Boolean(item.text || item.cohort), 'Provide text or a cohort');
const marquee = z.object({ title: text, lineA: z.array(marqueeItem).min(1), lineB: z.array(text).min(1) });
const mentorProfile = z.object({ name: text, badge: text, quote: text, role: optional(text), bio: optional(text) });
const youtubeUrl =text.refine((value) => youtubeVideoId(value) !== undefined, 'Use una URL de YouTube: watch?v=, youtu.be/ o embed/');
const videoSchema = z.object({
  url: optional(youtubeUrl),
  title: text, playLabel: text, iframeTitle: text, caption: text, posterAlt: text,
  lead: optional(text),
  body: optional(text),
  cta: z.object({ label: text, target: text }).optional(),
  mediaTitle: optional(text),
  mediaNote: optional(text),
  logosLabel: optional(text),
  logos: z.array(text).optional(),
});
// Un servicio por archivo en src/content/services/: el nombre del archivo es el
// slug y `order` fija el orden en la retícula de la pagina principal.
export const serviceSchema = z.object({
  order: z.number().int().min(1),
  name: text, audience: text, menuAudience: text, slogan: text, cardCopy: text, discoverLabel: text,
  accent: hex, span, tone,
  payback: z.object({ headline: text, body: paragraphs }).optional(),
  challenge: z.object({ cards: z.array(card).min(1) }).optional(),
  capabilities: z.object({ groups: z.array(capabilityGroup).min(1) }).optional(),
  audienceFit: audienceFit.optional(),
  howItWorks: howItWorks.optional(),
  syllabus: syllabus.optional(),
  cta: z.object({ label: text, modal: z.enum(['', 'grow', 'learn']).default(''), target: z.string().default('') }),
  investment,
  hero: z.object({
    title: text, lead: text, ctaLabel: optional(text),
    supportSchedule: optional(text), supportOffer: optional(text),
    note: text, sticker: text, photoAlt: text,
    datesPending: text, schedulePending: text,
  }).optional(),
  keyFacts: z.object({
    title: text, lead: text, handwritten: text,
    load: z.object({
      weeks: z.number().int().min(1),
      sessionsPerWeek: z.number().int().min(1),
      sessionMinutes: z.number().int().min(15),
    }),
    labels: z.object({ duration: text, sessions: text, dates: text, schedule: text, modality: text, seats: text }),
    modality: text, seats: text,
    cards: z.array(z.object({ title: text, description: text, illustration: z.enum(factIllustrations) })).min(1).optional(),
    carouselLabel: text.default('Lo que necesitas saber del programa'),
    prevLabel: text.default('Ver datos anteriores'),
    nextLabel: text.default('Ver datos siguientes'),
  }).optional(),
  ctaSecondary: optional(text),
  contactCta: optional(text),
  contactCopy: optional(text),
  contactAside: optional(text),
  video: videoSchema.optional(),
  seoTitle: optional(text),
  seoDescription: optional(text),
  team: z.object({
    title: text,
    closing: text,
    mentors: z.array(mentorProfile).optional(),
  }).optional(),
  outcomes: outcomes.optional(),
  marquee: marquee.optional(),
  testimonials: z.object({
    title: text,
    quotes: z.array(z.object({ text, name: text, context: text })).min(1),
  }).optional(),
  faqIntro: z.object({ lead: optional(text), categoriesLabel: text, allLabel: text.default('Todas') }).optional(),
  faqs: z.array(faq).min(1),
  nav: z.object({
    items: z.array(z.object({ label: text, target: text })).min(1),
    companyLabel: text,
  }).optional(),
  whatsapp: z.object({
    label: optional(text),
    message: optional(text),
    tooltip: optional(text),
    panel: z.object({
      dialogLabel: optional(text),
      title: optional(text),
      subtitle: optional(text),
      close: optional(text),
      topics: z.array(z.object({ label: text, message: text })).min(1).max(5).optional(),
    }).optional(),
  }).optional(),
});
const modal = z.object({ title: text, copy: text, placeholder: text });
const inline = z.array(z.object({ text, href: link.optional() })).min(1);
// Un item de lista se escribe como texto plano. La forma con segmentos sigue
// aceptada para los items que necesiten un enlace dentro del texto.
const inlineItem = z.union([text, inline]).transform((value) => (typeof value === 'string' ? [{ text: value }] : value));
const legalPage = z.object({
  title: text, description: text, updated: text,
  sections: z.array(z.object({
    title: text,
    blocks: z.array(z.discriminatedUnion('type', [
      z.object({ type: z.literal('paragraph'), content: inline }),
      z.object({ type: z.literal('list'), items: z.array(inlineItem).min(1) }),
    ])).min(1),
  })).min(1),
});

export const siteSchema = z.object({
  labels,
  navLinks: z.array(z.object({ labelKey, target: text, href: optional(link) })).min(1),
  tagline: text,
  heroVerbs: z.array(z.object({ word: text, color: hex })).min(1),
  heroLines: z.object({ object: text, middle: text, last: text }),
  heroSubtitle: text,
  program: z.object({ status: text, name: text, ecosystem: text, duration: text, schedule: text, modality: text }),
  statement: z.object({ headline: text, body: paragraphs }),
  whatWeDo: z.object({ body: paragraphs }),
  capabilities: z.array(card.extend({ span, tone })).min(1),
  impact: z.object({ body: paragraphs }),
  originStory: paragraphs,
  squadGrid: z.array(z.object({ img: z.enum(teamPhotos), name: text, role: text, d: text, founder: z.boolean().default(false) })).min(1),
  faqs: z.array(faq).min(1),
  socials: z.array(z.object({ name: text, href: optionalLink.default('') })),
  footerServices: z.object({
    title: text,
    links: z.array(z.object({ label: text, href: link })).length(3),
  }),
  footerCols: z.array(z.object({
    h: optional(text), headingKey: optional(labelKey),
    links: z.array(z.object({
      t: optional(text), labelKey: optional(labelKey), target: optional(text).nullable().default(null), href: optional(link),
    }).refine((item) => Boolean(item.t) !== Boolean(item.labelKey), 'Provide t or labelKey')
      .refine((item) => Boolean(item.target || item.href), 'Provide a target or href')),
  }).refine((item) => Boolean(item.h) !== Boolean(item.headingKey), 'Provide h or headingKey')),
  seo: z.object({
    title: text,
    description: text,
    imageAlt: text,
    serviceTitle: text.refine((value) => value.includes('{service}'), 'Include {service}'),
    websiteDescription: text,
    areaServed: text,
    knowsAbout: z.array(text).min(1),
    servicesListName: text,
    course: z.object({
      credential: text,
      mode: text,
      teaches: z.array(text).min(1),
      workload: z.object({
        summary: text.refine((value) => ['{sessions}', '{length}', '{perWeek}', '{weeks}'].every((key) => value.includes(key)), 'Include {sessions}, {length}, {perWeek} and {weeks}'),
        session: countWords,
        week: countWords,
        hour: countWords,
        minute: countWords,
        halfHour: text.refine((value) => value.includes('{hours}'), 'Include {hours}'),
        hoursAndMinutes: text.refine((value) => value.includes('{hours}') && value.includes('{minutes}'), 'Include {hours} and {minutes}'),
      }),
    }),
  }),
  llms: z.object({
    language: text,
    goalsTitle: text,
    goals: z.array(text).min(1),
    servicesTitle: text,
    programTitle: text,
    programNote: text.refine((value) => value.includes('{url}'), 'Include {url}'),
    pagesTitle: text,
    homeLabel: text,
    homeNote: text,
    faqTitle: text,
    contactTitle: text,
    emailLabel: text,
  }),
  company: z.object({ legalName: text, nit: text, address: text, phone: text, contact: text }),
  legal: z.object({ terms: legalPage, privacy: legalPage }),
  ui: z.object({
    navigation: z.object({ home: text, open: text, close: text, main: text, program: text, contactCta: text, oneCta: text, oneHome: text, servicesSubmenu: text, menuLabel: text, closeLabel: text }),
    motion: z.object({ pause: text, resume: text }),
    whatsapp: z.object({ label: text, message: text, tooltip: optional(text), panel: z.object({ dialogLabel: text, title: text, subtitle: text, close: text, topics: z.array(z.object({ label: text, message: text })).min(1).max(5) }).optional() }),
    scrollTop: z.object({ label: text }).optional(),
    carousel: z.object({ roleDescription: text }),
    cohort: z.object({
      from: text.refine((value) => value.includes('{start}'), 'Include {start}'),
      range: text.refine((value) => value.includes('{start}') && value.includes('{end}'), 'Include {start} and {end}'),
    }),
    hero: z.object({ pause: text, resume: text, services: text, scroll: text, cta: text }),
    services: z.object({ payback: text }),
    team: z.object({ intro: paragraphs, memberAlt: text.refine((value) => value.includes('{name}') && value.includes('{role}'), 'Include {name} and {role}') }),
    finalCta: z.object({ title: text, body: paragraphs, cta: text }),
    follow: z.object({ title: text }),
    footer: z.object({ copyright: text, whatsapp: text }),
    checkout: z.object({
      title: text,
      includesTitle: text,
      includesItems: z.array(text).min(1),
      datesTitle: text,
      datesItems: z.array(text).min(1),
      seatsLabel: text,
      seatsText: text,
      formTitle: text,
      secureNote: text.optional(),
      thanks: z.object({
        checking: text, approvedTitle: text, approvedBody: text,
        pendingTitle: text, pendingBody: text,
        rejectedTitle: text, rejectedBody: text,
        errorTitle: text, errorBody: text,
        orderLabel: text, backCta: text,
        enrolledTitle: text, enrolledBody: text,
      }),
      investment: z.object({
        referenceLabel: text,
        discountLabel: text.refine((value) => value.includes('{percent}'), 'Include {percent}'),
        deadlineLabel: text.refine((value) => value.includes('{date}'), 'Include {date}'),
      }),
      button: z.object({ paying: text, retry: text }),
      currency: z.object({ label: text, cop: text, usd: text }),
      status: z.object({ upcomingTitle: text, upcomingBody: text, closedTitle: text, closedBody: text }),
      resume: z.object({
        checking: text,
        expiredTitle: text, expiredBody: text,
        closedTitle: text, closedBody: text,
        notFoundTitle: text, notFoundBody: text,
        backCta: text,
        errorTitle: text, errorBody: text,
      }),
      confirmationEmail: z.object({
        pending: text,
        durationOne: text.refine((value) => value.includes('{weeks}'), 'Include {weeks}'),
        durationMany: text.refine((value) => value.includes('{weeks}'), 'Include {weeks}'),
        sessionsLinkBefore: text.refine((value) => value.includes('{date}'), 'Include {date}'),
        sessionsLinkFallback: text,
        paymentMethods: z.object({ CREDIT_CARD: text, DEBIT_CARD: text, PSE: text, NEQUI: text, BOTON_BANCOLOMBIA: text }),
        paymentMethodFallback: text,
      }),
    }),
    forms: z.object({
      required: text, fullName: text, email: text, corporateEmail: text, organization: text,
      role: text, countryCode: text, phone: text, whatsapp: text, teamSize: text, referralSourceProgram: text, referralSourceUs: text,
      select: text, message: text, optional: text, countrySearch: text, countryEmpty: text,
      privacyConsentPrefix: text, privacyConsentLink: text, privacyConsentSuffix: text,
      referralSources: z.array(z.object({ value: z.enum(['instagram', 'linkedin', 'tiktok', 'youtube', 'google', 'otras']), label: text })).length(6),
      teamSizes: z.array(z.object({ value: z.enum(['menos-10', '10-30', '30-100', 'mas-100']), label: text })).length(4),
      termsConsentPrefix: text, termsConsentLink: text, termsConsentSuffix: text,
      placeholders: z.object({ fullName: text, email: text, phone: text }).optional(),
    }),
    contact: z.object({ title: text, close: text, bookingFallback: text, bookingFallbackLink: text }),
    modal: z.object({ grow: modal, learn: modal }),
    feedback: z.object({
      invalid: text, sending: text, error: text, contactSuccess: text, checkoutError: text,
      fieldRequired: text, fieldEmail: text, turnstileError: text, turnstileUnsupported: text,
    }),
    skip: text, updated: text,
  }),
});
