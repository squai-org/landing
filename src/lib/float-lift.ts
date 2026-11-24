export function footerBarOverlap(viewportHeight: number, barTop: number): number {
  return Math.max(0, Math.round(viewportHeight - barTop));
}

export function bindFloatLift() {
  const bar = document.querySelector<HTMLElement>('.footer-bottom');
  if (!bar) return;
  const rootStyle = document.documentElement.style;
  let frame = 0;
  let applied = -1;

  const update = () => {
    frame = 0;
    const overlap = footerBarOverlap(window.innerHeight, bar.getBoundingClientRect().top);
    if (overlap === applied) return;
    applied = overlap;
    if (overlap === 0) rootStyle.removeProperty('--footer-bar-overlap');
    else rootStyle.setProperty('--footer-bar-overlap', `${overlap}px`);
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  update();
}
