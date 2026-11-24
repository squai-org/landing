export interface HeaderScroll {
  hidden: boolean;
  anchorY: number;
}

export interface HeaderSignals {
  scrollY: number;
  desktop: boolean;
  menuOpen: boolean;
  focusInside: boolean;
  jumping: boolean;
}

export const HEADER_SCROLL_THRESHOLD = 8;
export const HEADER_TOP_ZONE = 96;

const mustStayVisible = (signals: HeaderSignals) =>
  signals.desktop || signals.menuOpen || signals.focusInside || signals.jumping || signals.scrollY <= HEADER_TOP_ZONE;

export function nextHeaderScroll(previous: HeaderScroll, signals: HeaderSignals): HeaderScroll {
  if (mustStayVisible(signals)) return { hidden: false, anchorY: signals.scrollY };
  const travel = signals.scrollY - previous.anchorY;
  if (Math.abs(travel) <= HEADER_SCROLL_THRESHOLD) return previous;
  return { hidden: travel > 0, anchorY: signals.scrollY };
}
