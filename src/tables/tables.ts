import { Cube } from '../cube';
import {
  N_TWIST, N_FLIP, N_FRtoBR, N_URFtoDLF, N_URtoDF, N_URtoUL, N_UBtoDF,
  N_SLICE1, N_SLICE2, N_PARITY, PARITY_TABLE,
} from '../constants';
import { Edge } from '../types';

// ── Shared pruning read/write helper ─────────────────────────────
export function pruning(table: Int32Array, index: number, value?: number): number {
  const pos   = index % 8;
  const slot  = index >> 3;
  const shift = pos << 2;
  if (value !== undefined) {
    table[slot] &= ~(0xF << shift);
    table[slot] |= value << shift;
    return value;
  }
  return (table[slot] & (0xF << shift)) >>> shift;
}

// ── Move tables ───────────────────────────────────────────────────

type MoveTableContext = 'corners' | 'edges';

function computeMoveTable(
  context: MoveTableContext,
  coordMethod: string,
  size: number,
): number[][] {
  const table: number[][] = [];
  const c = new Cube();
  for (let i = 0; i < size; i++) {
    (c as any)[coordMethod](i);
    const inner: number[] = [];
    for (let j = 0; j < 6; j++) {
      for (let k = 0; k < 3; k++) {
        if (context === 'corners') c.cornerMultiply(Cube.moves[j]);
        else c.edgeMultiply(Cube.moves[j]);
        inner.push((c as any)[coordMethod]());
      }
      if (context === 'corners') c.cornerMultiply(Cube.moves[j]);
      else c.edgeMultiply(Cube.moves[j]);
    }
    table.push(inner);
  }
  return table;
}

function computeMergeURtoDF(): number[][] {
  const table: number[][] = [];
  const a = new Cube(), b = new Cube();
  for (let i = 0; i < 336; i++) {
    table[i] = [];
    for (let j = 0; j < 336; j++) {
      a.URtoUL(i); b.UBtoDF(j);
      let collision = false;
      for (let k = 0; k < 8; k++) {
        if (a.ep[k] !== -1) {
          if (b.ep[k] !== -1) { collision = true; break; }
          else b.ep[k] = a.ep[k];
        }
      }
      table[i][j] = collision ? -1 : b.URtoDF();
    }
  }
  return table;
}

export function buildMoveTables() {
  return {
    parity:    PARITY_TABLE,
    twist:     computeMoveTable('corners', 'twist',     N_TWIST),
    flip:      computeMoveTable('edges',   'flip',      N_FLIP),
    FRtoBR:    computeMoveTable('edges',   'FRtoBR',    N_FRtoBR),
    URFtoDLF:  computeMoveTable('corners', 'URFtoDLF',  N_URFtoDLF),
    URtoDF:    computeMoveTable('edges',   'URtoDF',    N_URtoDF),
    URtoUL:    computeMoveTable('edges',   'URtoUL',    N_URtoUL),
    UBtoDF:    computeMoveTable('edges',   'UBtoDF',    N_UBtoDF),
    mergeURtoDF: computeMergeURtoDF(),
  };
}

// ── Pruning tables ────────────────────────────────────────────────

function computePruningTable(
  phase: number,
  size: number,
  moveTables: ReturnType<typeof buildMoveTables>,
  currentCoords: (i: number) => number[],
  nextIndex: (cur: number[], m: number) => number,
): Int32Array {
  const table   = new Int32Array(Math.ceil(size / 8)).fill(0xFFFFFFFF);
  const moves   = phase === 1
    ? [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]
    : [0,1,2,4,7,9,10,11,13,16];
  let depth = 0;
  pruning(table, 0, depth);
  let done = 1;

  while (done !== size) {
    for (let index = 0; index < size; index++) {
      if (pruning(table, index) === depth) {
        const current = currentCoords(index);
        for (const move of moves) {
          const next = nextIndex(current, move);
          if (pruning(table, next) === 0xF) {
            pruning(table, next, depth + 1);
            done++;
          }
        }
      }
    }
    depth++;
  }
  return table;
}

export function buildPruningTables(mt: ReturnType<typeof buildMoveTables>) {
  const sliceTwist = computePruningTable(
    1, N_SLICE1 * N_TWIST, mt,
    i => [i % N_SLICE1, Math.floor(i / N_SLICE1)],
    (cur, m) => mt.twist[cur[1]][m] * N_SLICE1 + Math.floor(mt.FRtoBR[cur[0] * 24][m] / 24),
  );

  const sliceFlip = computePruningTable(
    1, N_SLICE1 * N_FLIP, mt,
    i => [i % N_SLICE1, Math.floor(i / N_SLICE1)],
    (cur, m) => mt.flip[cur[1]][m] * N_SLICE1 + Math.floor(mt.FRtoBR[cur[0] * 24][m] / 24),
  );

  const sliceURFtoDLFParity = computePruningTable(
    2, N_SLICE2 * N_URFtoDLF * N_PARITY, mt,
    i => [i % 2, Math.floor(i / 2) % N_SLICE2, Math.floor(i / (2 * N_SLICE2))],
    (cur, m) => (mt.URFtoDLF[cur[2]][m] * N_SLICE2 + mt.FRtoBR[cur[1]][m]) * 2 + mt.parity[cur[0]][m],
  );

  const sliceURtoDFParity = computePruningTable(
    2, N_SLICE2 * N_URtoDF * N_PARITY, mt,
    i => [i % 2, Math.floor(i / 2) % N_SLICE2, Math.floor(i / (2 * N_SLICE2))],
    (cur, m) => (mt.URtoDF[cur[2]][m] * N_SLICE2 + mt.FRtoBR[cur[1]][m]) * 2 + mt.parity[cur[0]][m],
  );

  return { sliceTwist, sliceFlip, sliceURFtoDLFParity, sliceURtoDFParity };
}
