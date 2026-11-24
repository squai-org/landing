export interface FitTrack {
  start: number;
  length: number;
  profiles: number;
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
