import { describe, expect, it } from 'vitest';
import { nextHeaderScroll, type HeaderScroll, type HeaderSignals } from '../../src/lib/header-visibility';

const calm: Omit<HeaderSignals, 'scrollY'> = { desktop: false, menuOpen: false, focusInside: false, jumping: false };
const visibleAt = (anchorY: number): HeaderScroll => ({ hidden: false, anchorY });
const hiddenAt = (anchorY: number): HeaderScroll => ({ hidden: true, anchorY });

describe('navbar que se oculta al bajar en movil y tablet', () => {
  it('bajar mas de 8px lo oculta y subir mas de 8px lo muestra', () => {
    expect(nextHeaderScroll(visibleAt(1000), { ...calm, scrollY: 1009 })).toEqual(hiddenAt(1009));
    expect(nextHeaderScroll(hiddenAt(1000), { ...calm, scrollY: 991 })).toEqual(visibleAt(991));
  });

  it('moverse 8px o menos en cualquier sentido no cambia el estado', () => {
    expect(nextHeaderScroll(visibleAt(1000), { ...calm, scrollY: 1008 })).toEqual(visibleAt(1000));
    expect(nextHeaderScroll(hiddenAt(1000), { ...calm, scrollY: 992 })).toEqual(hiddenAt(1000));
    expect(nextHeaderScroll(hiddenAt(1000), { ...calm, scrollY: 1300 })).toEqual(hiddenAt(1300));
  });

  it('los pasos pequenos se suman desde el ultimo cambio hasta pasar el umbral', () => {
    let state = visibleAt(1000);
    for (const scrollY of [1003, 1006, 1008]) state = nextHeaderScroll(state, { ...calm, scrollY });
    expect(state.hidden).toBe(false);
    state = nextHeaderScroll(state, { ...calm, scrollY: 1010 });
    expect(state).toEqual(hiddenAt(1010));
  });

  it('cerca del inicio siempre se ve, aunque se baje', () => {
    expect(nextHeaderScroll(visibleAt(0), { ...calm, scrollY: 60 })).toEqual(visibleAt(60));
    expect(nextHeaderScroll(hiddenAt(400), { ...calm, scrollY: 80 })).toEqual(visibleAt(80));
    expect(nextHeaderScroll(visibleAt(60), { ...calm, scrollY: 140 })).toEqual(hiddenAt(140));
  });

  it('con el menu abierto, con el foco dentro o durante un salto se ve aunque se baje', () => {
    for (const reason of [{ menuOpen: true }, { focusInside: true }, { jumping: true }]) {
      expect(nextHeaderScroll(visibleAt(1000), { ...calm, ...reason, scrollY: 1600 })).toEqual(visibleAt(1600));
      expect(nextHeaderScroll(hiddenAt(1000), { ...calm, ...reason, scrollY: 1004 })).toEqual(visibleAt(1004));
    }
  });

  it('despues de un salto hay que bajar mas de 8px desde donde aterrizo para ocultarlo', () => {
    const landed = nextHeaderScroll(visibleAt(200), { ...calm, jumping: true, scrollY: 3000 });
    expect(nextHeaderScroll(landed, { ...calm, scrollY: 3008 }).hidden).toBe(false);
    expect(nextHeaderScroll(landed, { ...calm, scrollY: 3009 }).hidden).toBe(true);
  });

  it('en escritorio nunca se oculta', () => {
    expect(nextHeaderScroll(visibleAt(1000), { ...calm, desktop: true, scrollY: 2000 })).toEqual(visibleAt(2000));
    expect(nextHeaderScroll(hiddenAt(1000), { ...calm, desktop: true, scrollY: 1000 })).toEqual(visibleAt(1000));
  });
});
