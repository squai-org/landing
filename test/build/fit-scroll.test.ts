import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  factIllustrations,
  moduleIllustrations,
  serviceSchema,
  stepIllustrations,
} from '../../src/content/schema';
import { profileAt, scrollDrivesProfile, scrollTopFor, stepLocation } from '../../src/lib/fit-scroll';

const root = path.join(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

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

  it('solo un tramo con recorrido deja que el scroll elija el perfil', () => {
    expect(scrollDrivesProfile(track)).toBe(true);
    expect(scrollDrivesProfile({ start: 1000, length: 0, profiles: 3 })).toBe(false);
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

  it('mapea cada paso global al bloque y al item correspondiente', () => {
    const counts = [3, 1, 3];
    expect(stepLocation(0, counts)).toEqual({ step: 0, blockIndex: 0, itemIndex: 0 });
    expect(stepLocation(2, counts)).toEqual({ step: 2, blockIndex: 0, itemIndex: 2 });
    expect(stepLocation(3, counts)).toEqual({ step: 3, blockIndex: 1, itemIndex: 0 });
    expect(stepLocation(4, counts)).toEqual({ step: 4, blockIndex: 2, itemIndex: 0 });
    expect(stepLocation(6, counts)).toEqual({ step: 6, blockIndex: 2, itemIndex: 2 });
    expect(stepLocation(-2, counts)).toEqual({ step: 0, blockIndex: 0, itemIndex: 0 });
    expect(stepLocation(99, counts)).toEqual({ step: 6, blockIndex: 2, itemIndex: 2 });
    expect(stepLocation(0, [])).toEqual({ step: 0, blockIndex: 0, itemIndex: 0 });
  });
});

describe('Es para ti: bloques No es para ti si y Lo que necesitas', () => {
  it('valida el contrato editorial, el CMS y las ilustraciones unicas sin comentarios', () => {
    const one = serviceSchema.parse(JSON.parse(read('src/content/services/squai-one.json')));
    const notForYou = one.audienceFit?.notForYou;
    const requirements = one.audienceFit?.requirements;

    expect(notForYou?.title).toBe('No es para ti si...');
    expect(notForYou?.handwritten).toBe('No te vendemos humo.');
    expect(notForYou?.items).toHaveLength(1);
    expect(requirements?.title).toBe('Lo que necesitas');
    expect(requirements?.items).toHaveLength(3);
    expect(requirements?.items[0]?.d).toBeUndefined();
    expect(requirements?.items[1]?.d).toBeUndefined();
    expect(requirements?.items[2]?.d).toBeTruthy();

    const usedElsewhere = new Set<string>([...stepIllustrations, ...moduleIllustrations, ...factIllustrations]);
    const reqSvgs = (requirements?.items ?? []).flatMap((item) => [item.leftIllustration, item.rightIllustration]);
    expect(new Set(reqSvgs).size).toBe(6);
    for (const svgPath of reqSvgs) {
      expect(usedElsewhere.has(svgPath)).toBe(false);
      const svg = read(`public${svgPath}`);
      expect(svg).not.toMatch(/<!--|<metadata|<desc/);
    }

    const pages = read('.pages.yml');
    const blockStart = pages.indexOf('- name: one-para-quien');
    const blockEnd = pages.indexOf('- name: one-logros', blockStart);
    const cmsBlock = pages.slice(blockStart, blockEnd);
    for (const field of ['notForYou', 'requirements', 'leftIllustration', 'rightIllustration']) {
      expect(cmsBlock).toContain(`- name: ${field}`);
    }
  });
});
