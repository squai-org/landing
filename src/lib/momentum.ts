export const MOMENTUM = { xy: 25, rotation: 15, clampXY: 1080, clampRot: 60, stiffness: 170, damping: 13 } as const;

const MAX_STEP = 0.032;
const SETTLE_THRESHOLD = 0.05;

export interface Body {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  vr: number;
}

interface Point {
  x: number;
  y: number;
}

interface Velocity {
  vx: number;
  vy: number;
}

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

export const restingBody = (): Body => ({ x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0 });

export const kick = (body: Body, pointer: Velocity, offset: Point): Body => {
  const torque = (offset.x * pointer.vy - offset.y * pointer.vx) / (Math.hypot(offset.x, offset.y) || 1);
  return {
    ...body,
    vx: body.vx + clamp(pointer.vx * MOMENTUM.xy, MOMENTUM.clampXY),
    vy: body.vy + clamp(pointer.vy * MOMENTUM.xy, MOMENTUM.clampXY),
    vr: body.vr + clamp(torque * MOMENTUM.rotation, MOMENTUM.clampRot),
  };
};

const advance = (position: number, velocity: number, dt: number): [number, number] => {
  const acceleration = -MOMENTUM.stiffness * position - MOMENTUM.damping * velocity;
  const nextVelocity = velocity + acceleration * dt;
  return [position + nextVelocity * dt, nextVelocity];
};

export const step = (body: Body, seconds: number): Body => {
  const dt = Math.min(MAX_STEP, seconds);
  const [x, vx] = advance(body.x, body.vx, dt);
  const [y, vy] = advance(body.y, body.vy, dt);
  const [r, vr] = advance(body.r, body.vr, dt);
  return { x, y, r, vx, vy, vr };
};

export const settled = (body: Body): boolean =>
  [body.x, body.y, body.r, body.vx / 10, body.vy / 10, body.vr / 10].every((value) => Math.abs(value) < SETTLE_THRESHOLD);

export const transformOf = (body: Body): string =>
  `translate3d(${body.x.toFixed(2)}px, ${body.y.toFixed(2)}px, 0) rotate(${body.r.toFixed(2)}deg)`;
