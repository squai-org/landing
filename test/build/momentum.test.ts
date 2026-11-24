import { describe, expect, it } from 'vitest';
import { MOMENTUM, kick, restingBody, settled, step } from '../../src/lib/momentum';

describe('empuje de las etiquetas de logros', () => {
  it('usa los parametros del diseno', () => {
    expect(MOMENTUM).toEqual({ xy: 25, rotation: 15, clampXY: 1080, clampRot: 60, stiffness: 170, damping: 13 });
  });

  it('la velocidad del puntero se multiplica por 25', () => {
    const body = kick(restingBody(), { vx: 4, vy: -2 }, { x: 0, y: 0 });
    expect(body.vx).toBe(100);
    expect(body.vy).toBe(-50);
  });

  it('la velocidad se limita a 1080', () => {
    const body = kick(restingBody(), { vx: 500, vy: -500 }, { x: 0, y: 0 });
    expect(body.vx).toBe(1080);
    expect(body.vy).toBe(-1080);
  });

  it('el giro sale del par entre el desplazamiento y la velocidad', () => {
    const body = kick(restingBody(), { vx: 0, vy: 2 }, { x: 10, y: 0 });
    expect(body.vr).toBe(30);
  });

  it('el giro se limita a 60 grados por segundo', () => {
    const body = kick(restingBody(), { vx: 0, vy: 100 }, { x: 10, y: 0 });
    expect(body.vr).toBe(60);
  });

  it('sin desplazamiento no divide por cero', () => {
    const body = kick(restingBody(), { vx: 1, vy: 1 }, { x: 0, y: 0 });
    expect(Number.isFinite(body.vr)).toBe(true);
  });

  it('un empuje se aleja y el resorte lo devuelve al reposo', () => {
    let body = kick(restingBody(), { vx: 10, vy: 0 }, { x: 0, y: 0 });
    body = step(body, 0.016);
    expect(body.x).toBeGreaterThan(0);
    for (let i = 0; i < 600 && !settled(body); i += 1) body = step(body, 0.016);
    expect(settled(body)).toBe(true);
  });

  it('el paso de tiempo se limita a 32 ms', () => {
    const slow = step(kick(restingBody(), { vx: 10, vy: 0 }, { x: 0, y: 0 }), 5);
    const capped = step(kick(restingBody(), { vx: 10, vy: 0 }, { x: 0, y: 0 }), 0.032);
    expect(slow.x).toBe(capped.x);
  });

  it('el reposo no se considera en movimiento', () => {
    expect(settled(restingBody())).toBe(true);
  });
});
