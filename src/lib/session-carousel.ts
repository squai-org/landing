export interface SlideMotion {
  rotate: number;
  y: number;
}

export const sessionSlideMotion: readonly SlideMotion[] = [
  { rotate: -2.2, y: -6.5 },
  { rotate: 2.6, y: 4.2 },
  { rotate: -1.7, y: -8.1 },
  { rotate: 2.9, y: 5.6 },
  { rotate: -2.5, y: -3.4 },
  { rotate: 1.9, y: 7.8 },
  { rotate: -2.8, y: -5.2 },
  { rotate: 1.6, y: 3.9 },
];

const farthest = 2;
const falloff = 1.2;

export function normalizedDistance({ itemCenter, center, maxDistance }: { itemCenter: number; center: number; maxDistance: number }): number {
  const ratio = (itemCenter - center) / (maxDistance || 1);
  return Math.max(-farthest, Math.min(farthest, ratio));
}

export function slideTransform(norm: number, motion: SlideMotion): SlideMotion {
  const strength = Math.sin(norm * falloff);
  return { rotate: strength * motion.rotate, y: strength * motion.y };
}

export function slideMotionAt(index: number): SlideMotion {
  return sessionSlideMotion[index % sessionSlideMotion.length]!;
}
