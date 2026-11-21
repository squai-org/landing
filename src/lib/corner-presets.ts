export type CornerPreset = 'diagonal-a' | 'diagonal-b' | 'left-pair' | 'right-pair';

interface CornerBlock {
  size: string;
  rotation: number;
  shiftX: number;
  shiftY: number;
  rotationDelta: number;
  delay: number;
  duration: number;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export const cornerPairs: Record<CornerPreset, [CornerBlock, CornerBlock]> = {
  'diagonal-a': [
    { size: '6.5rem', rotation: -22, shiftX: -5, shiftY: -4, rotationDelta: -8, delay: 0.1, duration: 4.9, top: '1.5rem', left: '-2rem' },
    { size: '5.5rem', rotation: 17, shiftX: 4, shiftY: 4, rotationDelta: 7, delay: 0.9, duration: 4.4, bottom: '-1.5rem', right: '2.5rem' },
  ],
  'diagonal-b': [
    { size: '6rem', rotation: 20, shiftX: 4, shiftY: -4, rotationDelta: 9, delay: 0.35, duration: 4.6, top: '-1.5rem', right: '2.5rem' },
    { size: '6.5rem', rotation: -16, shiftX: -5, shiftY: 4, rotationDelta: -7, delay: 1.15, duration: 5.1, bottom: '2rem', left: '-2rem' },
  ],
  'left-pair': [
    { size: '6.5rem', rotation: -22, shiftX: -5, shiftY: -4, rotationDelta: -8, delay: 0.1, duration: 4.9, top: '2rem', left: '-2rem' },
    { size: '5.5rem', rotation: 17, shiftX: -3, shiftY: 4, rotationDelta: 7, delay: 0.9, duration: 4.4, bottom: '-1.5rem', left: '2rem' },
  ],
  'right-pair': [
    { size: '6rem', rotation: 20, shiftX: 4, shiftY: -4, rotationDelta: 9, delay: 0.35, duration: 4.6, top: '-1.5rem', right: '2rem' },
    { size: '6.5rem', rotation: -16, shiftX: 5, shiftY: 4, rotationDelta: -7, delay: 1.15, duration: 5.1, bottom: '2rem', right: '-2rem' },
  ],
};
