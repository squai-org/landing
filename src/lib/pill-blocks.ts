interface PillBlock {
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

export const pillBlockPresets: [PillBlock, PillBlock][] = [
  [
    { size: '36px', rotation: -22, shiftX: -2, shiftY: -3, rotationDelta: -8, delay: 0.1, duration: 4.4, top: '-14px', left: '4px' },
    { size: '32px', rotation: 19, shiftX: 2, shiftY: 3, rotationDelta: 8, delay: 0.6, duration: 4.7, bottom: '-14px', right: '8px' },
  ],
  [
    { size: '32px', rotation: 25, shiftX: 2, shiftY: -3, rotationDelta: 9, delay: 0.2, duration: 4.6, top: '-14px', right: '8px' },
    { size: '36px', rotation: -16, shiftX: -2, shiftY: 3, rotationDelta: -7, delay: 0.75, duration: 4.3, bottom: '-12px', left: '8px' },
  ],
  [
    { size: '36px', rotation: -27, shiftX: -3, shiftY: 3, rotationDelta: -8, delay: 0.15, duration: 4.8, bottom: '-14px', left: '4px' },
    { size: '32px', rotation: 13, shiftX: 2, shiftY: -2, rotationDelta: 7, delay: 0.8, duration: 4.4, top: '-12px', right: '4px' },
  ],
  [
    { size: '32px', rotation: -12, shiftX: -1, shiftY: -3, rotationDelta: -7, delay: 0.25, duration: 4.5, top: '-12px', left: '16px' },
    { size: '40px', rotation: 24, shiftX: 3, shiftY: 3, rotationDelta: 8, delay: 0.85, duration: 4.9, bottom: '-14px', right: '4px' },
  ],
];
