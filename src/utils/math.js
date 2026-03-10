/**
 * SMART FIXER — VECTOR MATH
 * Strict Archetypal Casting applied.
 */

export const vec = {
  // Enforce numbers
  _n: (val) => {
    const num = Number(val);
    if (isNaN(num)) throw new Error(`Vector math received NaN: ${val}`);
    return num;
  },

  sub: (a, b) => ({
    x: vec._n(a.x) - vec._n(b.x),
    y: vec._n(a.y) - vec._n(b.y),
    z: vec._n(a.z) - vec._n(b.z)
  }),

  add: (a, b) => ({
    x: vec._n(a.x) + vec._n(b.x),
    y: vec._n(a.y) + vec._n(b.y),
    z: vec._n(a.z) + vec._n(b.z)
  }),

  scale: (v, s) => ({
    x: vec._n(v.x) * vec._n(s),
    y: vec._n(v.y) * vec._n(s),
    z: vec._n(v.z) * vec._n(s)
  }),

  dot: (a, b) => (
    vec._n(a.x) * vec._n(b.x) +
    vec._n(a.y) * vec._n(b.y) +
    vec._n(a.z) * vec._n(b.z)
  ),

  cross: (a, b) => ({
    x: vec._n(a.y) * vec._n(b.z) - vec._n(a.z) * vec._n(b.y),
    y: vec._n(a.z) * vec._n(b.x) - vec._n(a.x) * vec._n(b.z),
    z: vec._n(a.x) * vec._n(b.y) - vec._n(a.y) * vec._n(b.x),
  }),

  mag: (v) => Math.sqrt(
    Math.pow(vec._n(v.x), 2) +
    Math.pow(vec._n(v.y), 2) +
    Math.pow(vec._n(v.z), 2)
  ),

  normalize: (v) => {
    const m = vec.mag(v);
    return m > 0 ? { x: vec._n(v.x) / m, y: vec._n(v.y) / m, z: vec._n(v.z) / m } : { x: 0, y: 0, z: 0 };
  },

  dist: (a, b) => Math.sqrt(
    Math.pow(vec._n(a.x) - vec._n(b.x), 2) +
    Math.pow(vec._n(a.y) - vec._n(b.y), 2) +
    Math.pow(vec._n(a.z) - vec._n(b.z), 2)
  ),

  mid: (a, b) => ({
    x: (vec._n(a.x) + vec._n(b.x)) / 2,
    y: (vec._n(a.y) + vec._n(b.y)) / 2,
    z: (vec._n(a.z) + vec._n(b.z)) / 2
  }),

  approxEqual: (a, b, tol = 1.0) => (
    Math.abs(vec._n(a.x) - vec._n(b.x)) <= vec._n(tol) &&
    Math.abs(vec._n(a.y) - vec._n(b.y)) <= vec._n(tol) &&
    Math.abs(vec._n(a.z) - vec._n(b.z)) <= vec._n(tol)
  ),

  isZero: (v) => vec._n(v.x) === 0 && vec._n(v.y) === 0 && vec._n(v.z) === 0,
};
