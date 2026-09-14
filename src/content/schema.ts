import { z } from 'astro/zod';

const text = z.string().min(1);
/**
 * Multi-paragraph copy. Accepts a list of paragraphs or a single string where a
 * blank line separates paragraphs (the shape most CMS textareas produce).
 * Always resolves to string[], so components render one <p> per item.
 */
const paragraphs = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : [value])
    .flatMap((item) => item.split(/\n\s*\n/))
    .map((item) => item.trim())
    .filter(Boolean))
  .pipe(z.array(text).min(1));
const link = z.string().regex(/^(?:\/(?!\/)|https:\/\/|mailto:|#)/);
const optionalLink = z.union([link, z.literal('')]);
const card = z.object({ t: text, d: text });
const faq = z.object({ q: text, a: paragraphs });
const labels = z.object({
  whatWeDo: text, services: text, team: text, faq: text, impact: text,
  origin: text, brand: text, reserve: text, call: text, challenge: text,
  capabilities: text, terms: text, privacy: text,
});
const labelKey = labels.keyof();
const capabilityGroup = z.object({ t: text, items: z.array(text).min(1), tone: z.string() });
const service = z.object({
  slug: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: text, audience: text, menuAudience: text, slogan: text, cardCopy: text,
  accent: text.regex(/^#[0-9a-fA-F]{6}$/), span: text, tone: z.string(),
  payback: z.object({ headline: text, cards: z.array(card).min(1) }),
  challenge: z.object({ cards: z.array(card).min(1) }),
  capabilities: z.object({ groups: z.array(capabilityGroup).min(1) }),
  cta: z.object({ labelKey: z.enum(['reserve', 'call']), modal: z.enum(['', 'grow', 'learn']), target: z.string() }),
  faqs: z.array(faq).min(1),
});
const modal = z.object({ copy: text, placeholder: text });
const inline = z.array(z.object({ text, href: link.optional() })).min(1);
const legalPage = z.object({
  title: text, description: text, updated: text,
  sections: z.array(z.object({
    title: text,
    blocks: z.array(z.discriminatedUnion('type', [
      z.object({ type: z.literal('paragraph'), content: inline }),
      z.object({ type: z.literal('list'), items: z.array(inline).min(1) }),
    ])).min(1),
  })).min(1),
});

/** Stable editorial contract, independent of the JSON file or a future CMS. */
export const siteSchema = z.object({
  labels,
  navLinks: z.array(z.object({ labelKey, target: text, href: link.optional() })).min(1),
  tagline: text,
  heroVerbs: z.array(z.object({ word: text, color: text.regex(/^#[0-9a-fA-F]{6}$/) })).min(1),
  heroLines: z.object({ object: text, middle: text, last: text }),
  heroSubtitle: text,
  cohort: z.object({ status: text, name: text, ecosystem: text, duration: text, schedule: text, modality: text, seats: text }),
  statement: z.object({ headline: text, body: paragraphs }),
  whatWeDo: z.object({ body: paragraphs }),
  capabilities: z.array(card.extend({ span: text, tone: z.string() })).min(1),
  impact: z.object({ body: paragraphs }),
  services: z.array(service).min(1).refine((items) => new Set(items.map((item) => item.slug)).size === items.length, 'Service slugs must be unique'),
  originStory: paragraphs,
  instructors: z.array(z.object({ img: link, name: text, role: text, d: text, linkedin: link, aria: text })),
  squadGrid: z.array(z.object({ img: link, name: text, role: text, d: text })),
  faqs: z.array(faq).min(1),
  socials: z.array(z.object({ name: text, href: optionalLink })),
  footerCols: z.array(z.object({
    h: text.optional(), headingKey: labelKey.optional(),
    links: z.array(z.object({
      t: text.optional(), labelKey: labelKey.optional(), target: text.nullable(), href: link.optional(),
    }).refine((item) => Boolean(item.t) !== Boolean(item.labelKey), 'Provide t or labelKey')
      .refine((item) => Boolean(item.target || item.href), 'Provide a target or href')),
  }).refine((item) => Boolean(item.h) !== Boolean(item.headingKey), 'Provide h or headingKey')),
  seo: z.object({ title: text, description: text, serviceTitle: text.refine((value) => value.includes('{service}'), 'Include {service}') }),
  legal: z.object({ terms: legalPage, privacy: legalPage }),
  ui: z.object({
    navigation: z.object({ home: text, open: text, close: text, main: text, waitlist: text }),
    hero: z.object({ pause: text, resume: text, services: text, scroll: text }),
    services: z.object({ discover: text, payback: text, contact: text }),
    team: z.object({ intro: paragraphs }),
    finalCta: z.object({ title: text, body: paragraphs }),
    follow: z.object({ title: text, copy: paragraphs }),
    footer: z.object({ copyright: text }),
    waitlist: z.object({ title: text, copy: paragraphs }),
    forms: z.object({
      required: text, fullName: text, email: text, corporateEmail: text, organization: text,
      role: text, countryCode: text, phone: text, whatsapp: text, teamSize: text,
      select: text, message: text, optional: text,
      teamSizes: z.array(z.object({ value: z.enum(['menos-10', '10-30', '30-100', 'mas-100']), label: text })).length(4),
    }),
    contact: z.object({ title: text, close: text, responseTime: text }),
    modal: z.object({ grow: modal, learn: modal }),
    feedback: z.object({ invalid: text, sending: text, error: text, contactSuccess: text, waitlistSuccess: text }),
    skip: text, updated: text,
  }),
});
