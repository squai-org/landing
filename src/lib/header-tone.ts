export type HeaderTone = 'light' | 'dark' | 'brand';

export interface ToneBand {
  top: number;
  bottom: number;
  tone: HeaderTone;
}

export function headerToneAt(bands: ToneBand[], y: number, current: HeaderTone): HeaderTone {
  for (let index = bands.length - 1; index >= 0; index--) {
    const band = bands[index]!;
    if (y >= band.top && y < band.bottom) return band.tone;
  }
  return current;
}

export const isHeaderTone = (value: string | undefined): value is HeaderTone => value === 'light' || value === 'dark' || value === 'brand';

export type HeaderSurface = 'light' | 'dark';

export const surfaceOf = (tone: HeaderTone): HeaderSurface => (tone === 'dark' ? 'dark' : 'light');

export const toneOrLight = (value: string | undefined): HeaderTone => (isHeaderTone(value) ? value : 'light');

export const BUTTON_VARIANT_ON: Record<HeaderSurface, 'white' | 'dark'> = {
  dark: 'white',
  light: 'dark',
};
