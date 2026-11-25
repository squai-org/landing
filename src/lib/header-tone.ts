export type HeaderTone = 'light' | 'dark' | 'brand';

export interface ToneBand {
  left: number;
  right: number;
  top: number;
  bottom: number;
  tone: HeaderTone;
}

export interface ProbePoint {
  x: number;
  y: number;
}

const PAGE_TONE: HeaderTone = 'light';

export function headerToneAt(bands: ToneBand[], point: ProbePoint): HeaderTone {
  for (let index = bands.length - 1; index >= 0; index--) {
    const band = bands[index]!;
    if (point.x >= band.left && point.x < band.right && point.y >= band.top && point.y < band.bottom) return band.tone;
  }
  return PAGE_TONE;
}

export const headerToneOfCard = (tone: string): HeaderTone | undefined => {
  if (tone === 'dark') return 'dark';
  return tone ? 'brand' : undefined;
};

export const isHeaderTone = (value: string | undefined): value is HeaderTone => value === 'light' || value === 'dark' || value === 'brand';

export type HeaderSurface = 'light' | 'dark';

export const surfaceOf = (tone: HeaderTone): HeaderSurface => (tone === 'dark' ? 'dark' : 'light');

export const toneOrLight = (value: string | undefined): HeaderTone => (isHeaderTone(value) ? value : 'light');

export const BUTTON_VARIANT_ON: Record<HeaderSurface, 'white' | 'dark'> = {
  dark: 'white',
  light: 'dark',
};
