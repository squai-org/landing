export interface Spring {
  stiffness: number;
  damping: number;
  mass?: number;
}

export interface EnterFrom {
  opacity?: number;
  x?: number;
  y?: number;
  rotate?: number;
  scale?: number;
}

export interface EnterOptions {
  from: EnterFrom;
  to?: EnterFrom;
  delay?: number;
  amount?: number;
  spring?: Spring;
  duration?: number;
  ease?: string;
}

export const easeSmooth = 'cubic-bezier(0.32, 0.72, 0, 1)';

export const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const springCache = new Map<string, { duration: number; easing: string }>();

export const springTiming = ({ stiffness, damping, mass = 1 }: Spring): { duration: number; easing: string } => {
  const key = `${stiffness}-${damping}-${mass}`;
  const cached = springCache.get(key);
  if (cached) return cached;
  const step = 1 / 240;
  let position = 0;
  let velocity = 0;
  let elapsed = 0;
  const samples = [0];
  while (elapsed < 10) {
    const acceleration = (-stiffness * (position - 1) - damping * velocity) / mass;
    velocity += acceleration * step;
    position += velocity * step;
    elapsed += step;
    samples.push(position);
    if (Math.abs(position - 1) < 0.0005 && Math.abs(velocity) < 0.005) break;
  }
  const stride = Math.max(1, Math.round(samples.length / 80));
  const points = samples.filter((_, index) => index % stride === 0);
  points.push(1);
  const timing = { duration: elapsed * 1000, easing: `linear(${points.map((value) => Number(value.toFixed(4))).join(', ')})` };
  springCache.set(key, timing);
  return timing;
};

const frame = ({ opacity = 1, x = 0, y = 0, rotate = 0, scale = 1 }: EnterFrom): Keyframe => ({
  opacity,
  transform: `translateX(${x}px) translateY(${y}px) scale(${scale}) rotate(${rotate}deg)`,
});

export const enterOnView = (element: HTMLElement, options: EnterOptions): void => {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
  const start = frame(options.from);
  const end = frame(options.to ?? {});
  Object.assign(element.style, start);
  const timing = options.spring
    ? springTiming(options.spring)
    : { duration: (options.duration ?? 0.4) * 1000, easing: options.ease ?? easeSmooth };
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const animation = element.animate([start, end], {
          duration: timing.duration,
          easing: timing.easing,
          delay: (options.delay ?? 0) * 1000,
          fill: 'both',
        });
        animation.finished
          .then(() => {
            Object.assign(element.style, end);
            animation.cancel();
          })
          .catch(() => undefined);
      });
    },
    { threshold: options.amount ?? 0.15 },
  );
  observer.observe(element);
};

export interface ScrollRange {
  target: HTMLElement;
  offset: 'start-end' | 'start-start';
  from: number;
  to: number;
  apply: (value: number) => void;
}

export const scrollLinked = (ranges: ScrollRange[]): void => {
  if (prefersReducedMotion() || ranges.length === 0) return;
  let scheduled = false;
  const update = () => {
    scheduled = false;
    const viewport = window.innerHeight;
    ranges.forEach((range) => {
      const rect = range.target.getBoundingClientRect();
      const startAt = range.offset === 'start-end' ? viewport : 0;
      const length = range.offset === 'start-end' ? viewport + rect.height : rect.height;
      const progress = Math.min(1, Math.max(0, (startAt - rect.top) / (length || 1)));
      range.apply(range.from + (range.to - range.from) * progress);
    });
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  update();
};

export const breatheWhileVisible = (elements: HTMLElement[]): void => {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        (entry.target as HTMLElement).dataset.breathing = entry.isIntersecting ? 'on' : 'off';
      });
    },
    { rootMargin: '10% 0px 10% 0px' },
  );
  elements.forEach((element) => observer.observe(element));
};
