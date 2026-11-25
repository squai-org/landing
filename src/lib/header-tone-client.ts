import { headerToneAt, isHeaderTone, type HeaderTone, type ToneBand } from './header-tone';

const SWAPPABLE_VARIANTS: Record<'light' | 'dark', { from: string; to: string }> = {
  dark: { from: 'btn-dark', to: 'btn-white' },
  light: { from: 'btn-white', to: 'btn-dark' },
};

export function bindHeaderTone() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  const row = header?.querySelector<HTMLElement>('[data-header-row]');
  if (!header || !row) return;
  const swappable = header.querySelectorAll<HTMLElement>('[data-tone-swap]');
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-header-tone]'));
  if (sections.length === 0) return;
  let ticking = false;

  const surface = (tone: HeaderTone) => (tone === 'dark' ? 'dark' : 'light');

  const apply = (tone: HeaderTone) => {
    if (header.dataset.tone === tone) return;
    const previous = surface(isHeaderTone(header.dataset.tone) ? header.dataset.tone : 'light');
    header.dataset.tone = tone;
    const next = surface(tone);
    if (previous === next) return;
    const { from, to } = SWAPPABLE_VARIANTS[next];
    swappable.forEach((element) => {
      element.classList.remove(from);
      element.classList.add(to);
    });
  };

  const update = () => {
    ticking = false;
    const probe = row.offsetTop + row.offsetHeight / 2;
    const bands: ToneBand[] = [];
    for (const section of sections) {
      const tone = section.dataset.headerTone;
      if (!isHeaderTone(tone)) continue;
      const rect = section.getBoundingClientRect();
      bands.push({ top: rect.top, bottom: rect.bottom, tone });
    }
    const current = isHeaderTone(header.dataset.tone) ? header.dataset.tone : 'light';
    apply(headerToneAt(bands, probe, current));
  };

  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  update();
}
