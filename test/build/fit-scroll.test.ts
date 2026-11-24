import { describe, expect, it } from 'vitest';
import { profileAt, scrollTopFor } from '../../src/lib/fit-scroll';

const track = { start: 1000, length: 1500, profiles: 3 };

describe('Es para ti: perfil activo segun el scroll del tramo fijo', () => {
  it('antes del tramo queda el primer perfil y despues el ultimo', () => {
    expect(profileAt(0, track)).toBe(0);
    expect(profileAt(999, track)).toBe(0);
    expect(profileAt(2500, track)).toBe(2);
    expect(profileAt(9000, track)).toBe(2);
  });

  it('cada perfil ocupa un tercio del tramo y cambia justo en su borde', () => {
    expect(profileAt(1000, track)).toBe(0);
    expect(profileAt(1499, track)).toBe(0);
    expect(profileAt(1500, track)).toBe(1);
    expect(profileAt(1999, track)).toBe(1);
    expect(profileAt(2000, track)).toBe(2);
  });

  it('un tramo sin recorrido deja el primer perfil', () => {
    expect(profileAt(1200, { start: 1000, length: 0, profiles: 3 })).toBe(0);
  });

  it('cada perfil se lleva a la mitad de su tercio del tramo', () => {
    expect(scrollTopFor(0, track)).toBe(1250);
    expect(scrollTopFor(1, track)).toBe(1750);
    expect(scrollTopFor(2, track)).toBe(2250);
  });

  it('un perfil fuera de rango se lleva al extremo mas cercano', () => {
    expect(scrollTopFor(-1, track)).toBe(1250);
    expect(scrollTopFor(7, track)).toBe(2250);
  });

  it('ir al tramo de un perfil lo deja activo, con cualquier geometria', () => {
    for (const geometry of [track, { start: 3217.4, length: 1803.6, profiles: 3 }, { start: 0, length: 999, profiles: 4 }]) {
      for (let profile = 0; profile < geometry.profiles; profile += 1) {
        expect(profileAt(scrollTopFor(profile, geometry), geometry)).toBe(profile);
      }
    }
  });
});
