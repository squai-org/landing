export type OneCornerPreset = 'mod-1' | 'mod-2' | 'mod-3' | 'mod-4';

type Edge = 'top' | 'right' | 'bottom' | 'left';

export interface OneCornerBlock {
  at: Partial<Record<Edge, string>>;
  atSm?: Partial<Record<Edge, string>>;
  size: string;
  sizeSm: string;
  rot: string;
  shiftX: string;
  shiftY: string;
  rotDelta: string;
  delay: string;
  dur: string;
}

export const oneCornerPresets: Record<OneCornerPreset, [OneCornerBlock, OneCornerBlock]> = {
  'mod-1': [
    { at: { top: '2.5rem', left: '-1.5rem' }, atSm: { left: '-2rem' }, size: '5.5rem', sizeSm: '6.5rem', rot: '-26deg', shiftX: '-4px', shiftY: '-3px', rotDelta: '-8deg', delay: '0.1s', dur: '4.7s' },
    { at: { bottom: '-1.25rem', right: '-1rem' }, atSm: { right: '-1.25rem' }, size: '5rem', sizeSm: '6rem', rot: '22deg', shiftX: '4px', shiftY: '4px', rotDelta: '7deg', delay: '0.6s', dur: '4.3s' },
  ],
  'mod-2': [
    { at: { top: '-1.5rem', right: '-1rem' }, atSm: { right: '-1.5rem' }, size: '6rem', sizeSm: '7rem', rot: '18deg', shiftX: '4px', shiftY: '-5px', rotDelta: '8deg', delay: '0.25s', dur: '5.0s' },
    { at: { bottom: '3.5rem', left: '-1.25rem' }, atSm: { left: '-1.75rem' }, size: '5rem', sizeSm: '5.5rem', rot: '-14deg', shiftX: '-4px', shiftY: '3px', rotDelta: '-7deg', delay: '0.85s', dur: '4.5s' },
  ],
  'mod-3': [
    { at: { bottom: '-1.5rem', left: '-1rem' }, atSm: { left: '-1.5rem' }, size: '6rem', sizeSm: '7rem', rot: '-20deg', shiftX: '-4px', shiftY: '4px', rotDelta: '-8deg', delay: '0.15s', dur: '4.8s' },
    { at: { top: '3.5rem', right: '-1.25rem' }, atSm: { right: '-1.75rem' }, size: '5rem', sizeSm: '6rem', rot: '26deg', shiftX: '4px', shiftY: '-3px', rotDelta: '9deg', delay: '0.7s', dur: '4.4s' },
  ],
  'mod-4': [
    { at: { top: '-1.5rem', left: '1.75rem' }, size: '5rem', sizeSm: '6rem', rot: '-13deg', shiftX: '-3px', shiftY: '-5px', rotDelta: '-8deg', delay: '0.3s', dur: '4.6s' },
    { at: { bottom: '3rem', right: '-1.25rem' }, atSm: { right: '-1.75rem' }, size: '6rem', sizeSm: '7rem', rot: '17deg', shiftX: '5px', shiftY: '4px', rotDelta: '8deg', delay: '0.95s', dur: '5.1s' },
  ],
};

export const cornerBlockStyle = (block: OneCornerBlock): string => {
  const edges: Edge[] = ['top', 'right', 'bottom', 'left'];
  const vars = edges.flatMap((edge) => {
    const base = block.at[edge];
    if (!base) return [];
    return [`--${edge}:${base}`, `--${edge}-sm:${block.atSm?.[edge] ?? base}`];
  });
  return [
    ...vars,
    `--block-size:${block.size}`,
    `--block-size-sm:${block.sizeSm}`,
    `--base-rot:${block.rot}`,
    `--shift-x:${block.shiftX}`,
    `--shift-y:${block.shiftY}`,
    `--rot-delta:${block.rotDelta}`,
    `--anim-delay:${block.delay}`,
    `--anim-dur:${block.dur}`,
  ].join(';');
};
