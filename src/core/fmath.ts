// Deterministic math for the simulation.
// Math.sin/cos/atan2/pow are not guaranteed to give identical bits on different
// JS engines (phone WebView vs Node on the server). + - * / and Math.sqrt are
// exact IEEE operations, so the core uses only these.

export const PI = 3.141592653589793;
export const TAU = PI * 2;

/** sin via range reduction + 9th-order Taylor polynomial (error < 1e-6). */
export function fsin(x: number): number {
  x = x - TAU * Math.floor(x / TAU + 0.5); // to [-PI, PI]
  let sign = 1;
  if (x > PI / 2) x = PI - x;
  else if (x < -PI / 2) x = -PI - x;
  if (x < 0) { x = -x; sign = -1; }
  const x2 = x * x;
  const r = x * (1 - x2 / 6 * (1 - x2 / 20 * (1 - x2 / 42 * (1 - x2 / 72 * (1 - x2 / 110)))));
  return sign * r;
}

export function fcos(x: number): number {
  return fsin(x + PI / 2);
}

/** atan2 via polynomial approximation (error < 1e-5 rad). */
export function fatan2(y: number, x: number): number {
  if (x === 0 && y === 0) return 0;
  const ax = Math.abs(x), ay = Math.abs(y);
  const a = ax > ay ? ay / ax : ax / ay;
  const s = a * a;
  let r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a;
  if (ay > ax) r = PI / 2 - r;
  if (x < 0) r = PI - r;
  if (y < 0) r = -r;
  return r;
}

export function len(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

/** a^n for integer n >= 0 by repeated multiplication. */
export function ipow(a: number, n: number): number {
  let r = 1;
  for (let i = 0; i < n; i++) r *= a;
  return r;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
