/**
 * PerfFlags — one place that decides how hard the GPU gets pushed.
 * Phones/tablets (coarse pointer) take the light path: no canvas shadow
 * glow, capped pixel ratio, reduced particle counts.
 */
export const LOW_FX =
  typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/** Mobile renders WAY too many pixels at native DPR; 1.75 looks identical. */
export const MAX_DPR = LOW_FX ? 1.75 : 2;
