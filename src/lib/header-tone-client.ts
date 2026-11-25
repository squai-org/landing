import { BUTTON_VARIANT_ON, headerToneAt, isHeaderTone, surfaceOf, toneOrLight, type HeaderTone, type ToneBand } from './header-tone';

const buttonClass = (surface: 'light' | 'dark') => `btn-${BUTTON_VARIANT_ON[surface]}`;

export function bindHeaderTone() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  const row = header?.querySelector<HTMLElement>('[data-header-row]');
  if (!header || !row) return;
  const swappable = header.querySelectorAll<HTMLElement>('[data-tone-swap]');
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-header-tone]'));
  if (sections.length === 0) return;
  let ticking = false;

  const apply = (tone: HeaderTone) => {
    if (header.dataset.tone === tone) return;
    const previous = surfaceOf(toneOrLight(header.dataset.tone));
    header.dataset.tone = tone;
    const next = surfaceOf(tone);
    if (previous === next) return;
    const from = buttonClass(previous);
    const to = buttonClass(next);
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
    const current = toneOrLight(header.dataset.tone);
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
