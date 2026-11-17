// Ш58: drawn heroes in battle — poses cut by art/orb/heroes.py (do not edit). Body height of every pose = 360 px;
// fx / fy — the feet point as a share of the picture. Poses look right; the game mirrors them for the left side.
export interface HeroPose { w: number; h: number; fx: number; fy: number; tx: number; ty: number }
export const HERO_POSE_H = 360;
export const ORB_HERO_ART: Record<string, Record<string, HeroPose>> = {
 "apollo": {
  "idle_up": {
   "w": 282,
   "h": 375,
   "fx": 0.4344,
   "fy": 0.9973,
   "tx": 0.8546,
   "ty": 0.0533
  },
  "idle_diag": {
   "w": 339,
   "h": 380,
   "fx": 0.4499,
   "fy": 0.9974,
   "tx": 0.9764,
   "ty": 0.05
  },
  "idle_side": {
   "w": 428,
   "h": 385,
   "fx": 0.396,
   "fy": 0.9974,
   "tx": 0.9766,
   "ty": 0.0779
  },
  "cast_up": {
   "w": 335,
   "h": 396,
   "fx": 0.2119,
   "fy": 0.9975,
   "tx": 0.8746,
   "ty": 0.0
  },
  "cast_diag": {
   "w": 404,
   "h": 394,
   "fx": 0.5025,
   "fy": 0.9975,
   "tx": 0.9703,
   "ty": 0.0457
  },
  "cast_side": {
   "w": 476,
   "h": 395,
   "fx": 0.3929,
   "fy": 0.9975,
   "tx": 0.9811,
   "ty": 0.0937
  }
 },
 "skadi": {
  "idle_up": {
   "w": 300,
   "h": 390,
   "fx": 0.4067,
   "fy": 0.9974,
   "tx": 0.8667,
   "ty": 0.0
  },
  "idle_diag": {
   "w": 270,
   "h": 388,
   "fx": 0.35,
   "fy": 0.9974,
   "tx": 0.9741,
   "ty": 0.0026
  },
  "idle_side": {
   "w": 347,
   "h": 372,
   "fx": 0.3184,
   "fy": 0.9946,
   "tx": 0.9942,
   "ty": 0.2392
  },
  "cast_up": {
   "w": 375,
   "h": 410,
   "fx": 0.336,
   "fy": 0.9976,
   "tx": 0.96,
   "ty": 0.0
  },
  "cast_diag": {
   "w": 343,
   "h": 416,
   "fx": 0.4184,
   "fy": 0.9952,
   "tx": 0.9738,
   "ty": 0.0457
  },
  "cast_side": {
   "w": 422,
   "h": 391,
   "fx": 0.3803,
   "fy": 0.9949,
   "tx": 0.9953,
   "ty": 0.2506
  }
 },
 "veles": {
  "idle_up": {
   "w": 262,
   "h": 376,
   "fx": 0.3454,
   "fy": 0.9973,
   "tx": 0.9389,
   "ty": 0.008
  },
  "idle_diag": {
   "w": 262,
   "h": 376,
   "fx": 0.3454,
   "fy": 0.9973,
   "tx": 0.9427,
   "ty": 0.0106
  },
  "idle_side": {
   "w": 350,
   "h": 376,
   "fx": 0.3571,
   "fy": 0.9973,
   "tx": 0.9943,
   "ty": 0.2367
  },
  "cast_up": {
   "w": 348,
   "h": 398,
   "fx": 0.3937,
   "fy": 0.9975,
   "tx": 0.9138,
   "ty": 0.0126
  },
  "cast_diag": {
   "w": 348,
   "h": 398,
   "fx": 0.3937,
   "fy": 0.9975,
   "tx": 0.9943,
   "ty": 0.0477
  },
  "cast_side": {
   "w": 396,
   "h": 382,
   "fx": 0.3472,
   "fy": 0.9974,
   "tx": 0.9874,
   "ty": 0.1702
  }
 }
};
