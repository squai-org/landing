export function footerBarOverlap(viewportHeight: number, barTop: number): number {
  return Math.max(0, Math.round(viewportHeight - barTop));
}
