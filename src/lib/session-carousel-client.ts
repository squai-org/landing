import { prefersReducedMotion } from './motion';
import { normalizedDistance, slideMotionAt, slideTransform } from './session-carousel';

const edgeTolerance = 4;
const dragThreshold = 5;

function bindSessionCarousel(root: HTMLElement) {
  const track = root.querySelector<HTMLElement>('[data-sessions-track]');
  const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-session-slide]'));
  const prev = root.querySelector<HTMLButtonElement>('[data-sessions-step="prev"]');
  const next = root.querySelector<HTMLButtonElement>('[data-sessions-step="next"]');
  if (!track || !prev || !next || slides.length === 0) return;

  let frame = 0;
  const drag = { active: false, moved: false, startX: 0, startScroll: 0 };

  const update = () => {
    frame = 0;
    const maxScroll = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= edgeTolerance;
    next.disabled = track.scrollLeft >= maxScroll - edgeTolerance;

    if (prefersReducedMotion()) return;
    const wrap = track.getBoundingClientRect();
    const center = wrap.left + wrap.width / 2;
    const maxDistance = wrap.width / 2;
    slides.forEach((slide, index) => {
      const rect = slide.getBoundingClientRect();
      const norm = normalizedDistance({ itemCenter: rect.left + rect.width / 2, center, maxDistance });
      const { rotate, y } = slideTransform(norm, slideMotionAt(index));
      slide.style.transform = `translateY(${y.toFixed(2)}%) rotate(${rotate.toFixed(2)}deg)`;
    });
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  const step = (direction: 1 | -1) => {
    track.scrollBy({ left: direction * slides[0]!.offsetWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  track.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);

  track.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    Object.assign(drag, { active: true, moved: false, startX: event.clientX, startScroll: track.scrollLeft });
  });
  track.addEventListener('pointermove', (event) => {
    if (!drag.active) return;
    const delta = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(delta) > dragThreshold) {
      drag.moved = true;
      track.setPointerCapture(event.pointerId);
      track.dataset.dragging = 'true';
    }
    if (drag.moved) track.scrollLeft = drag.startScroll - delta;
  });
  const endDrag = (event: PointerEvent) => {
    drag.active = false;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    delete track.dataset.dragging;
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener(
    'click',
    (event) => {
      if (!drag.moved) return;
      event.preventDefault();
      event.stopPropagation();
      drag.moved = false;
    },
    true
  );

  update();
}

export function bindSessionCarousels() {
  document.querySelectorAll<HTMLElement>('[data-sessions]:not([data-sessions-bound])').forEach((root) => {
    root.dataset.sessionsBound = '';
    bindSessionCarousel(root);
  });
}
