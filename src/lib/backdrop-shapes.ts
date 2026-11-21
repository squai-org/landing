export const backdropShapeNames = ['hero', 'flow', 'benefits', 'faq', 'signup'] as const;

export type BackdropShapeName = (typeof backdropShapeNames)[number];

export interface BackdropBlock {
  x: number;
  y: number;
  size: number;
  rotation: number;
  layer: 1 | 2;
  delay: number;
}

export interface BackdropShapeData {
  width: number;
  height: number;
  blocks: BackdropBlock[];
}

export const BLOCK_PATH =
  'M301.875 464.584C299.686 460.273 294.981 450.754 294.841 446.004C293.933 415.328 294.583 384.41 294.573 353.694C294.572 351.011 295.382 347.694 296.199 345.159C301.682 328.106 313.764 313.957 329.748 305.871C342.896 299.325 350.854 299.811 364.963 299.857L391.129 299.948C406.571 299.983 430.79 298.253 444.804 302.295C466.884 308.664 486.126 330.753 488.872 353.522C489.759 359.623 489.454 367.061 489.471 373.313L489.491 403.063C489.483 412.667 490.184 429.965 489.392 438.854C488.915 443.866 487.81 448.798 486.105 453.535C479.921 470.71 468.091 484.235 451.429 492.033C437.277 498.657 428.141 497.722 412.932 497.679C395.629 497.63 378.016 497.718 360.683 497.633C351.283 497.679 346.296 496.661 337.402 494.095C319.753 487.045 311.845 480.484 301.875 464.584Z';

export const BLOCK_CENTER = { x: 392, y: 399 };
export const BLOCK_WIDTH = 195;

export const backdropShapes: Record<BackdropShapeName, BackdropShapeData> = {
  hero: {
    width: 1920,
    height: 1403,
    blocks: [
      { x: 1700, y: 230, size: 820, rotation: 16, layer: 1, delay: 0 },
      { x: 1880, y: 1010, size: 400, rotation: -30, layer: 2, delay: 1.4 },
      { x: 1180, y: 1180, size: 560, rotation: -14, layer: 2, delay: 2.6 },
      { x: 230, y: 1290, size: 700, rotation: 24, layer: 1, delay: 3.4 },
      { x: 60, y: 330, size: 280, rotation: -12, layer: 2, delay: 0.8 },
    ],
  },
  flow: {
    width: 1920,
    height: 1078,
    blocks: [
      { x: 250, y: 270, size: 640, rotation: -16, layer: 1, delay: 0 },
      { x: 1520, y: 850, size: 720, rotation: 12, layer: 2, delay: 1.8 },
      { x: 930, y: 1010, size: 300, rotation: 30, layer: 1, delay: 3 },
      { x: 1770, y: 170, size: 300, rotation: -24, layer: 2, delay: 0.9 },
    ],
  },
  benefits: {
    width: 1920,
    height: 1080,
    blocks: [
      { x: 1560, y: 210, size: 700, rotation: 20, layer: 1, delay: 0.5 },
      { x: 310, y: 910, size: 760, rotation: -18, layer: 1, delay: 2.2 },
      { x: 980, y: 120, size: 260, rotation: 36, layer: 2, delay: 1.2 },
      { x: 1710, y: 1010, size: 340, rotation: -10, layer: 2, delay: 3.1 },
    ],
  },
  faq: {
    width: 1919,
    height: 1032,
    blocks: [
      { x: 260, y: 830, size: 820, rotation: 14, layer: 1, delay: 0 },
      { x: 1680, y: 250, size: 520, rotation: -20, layer: 2, delay: 1.6 },
      { x: 1070, y: 990, size: 260, rotation: 28, layer: 1, delay: 2.8 },
    ],
  },
  signup: {
    width: 1920,
    height: 820,
    blocks: [
      { x: 420, y: 410, size: 600, rotation: -10, layer: 1, delay: 0 },
      { x: 1500, y: 420, size: 640, rotation: 12, layer: 1, delay: 2 },
      { x: 960, y: 300, size: 300, rotation: 24, layer: 2, delay: 1 },
    ],
  },
};
