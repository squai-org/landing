import { animate, hover, inView, press, scroll } from 'motion';
import type { AnimationOptions, DOMKeyframesDefinition } from 'motion';

type ScrollOffset = NonNullable<NonNullable<Parameters<typeof scroll>[1]>['offset']>;

export { animate };

type Bezier = [number, number, number, number];

export const easing = {
  smooth: [0.32, 0.72, 0, 1] as Bezier,
  softOvershoot: [0.59, 1, 0.88, 1.01] as Bezier,
  bounce: [0.34, 1.57, 0.64, 1] as Bezier,
  buttonBounce: [0.34, 2.27, 0.64, 1] as Bezier,
  click: [0.4, 0, 0.2, 1] as Bezier,
  popover: [0.16, 1, 0.3, 1] as Bezier,
  motionDefault: [0.25, 0.1, 0.35, 1] as Bezier,
};

export const springs = {
  gestureScale: { type: 'spring', stiffness: 550, damping: 30, restSpeed: 10 },
  gestureRotate: { type: 'spring', stiffness: 500, damping: 25, restSpeed: 10 },
  presentationMedia: { type: 'spring', stiffness: 210, damping: 18 },
  audienceSwap: { type: 'spring', stiffness: 240, damping: 22 },
  flowCard: { type: 'spring', stiffness: 185, damping: 18 },
  mentorCard: { type: 'spring', stiffness: 195, damping: 18 },
  testimonialCard: { type: 'spring', stiffness: 195, damping: 18 },
  outcomeLabel: { type: 'spring', duration: 0.85, bounce: 0.45 },
} as const satisfies Record<string, AnimationOptions>;

export const tweens = {
  menuOverlay: { duration: 0.2 },
  menuPanel: { duration: 0.28, ease: easing.smooth },
  popover: { duration: 0.16, ease: easing.popover },
  sectionReveal: { duration: 0.42, ease: easing.smooth },
  includesCard: { duration: 0.48, ease: easing.smooth },
  formReveal: { duration: 0.38, ease: easing.smooth },
  formCardReveal: { duration: 0.4, delay: 0.08, ease: easing.smooth },
  faqItem: { duration: 0.36, ease: easing.smooth },
  faqPanel: { duration: 0.28, ease: easing.smooth },
  audienceExample: { duration: 0.18 },
} as const satisfies Record<string, AnimationOptions>;

export const gestures = {
  whatsapp: { hover: { scale: 1.07, rotate: -4 }, press: { scale: 0.94 } },
  scrollTop: { hover: { scale: 1.06 }, press: { scale: 0.95 } },
};

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
const finePointerQuery = '(hover: hover) and (pointer: fine)';

export function prefersReducedMotion(): boolean {
  return window.matchMedia(reducedMotionQuery).matches;
}

export function motionPaused(): boolean {
  return document.documentElement.dataset.motion === 'paused';
}

export function motionAllowed(): boolean {
  return !prefersReducedMotion() && !motionPaused();
}

export function gestureTransition(target: DOMKeyframesDefinition): AnimationOptions {
  const keys = Object.keys(target);
  const perValue: Record<string, AnimationOptions> = {};
  for (const key of keys) {
    perValue[key] = key.startsWith('scale') ? springs.gestureScale : key === 'opacity' ? { duration: 0.3, ease: easing.motionDefault } : springs.gestureRotate;
  }
  return perValue as AnimationOptions;
}

function restingState(target: DOMKeyframesDefinition): DOMKeyframesDefinition {
  const rest: Record<string, number> = {};
  for (const key of Object.keys(target)) rest[key] = key.startsWith('scale') || key === 'opacity' ? 1 : 0;
  return rest as DOMKeyframesDefinition;
}

export function hoverPress(
  element: HTMLElement,
  { hover: hoverTarget, press: pressTarget }: { hover?: DOMKeyframesDefinition; press?: DOMKeyframesDefinition }
): void {
  if (prefersReducedMotion()) return;
  let hovered = false;
  const rest = restingState({ ...(hoverTarget ?? {}), ...(pressTarget ?? {}) } as DOMKeyframesDefinition);
  const settle = () => {
    const target = { ...rest, ...(hovered && hoverTarget ? hoverTarget : {}) } as DOMKeyframesDefinition;
    animate(element, target, gestureTransition(target));
  };

  if (hoverTarget && window.matchMedia(finePointerQuery).matches) {
    hover(element, () => {
      hovered = true;
      settle();
      return () => {
        hovered = false;
        settle();
      };
    });
  }

  if (pressTarget) {
    press(element, () => {
      animate(element, pressTarget, gestureTransition(pressTarget));
      return () => settle();
    });
  }
}

export function revealOnView(
  element: Element,
  from: DOMKeyframesDefinition,
  to: DOMKeyframesDefinition,
  transition: AnimationOptions,
  amount = 0.15
): void {
  if (prefersReducedMotion()) return;
  animate(element, from, { duration: 0 });
  inView(
    element,
    () => {
      animate(element, to, transition);
    },
    { amount }
  );
}

const scrollOffsets = {
  'start-end': ['start end', 'end start'],
  'start-start': ['start start', 'end start'],
} as const satisfies Record<string, ScrollOffset>;

export function scrollRange(
  target: Element,
  offset: keyof typeof scrollOffsets,
  [from, to]: [number, number],
  apply: (value: number) => void
): void {
  if (prefersReducedMotion()) return;
  scroll((progress: number) => apply(from + (to - from) * progress), { target, offset: [...scrollOffsets[offset]] });
}

export function flagWhileInView(elements: HTMLElement[], flag: string): void {
  if (elements.length === 0) return;
  inView(
    elements,
    (element) => {
      (element as HTMLElement).dataset[flag] = 'on';
      return () => {
        (element as HTMLElement).dataset[flag] = 'off';
      };
    },
    { margin: '10% 0px 10% 0px' }
  );
}

export function animateIn(element: Element, from: DOMKeyframesDefinition, to: DOMKeyframesDefinition, transition: AnimationOptions) {
  if (prefersReducedMotion()) {
    animate(element, to, { duration: 0 });
    return Promise.resolve();
  }
  animate(element, from, { duration: 0 });
  return animate(element, to, transition).finished;
}

export function animateOut(element: Element, to: DOMKeyframesDefinition, transition: AnimationOptions) {
  if (prefersReducedMotion()) return Promise.resolve();
  return animate(element, to, transition).finished;
}

function splitInto(label: HTMLElement): void {
  const text = label.textContent ?? '';
  if (!text.trim()) return;
  const readable = document.createElement('span');
  readable.className = 'sr-only';
  readable.textContent = text;
  const visual = document.createElement('span');
  visual.className = 'split-chars';
  visual.setAttribute('aria-hidden', 'true');
  Array.from(text).forEach((char, index) => {
    const span = document.createElement('span');
    span.className = 'split-char';
    span.style.setProperty('--char-i', String(index));
    span.dataset.char = char === ' ' ? ' ' : char;
    visual.append(span);
  });
  label.replaceChildren(readable, visual);
}

export function splitTextOnHover(root: ParentNode = document): void {
  const wave = window.matchMedia(`${finePointerQuery} and (prefers-reduced-motion: no-preference)`);
  if (!wave.matches) return;
  const labels = Array.from(root.querySelectorAll<HTMLElement>('[data-split-text]'));
  const observer = new MutationObserver((records) => {
    records.forEach(({ target }) => {
      const label = (target instanceof HTMLElement ? target : target.parentElement)?.closest<HTMLElement>('[data-split-text]');
      if (label && !label.querySelector(':scope > .split-chars')) splitInto(label);
    });
  });
  labels.forEach((label) => {
    splitInto(label);
    observer.observe(label, { childList: true, characterData: true, subtree: true });
  });
}
