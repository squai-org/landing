export interface FitTrack {
  start: number;
  length: number;
  profiles: number;
}

export interface FitStepPosition {
  step: number;
  blockIndex: number;
  itemIndex: number;
}

const clampProfile = (profile: number, profiles: number) => Math.min(Math.max(profile, 0), profiles - 1);

export function scrollDrivesProfile(track: FitTrack): boolean {
  return track.length > 0;
}

export function profileAt(scrollY: number, track: FitTrack): number {
  if (track.length <= 0) return 0;
  const progress = (scrollY - track.start) / track.length;
  return clampProfile(Math.floor(progress * track.profiles), track.profiles);
}

export function scrollTopFor(profile: number, track: FitTrack): number {
  const slot = clampProfile(profile, track.profiles);
  return track.start + (track.length * (slot + 0.5)) / track.profiles;
}

export function stepLocation(step: number, blockCounts: number[]): FitStepPosition {
  const total = blockCounts.reduce((sum, count) => sum + Math.max(0, count), 0);
  if (total <= 0) return { step: 0, blockIndex: 0, itemIndex: 0 };
  const clamped = clampProfile(step, total);
  let remaining = clamped;
  for (let blockIndex = 0; blockIndex < blockCounts.length; blockIndex += 1) {
    const count = Math.max(0, blockCounts[blockIndex]!);
    if (remaining < count) return { step: clamped, blockIndex, itemIndex: remaining };
    remaining -= count;
  }
  const lastBlock = blockCounts.length - 1;
  return { step: clamped, blockIndex: lastBlock, itemIndex: Math.max(0, blockCounts[lastBlock]! - 1) };
}
