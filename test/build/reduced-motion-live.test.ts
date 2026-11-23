import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const motion = vi.hoisted(() => ({
  animate: vi.fn(() => ({ finished: Promise.resolve() })),
  inView: vi.fn(),
  hover: vi.fn(),
  press: vi.fn(),
  scroll: vi.fn(),
}));

vi.mock('motion', () => motion);

type Listener = (event: { matches: boolean }) => void;

const preference = vi.hoisted(() => ({
  matches: false,
  listeners: new Set<(event: { matches: boolean }) => void>(),
}));

const setReducedMotion = (matches: boolean) => {
  preference.matches = matches;
  preference.listeners.forEach((listener) => listener({ matches }));
};

const stubWindow = () => {
  const matchMedia = (query: string) => ({
    get matches() {
      return query.includes('prefers-reduced-motion') ? preference.matches : false;
    },
    addEventListener: (_type: string, listener: Listener) => preference.listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => preference.listeners.delete(listener),
  });
  vi.stubGlobal('window', { matchMedia });
  vi.stubGlobal('document', { documentElement: { dataset: {} } });
};

type MotionModule = {
  onReducedMotionChange: (listener: (reduced: boolean) => void) => void;
  scrollRange: (target: object, offset: 'start-end' | 'start-start', range: [number, number], apply: (value: number) => void) => void;
  revealOnView: (element: object, from: object, to: object, transition: object) => void;
  hoverBetween: (element: object, states: { rest: object; hovered: object }, transition: object) => void;
  hoverPress: (element: object, targets: { hover?: object; press?: object }) => void;
};

const motionPath = '../../src/lib/motion';
const loadMotion = () => import(motionPath) as Promise<MotionModule>;

describe('movimiento reducido en vivo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    preference.matches = false;
    preference.listeners.clear();
    stubWindow();
  });

  it('avisa a quien escucha cuando la preferencia cambia con la pagina abierta', async () => {
    const { onReducedMotionChange } = await loadMotion();
    const seen: boolean[] = [];
    onReducedMotionChange((reduced) => seen.push(reduced));
    setReducedMotion(true);
    setReducedMotion(false);
    expect(seen).toEqual([true, false]);
  });

  it('scrollRange deja de mover el valor cuando se activa el movimiento reducido', async () => {
    const { scrollRange } = await loadMotion();
    const applied: number[] = [];
    scrollRange({}, 'start-end', [10, 50], (value) => applied.push(value));
    const onScroll = motion.scroll.mock.calls[0]![0] as (progress: number) => void;
    onScroll(0.5);
    setReducedMotion(true);
    onScroll(0.5);
    expect(applied).toEqual([30, 10]);
  });

  it('scrollRange arranca aunque la pagina se abra con movimiento reducido y se active despues', async () => {
    preference.matches = true;
    const { scrollRange } = await loadMotion();
    const applied: number[] = [];
    scrollRange({}, 'start-end', [0, 40], (value) => applied.push(value));
    expect(motion.scroll).toHaveBeenCalledTimes(1);
    const onScroll = motion.scroll.mock.calls[0]![0] as (progress: number) => void;
    setReducedMotion(false);
    onScroll(0.5);
    expect(applied.at(-1)).toBe(20);
  });

  it('revealOnView muestra de inmediato lo que aun estaba oculto al activar movimiento reducido', async () => {
    const { revealOnView } = await loadMotion();
    const element = {};
    revealOnView(element, { opacity: 0 }, { opacity: 1 }, { duration: 0.4 });
    motion.animate.mockClear();
    setReducedMotion(true);
    expect(motion.animate).toHaveBeenCalledWith(element, { opacity: 1 }, { duration: 0 });
  });

  it('hoverPress no anima el gesto mientras el movimiento reducido este activo', async () => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        get matches() {
          return query.includes('prefers-reduced-motion') ? preference.matches : true;
        },
        addEventListener: (_type: string, listener: Listener) => preference.listeners.add(listener),
        removeEventListener: (_type: string, listener: Listener) => preference.listeners.delete(listener),
      }),
    });
    const { hoverPress } = await loadMotion();
    const element = {};
    hoverPress(element, { hover: { scale: 1.07 }, press: { scale: 0.94 } });
    const onPress = motion.press.mock.calls[0]![1] as () => () => void;
    setReducedMotion(true);
    motion.animate.mockClear();
    onPress();
    expect(motion.animate).not.toHaveBeenCalled();
  });
  it('hoverBetween registra el gesto aunque la pagina abra con movimiento reducido y lo respeta al momento del hover', async () => {
    preference.matches = true;
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        get matches() {
          return query.includes('prefers-reduced-motion') ? preference.matches : true;
        },
        addEventListener: (_type: string, listener: Listener) => preference.listeners.add(listener),
        removeEventListener: (_type: string, listener: Listener) => preference.listeners.delete(listener),
      }),
    });
    const { hoverBetween } = await loadMotion();
    const element = {};
    hoverBetween(element, { rest: { scale: 1 }, hovered: { scale: 1.02 } }, { duration: 0.3 });
    expect(motion.hover).toHaveBeenCalledTimes(1);
    const onHover = motion.hover.mock.calls[0]![1] as () => () => void;

    motion.animate.mockClear();
    onHover();
    expect(motion.animate).not.toHaveBeenCalled();

    setReducedMotion(false);
    const leave = onHover();
    expect(motion.animate).toHaveBeenCalledWith(element, { scale: 1.02 }, { duration: 0.3 });
    leave();
    expect(motion.animate).toHaveBeenLastCalledWith(element, { scale: 1 }, { duration: 0.3 });
  });
});

describe('componentes que leen el movimiento reducido en vivo', () => {
  const read = (file: string) => readFileSync(path.join(import.meta.dirname, '../..', file), 'utf8');

  it.each(['src/components/AudienceFit.astro', 'src/components/Faq.astro', 'src/components/OneOutcomes.astro'])(
    '%s se suscribe a onReducedMotionChange y no fija la preferencia una sola vez',
    (file) => {
      const source = read(file);
      expect(source).toContain('onReducedMotionChange');
      expect(source).not.toMatch(/const reduced = prefersReducedMotion\(\)/);
      expect(source).not.toMatch(/if \(stage && !prefersReducedMotion\(\)\)/);
    }
  );
});
