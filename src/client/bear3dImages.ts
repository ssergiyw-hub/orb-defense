// The event bear (правка 125): Meshy model rendered to atlases, rows = 8 directions (0 = right, clockwise), columns = frames.
// Made by tools/art/pack_bear3d.py — do not edit.
export const BEAR3D = { foot: 0.2, clips: {
  idle: { n: 8, cell: 320, dur: 1.667, loop: true, hit: 0, src: 'h3d/bear_idle.webp' },
  walk: { n: 16, cell: 256, dur: 5.5, loop: true, hit: 0, src: 'h3d/bear_walk.webp' },
  swipe: { n: 8, cell: 320, dur: 1.0, loop: false, hit: 0.45, src: 'h3d/bear_swipe.webp' },
  slam: { n: 12, cell: 320, dur: 3.0, loop: false, hit: 0.78, src: 'h3d/bear_slam.webp' },
  charge: { n: 8, cell: 320, dur: 0.5, loop: true, hit: 0, src: 'h3d/bear_charge.webp' },
} } as const;
