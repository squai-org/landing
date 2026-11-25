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
