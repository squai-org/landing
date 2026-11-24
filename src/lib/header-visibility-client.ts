import { nextHeaderScroll, type HeaderScroll } from './header-visibility';

export const SECTION_JUMP_ATTRIBUTE = 'data-section-jump';

export function markSectionJump(active: boolean) {
  document.documentElement.toggleAttribute(SECTION_JUMP_ATTRIBUTE, active);
}

const hasKeyboardFocus = (header: HTMLElement) => {
  const active = document.activeElement;
  return active instanceof HTMLElement && header.contains(active) && active.matches(':focus-visible');
};

export function bindHeaderVisibility() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  const navToggle = header.querySelector<HTMLElement>('[data-nav-toggle]');
  const desktopQuery = window.matchMedia('(min-width: 1024px)');
  let state: HeaderScroll = { hidden: false, anchorY: window.scrollY };

  const update = () => {
    state = nextHeaderScroll(state, {
      scrollY: window.scrollY,
      desktop: desktopQuery.matches,
      menuOpen: navToggle?.getAttribute('aria-expanded') === 'true',
      focusInside: hasKeyboardFocus(header),
      jumping: document.documentElement.hasAttribute(SECTION_JUMP_ATTRIBUTE),
    });
    header.dataset.hidden = String(state.hidden);
  };

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  desktopQuery.addEventListener('change', update);
  header.addEventListener('focusin', update);
  header.addEventListener('focusout', () => requestAnimationFrame(update));
  const watch = new MutationObserver(update);
  if (navToggle) watch.observe(navToggle, { attributes: true, attributeFilter: ['aria-expanded'] });
  watch.observe(document.documentElement, { attributes: true, attributeFilter: [SECTION_JUMP_ATTRIBUTE] });
  update();
}
