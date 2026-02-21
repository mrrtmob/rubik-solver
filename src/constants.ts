import { Center, Edge } from './types';

// ── Coordinate sizes ──────────────────────────────────────────────
export const N_TWIST     = 2187;
export const N_FLIP      = 2048;
export const N_PARITY    = 2;
export const N_FRtoBR   = 11880;
export const N_SLICE1    = 495;
export const N_SLICE2    = 24;
export const N_URFtoDLF = 20160;
export const N_URtoDF   = 20160;
export const N_URtoUL   = 1320;
export const N_UBtoDF   = 1320;

// ── Facelet index helpers ─────────────────────────────────────────
const _U = (x: number) => x - 1;
const _R = (x: number) => _U(9) + x;
const _F = (x: number) => _R(9) + x;
const _D = (x: number) => _F(9) + x;
const _L = (x: number) => _D(9) + x;
const _B = (x: number) => _L(9) + x;

export const centerFacelet = [4, 13, 22, 31, 40, 49];

export const cornerFacelet = [
  [_U(9), _R(1), _F(3)], [_U(7), _F(1), _L(3)], [_U(1), _L(1), _B(3)], [_U(3), _B(1), _R(3)],
  [_D(3), _F(9), _R(7)], [_D(1), _L(9), _F(7)], [_D(7), _B(9), _L(7)], [_D(9), _R(9), _B(7)],
];

export const edgeFacelet = [
  [_U(6), _R(2)], [_U(8), _F(2)], [_U(4), _L(2)], [_U(2), _B(2)],
  [_D(6), _R(8)], [_D(2), _F(8)], [_D(4), _L(8)], [_D(8), _B(8)],
  [_F(6), _R(4)], [_F(4), _L(6)], [_B(6), _L(4)], [_B(4), _R(6)],
];

export const centerColor = ['U', 'R', 'F', 'D', 'L', 'B'];

export const cornerColor = [
  ['U','R','F'], ['U','F','L'], ['U','L','B'], ['U','B','R'],
  ['D','F','R'], ['D','L','F'], ['D','B','L'], ['D','R','B'],
];

export const edgeColor = [
  ['U','R'], ['U','F'], ['U','L'], ['U','B'],
  ['D','R'], ['D','F'], ['D','L'], ['D','B'],
  ['F','R'], ['F','L'], ['B','L'], ['B','R'],
];

export const faceNames: Record<number, string> = {
  0: 'U', 1: 'R', 2: 'F', 3: 'D', 4: 'L', 5: 'B',
};

export const faceNums: Record<string, number> = {
  U: 0, R: 1, F: 2, D: 3, L: 4, B: 5,
  E: 6, M: 7, S: 8,
  x: 9, y: 10, z: 11,
  u: 12, r: 13, f: 14, d: 15, l: 16, b: 17,
};

// ── Base move definitions ─────────────────────────────────────────
export const BASE_MOVE_DATA: import('./types').CubeState[] = [
  // U
  { center:[0,1,2,3,4,5], cp:[3,0,1,2,4,5,6,7], co:[0,0,0,0,0,0,0,0], ep:[3,0,1,2,4,5,6,7,8,9,10,11], eo:[0,0,0,0,0,0,0,0,0,0,0,0] },
  // R
  { center:[0,1,2,3,4,5], cp:[4,1,2,0,7,5,6,3], co:[2,0,0,1,1,0,0,2], ep:[8,1,2,3,11,5,6,7,4,9,10,0], eo:[0,0,0,0,0,0,0,0,0,0,0,0] },
  // F
  { center:[0,1,2,3,4,5], cp:[1,5,2,3,0,4,6,7], co:[1,2,0,0,2,1,0,0], ep:[0,9,2,3,4,8,6,7,1,5,10,11], eo:[0,1,0,0,0,1,0,0,1,1,0,0] },
  // D
  { center:[0,1,2,3,4,5], cp:[0,1,2,3,5,6,7,4], co:[0,0,0,0,0,0,0,0], ep:[0,1,2,3,5,6,7,4,8,9,10,11], eo:[0,0,0,0,0,0,0,0,0,0,0,0] },
  // L
  { center:[0,1,2,3,4,5], cp:[0,2,6,3,4,1,5,7], co:[0,1,2,0,0,2,1,0], ep:[0,1,10,3,4,5,9,7,8,2,6,11], eo:[0,0,0,0,0,0,0,0,0,0,0,0] },
  // B
  { center:[0,1,2,3,4,5], cp:[0,1,3,7,4,5,2,6], co:[0,0,1,2,0,0,2,1], ep:[0,1,2,11,4,5,6,10,8,9,3,7], eo:[0,0,0,1,0,0,0,1,0,0,1,1] },
  // E
  { center:[Center.U,Center.F,Center.L,Center.D,Center.B,Center.R], cp:[0,1,2,3,4,5,6,7], co:[0,0,0,0,0,0,0,0], ep:[0,1,2,3,4,5,6,7,Edge.FL,Edge.BL,Edge.BR,Edge.FR], eo:[0,0,0,0,0,0,0,0,1,1,1,1] },
  // M
  { center:[Center.B,Center.R,Center.U,Center.F,Center.L,Center.D], cp:[0,1,2,3,4,5,6,7], co:[0,0,0,0,0,0,0,0], ep:[0,Edge.UB,2,Edge.DB,4,Edge.UF,6,Edge.DF,8,9,10,11], eo:[0,1,0,1,0,1,0,1,0,0,0,0] },
  // S
  { center:[Center.L,Center.U,Center.F,Center.R,Center.D,Center.B], cp:[0,1,2,3,4,5,6,7], co:[0,0,0,0,0,0,0,0], ep:[Edge.UL,1,Edge.DL,3,Edge.UR,5,Edge.DR,7,8,9,10,11], eo:[1,0,1,0,1,0,1,0,0,0,0,0] },
];

// Compound rotation/wide-move recipes (index 9..17 → x y z u r f d l b)
export const COMPOUND_MOVES: string[] = [
  "R M' L'", // x  (9)
  "U E' D'", // y  (10)
  "F S B'",  // z  (11)
  "U E'",    // u  (12)
  "R M'",    // r  (13)
  "F S",     // f  (14)
  "D E",     // d  (15)
  "L M",     // l  (16)
  "B S'",    // b  (17)
];

export const PARITY_TABLE = [
  [1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1],
  [0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],
];
