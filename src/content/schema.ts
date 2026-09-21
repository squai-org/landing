import { z } from 'astro/zod';

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
const faq = z.object({ q: text, a: paragraphs });
const labels = z.object({
  whatWeDo: text, services: text, team: text, faq: text, impact: text,
  origin: text, brand: text, reserve: text, call: text, challenge: text,
  capabilities: text, terms: text, privacy: text,
});
const labelKey = labels.keyof();
const capabilityGroup = z.object({ t: text, items: z.array(text).min(1), tone });
// Un servicio por archivo en src/content/services/: el nombre del archivo es el
// slug y `order` fija el orden en la retícula de la pagina principal.
export const serviceSchema = z.object({
  order: z.number().int().min(1),
  name: text, audience: text, menuAudience: text, slogan: text, cardCopy: text, discoverLabel: text,
  accent: hex, span, tone,
  payback: z.object({ headline: text, body: paragraphs }),
  challenge: z.object({ cards: z.array(card).min(1) }),
  capabilities: z.object({ groups: z.array(capabilityGroup).min(1) }),
  cta: z.object({ label: text, modal: z.enum(['', 'grow', 'learn']).default(''), target: z.string().default('') }),
  ctaSecondary: optional(text),
  contactCta: optional(text),
  contactCopy: optional(text),
  contactAside: optional(text),
  seoHeading: text,
  seoTitle: optional(text),
  seoDescription: optional(text),
  faqs: z.array(faq).min(1),
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
  squadGrid: z.array(z.object({ img: z.enum(teamPhotos), name: text, role: text, d: text, linkedin: optional(link) })).min(1),
  faqs: z.array(faq).min(1),
  socials: z.array(z.object({ name: text, href: optionalLink.default('') })),
  footerCols: z.array(z.object({
    h: optional(text), headingKey: optional(labelKey),
    links: z.array(z.object({
      t: optional(text), labelKey: optional(labelKey), target: optional(text).nullable().default(null), href: optional(link),
    }).refine((item) => Boolean(item.t) !== Boolean(item.labelKey), 'Provide t or labelKey')
      .refine((item) => Boolean(item.target || item.href), 'Provide a target or href')),
  }).refine((item) => Boolean(item.h) !== Boolean(item.headingKey), 'Provide h or headingKey')),
  seo: z.object({ title: text, description: text, imageAlt: text, serviceTitle: text.refine((value) => value.includes('{service}'), 'Include {service}') }),
  legal: z.object({ terms: legalPage, privacy: legalPage }),
  ui: z.object({
    navigation: z.object({ home: text, open: text, close: text, main: text, waitlist: text, contactCta: text, oneCta: text, servicesSubmenu: text }),
    hero: z.object({ pause: text, resume: text, services: text, scroll: text, cta: text }),
    services: z.object({ payback: text, capabilitiesFallback: text }),
    program: z.object({ duration: text, schedule: text, modality: text }),
    team: z.object({ intro: paragraphs, memberAlt: text.refine((value) => value.includes('{name}') && value.includes('{role}'), 'Include {name} and {role}') }),
    finalCta: z.object({ title: text, body: paragraphs, cta: text }),
    follow: z.object({ title: text }),
    footer: z.object({ copyright: text }),
    waitlist: z.object({
      title: text,
      copy: paragraphs,
      formTitle: text,
      formSubtitle: text,
      investment: z.object({ eyebrow: text, copy: paragraphs, price: text, currency: text, referencePrice: text }),
    }),
    forms: z.object({
      required: text, fullName: text, email: text, corporateEmail: text, organization: text,
      role: text, countryCode: text, phone: text, whatsapp: text, teamSize: text,
      select: text, message: text, optional: text, countrySearch: text, countryEmpty: text,
      privacyConsentPrefix: text, privacyConsentLink: text, privacyConsentSuffix: text,
      teamSizes: z.array(z.object({ value: z.enum(['menos-10', '10-30', '30-100', 'mas-100']), label: text })).length(4),
    }),
    contact: z.object({ title: text, close: text, bookingFallback: text, bookingFallbackLink: text }),
    modal: z.object({ grow: modal, learn: modal }),
    feedback: z.object({
      invalid: text, sending: text, error: text, contactSuccess: text, waitlistSuccess: text,
      fieldRequired: text, fieldEmail: text, turnstileError: text, turnstileUnsupported: text,
    }),
    skip: text, updated: text,
  }),
});
