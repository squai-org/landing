import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type SiteContent = CollectionEntry<'copies'>['data'];
export type Faq = SiteContent['faqs'][number];
export type ClientCopy = Pick<SiteContent['ui'], 'navigation' | 'modal' | 'feedback'>;
export type HeroClientCopy = SiteContent['ui']['hero'] & { verbs: SiteContent['heroVerbs'] };
export type LegalSections = SiteContent['legal']['terms']['sections'];
export type Service = Awaited<ReturnType<typeof getSiteContent>>['services'][number];
export type CapabilityGroup = Service['capabilities']['groups'][number];

export async function getSiteContent() {
  const [entry, serviceEntries] = await Promise.all([getEntry('copies', 'site'), getCollection('services')]);
  if (!entry) throw new Error('Missing required content entry: copies/site');
  const data = entry.data;
  const { labels } = data;

  return {
    ...data,
    navLinks: data.navLinks.map((item) => ({ ...item, label: labels[item.labelKey] })),
    whatWeDo: { ...data.whatWeDo, title: labels.whatWeDo },
    impact: { ...data.impact, title: labels.impact },
    services: serviceEntries
      .map(({ id, data: service }) => ({
        ...service,
        slug: id,
        challenge: { ...service.challenge, headline: labels.challenge },
        capabilities: { ...service.capabilities, headline: labels.capabilities },
      }))
      .sort((a, b) => a.order - b.order),
    footerCols: data.footerCols.map((col) => ({
      ...col,
      h: col.headingKey ? labels[col.headingKey] : col.h!,
      links: col.links.map((item) => ({ ...item, t: item.labelKey ? labels[item.labelKey] : item.t! })),
    })),
  };
}
