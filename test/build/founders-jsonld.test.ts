import { describe, expect, it } from 'vitest';
import { foundersOf } from '../../src/lib/founders';

const member = (name: string, role: string, founder: boolean) => ({ name, role, founder });

const names = (members: ReturnType<typeof member>[]) => foundersOf(members).map((person) => person.name);

describe('JSON-LD: fundadores', () => {
  it('salen del campo founder, no de la redaccion del cargo', () => {
    expect(names([member('Ana', 'Directora creativa', true), member('Beto', 'Cofundador y analista', false)])).toEqual(['Ana']);
  });

  it('siguen declarados aunque el cargo cambie de redaccion', () => {
    expect(names([member('Ana', 'Estratega & Co-fundadora', true)])).toEqual(['Ana']);
    expect(names([member('Ana', 'Estratega de adopcion de IA', true)])).toEqual(['Ana']);
  });
});
