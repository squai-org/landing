import { getEntry, type CollectionEntry } from 'astro:content';

export type SiteContent = CollectionEntry<'copies'>['data'];
export type Faq = SiteContent['faqs'][number];
export type CapabilityGroup = SiteContent['services'][number]['capabilities']['groups'][number];
export type ClientCopy = Pick<SiteContent['ui'], 'navigation' | 'modal' | 'feedback'>;
export type HeroClientCopy = SiteContent['ui']['hero'] & { verbs: SiteContent['heroVerbs'] };
export type LegalSections = SiteContent['legal']['terms']['sections'];
export type Service = Awaited<ReturnType<typeof getSiteContent>>['services'][number];

export async function getSiteContent() {
  const entry = await getEntry('copies', 'site');
  if (!entry) throw new Error('Missing required content entry: copies/site');
  const data = entry.data;
  const { labels } = data;

  return {
    ...data,
    navLinks: data.navLinks.map((item) => ({ ...item, label: labels[item.labelKey] })),
    whatWeDo: { ...data.whatWeDo, title: labels.whatWeDo },
    impact: { ...data.impact, title: labels.impact },
    services: data.services.map((service) => ({
      ...service,
      challenge: { ...service.challenge, headline: labels.challenge },
      capabilities: { ...service.capabilities, headline: labels.capabilities },
    })),
    footerCols: data.footerCols.map((col) => ({
      ...col,
      h: col.headingKey ? labels[col.headingKey] : col.h!,
      links: col.links.map((item) => ({ ...item, t: item.labelKey ? labels[item.labelKey] : item.t! })),
    })),
  };
}
