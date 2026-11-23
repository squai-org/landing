import { onReducedMotionChange, prefersReducedMotion, splitTextOnHover } from './motion';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

function watchAmbientVisibility(elements: HTMLElement[]) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting));
    },
    { rootMargin: '10% 0px 10% 0px' }
  );
  elements.forEach((element) => observer.observe(element));
}

function bindPauseToggle() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
  const label = toggle?.querySelector<HTMLElement>('[data-motion-toggle-label]');
  if (!toggle || !label) return;

  const render = () => {
    const paused = document.documentElement.dataset.motion === 'paused';
    label.textContent = paused ? toggle.dataset.resumeLabel! : toggle.dataset.pauseLabel!;
  };

  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const paused = document.documentElement.dataset.motion === 'paused';
    if (paused) delete document.documentElement.dataset.motion;
    else document.documentElement.dataset.motion = 'paused';
    render();
  });
  render();
}

function bindParallax(frames: HTMLElement[]) {
  const visible = new Set<HTMLElement>();
  let scheduled = false;

  const update = () => {
    scheduled = false;
    const viewport = window.innerHeight;
    visible.forEach((frame) => {
      if (prefersReducedMotion()) {
        frame.style.translate = '';
        return;
      }
      const rect = frame.parentElement!.getBoundingClientRect();
      const offset = rect.top + rect.height / 2 - viewport / 2;
      frame.style.translate = `0 ${(offset * Number(frame.dataset.parallax)).toFixed(1)}px`;
    });
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target as HTMLElement);
        else visible.delete(entry.target as HTMLElement);
      });
      schedule();
    },
    { rootMargin: '20% 0px 20% 0px' }
  );

  frames.forEach((frame) => observer.observe(frame.parentElement!));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  onReducedMotionChange(schedule);
}

export function initMotion() {
  splitTextOnHover();
  bindPauseToggle();
  if (!('IntersectionObserver' in window)) return;

  const parallaxFrames = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
  if (parallaxFrames.length) bindParallax(parallaxFrames);

  if (window.matchMedia(reducedMotionQuery).matches) return;

  const ambient = Array.from(document.querySelectorAll<HTMLElement>('.ambient'));
  if (ambient.length) watchAmbientVisibility(ambient);
}
