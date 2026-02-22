import { Cube } from '../cube';
import { faceNames, faceNums } from '../constants';
import { buildMoveTables, buildPruningTables } from '../tables/tables';
import { SearchState } from './searchState';
import { BASE_MOVE_DATA, COMPOUND_MOVES } from '../constants';

// ── Singleton table store ─────────────────────────────────────────
let moveTables:   ReturnType<typeof buildMoveTables>   | null = null;
let pruningTables: ReturnType<typeof buildPruningTables> | null = null;
let solverReady = false;

/**
 * Pre-computes all move and pruning tables required by the solver.
 * Call once before using `solve()` or `scramble()`.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function initSolver(): void {
  if (solverReady) return;

  // 1. Populate base and compound moves
  Cube.moves = BASE_MOVE_DATA.map(raw => new Cube().fromRaw(raw));
  for (const alg of COMPOUND_MOVES) {
    const c = new Cube();
    for (const m of alg.trim().split(/\s+/)) {
      if (!m) continue;
      const face  = faceNums[m[0]];
      const power = m.length > 1 ? (m[1] === '2' ? 2 : 3) : 1;
      for (let i = 0; i < power; i++) c.multiply(Cube.moves[face]);
    }
    Cube.moves.push(c);
  }

  // 2. Build tables
  moveTables    = buildMoveTables();
  pruningTables = buildPruningTables(moveTables);
  solverReady   = true;
}

// ── Main solver ───────────────────────────────────────────────────

/**
 * Solves the given cube using Kociemba's two-phase algorithm.
 * Returns the solution move sequence, or null if no solution was found
 * within `maxDepth` moves.
 */
export function solve(cube: Cube, maxDepth = 22): string | null {
  initSolver();

  // Work in standard orientation
  const clone      = cube.clone();
  const uprightAlg = clone.upright();
  clone.move(uprightAlg);

  const rotation = Array.from(clone.center);
  const uprightSolution = _solveUpright(clone, maxDepth);
  if (uprightSolution === null) return null;

  // Translate move names back through the rotation
  return uprightSolution.trim().split(/\s+/).filter(Boolean).map(m => {
    const originalFace = rotation[faceNums[m[0]]];
    return faceNames[originalFace] + (m.length > 1 ? m[1] : '');
  }).join(' ');
}

/** Generates a random scramble sequence. */
export function scramble(length = 25): string {
  initSolver();
  const faces    = [0, 1, 2, 3, 4, 5];
  const names    = ['U', 'D', 'R', 'L', 'F', 'B'];
  const mods     = ['', "'", '2'];
  const opposite = [1, 0, 3, 2, 5, 4];

  const result: string[] = [];
  let last = -1;
  let secondLast = -1;

  while (result.length < length) {
    const available = faces.filter(f => {
      if (f === last) return false;
      if (f === opposite[last]) return false;
      if (f === secondLast && opposite[secondLast] === last) return false;
      return true;
    });

    const face = available[Math.floor(Math.random() * available.length)];
    const mod  = mods[Math.floor(Math.random() * mods.length)];
    result.push(names[face] + mod);
    secondLast = last;
    last = face;
  }

  return result.join(' ');
}

// ── Internal two-phase search ─────────────────────────────────────

function _solveUpright(cube: Cube, maxDepth: number): string | null {
  const mt = moveTables!;
  const pt = pruningTables! as unknown as Record<string, Int32Array>;

  const allMoves1 = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17];
  const allMoves2 = [0,1,2,4,7,9,10,11,13,16];

  // Pre-compute allowed-next-moves lists for each last face
  const nextMoves1: number[][] = [];
  const nextMoves2: number[][] = [];
  for (let lastFace = 0; lastFace <= 5; lastFace++) {
    const n1: number[] = [], n2: number[] = [];
    for (let face = 0; face <= 5; face++) {
      if (face !== lastFace && face !== lastFace - 3) {
        for (let p = 0; p < 3; p++) n1.push(face * 3 + p);
        for (const p of (face === 0 || face === 3 ? [0, 1, 2] : [1]))
          n2.push(face * 3 + p);
      }
    }
    nextMoves1.push(n1); nextMoves2.push(n2);
  }

  const found: { solution: string | null } = { solution: null };
  const freeStates = Array.from(
    { length: maxDepth + 1 },
    () => new SearchState().setTables(mt, pt),
  );

  const phase1 = (ss: SearchState, depth: number) => {
    if (found.solution !== null) return;
    if (depth === 0) {
      if (ss.minDist1() === 0 && (ss.lastMove === null || !allMoves2.includes(ss.lastMove))) {
        phase2search(ss);
      }
    } else if (ss.minDist1() <= depth) {
      const candidates = ss.lastMove !== null
        ? nextMoves1[Math.floor(ss.lastMove / 3)]
        : allMoves1;
      for (const move of candidates) {
        const next = freeStates.pop()!;
        next.parent   = ss;
        next.lastMove = move;
        next.depth    = ss.depth + 1;
        next.flip     = mt.flip [ss.flip ][move];
        next.twist    = mt.twist[ss.twist][move];
        next.slice    = Math.floor(mt.FRtoBR[ss.slice * 24][move] / 24);
        phase1(next, depth - 1);
        freeStates.push(next);
        if (found.solution !== null) return;
      }
    }
  };

  const phase2search = (ss: SearchState) => {
    ss.init2();
    for (let depth = 1; depth <= maxDepth - ss.depth; depth++) {
      phase2(ss, depth);
      if (found.solution !== null) return;
    }
  };

  const phase2 = (ss: SearchState, depth: number) => {
    if (found.solution !== null) return;
    if (depth === 0) {
      if (ss.minDist2() === 0) found.solution = ss.solution();
    } else if (ss.minDist2() <= depth) {
      const candidates = ss.lastMove !== null
        ? nextMoves2[Math.floor(ss.lastMove / 3)]
        : allMoves2;
      for (const move of candidates) {
        const next = freeStates.pop()!;
        next.parent    = ss;
        next.lastMove  = move;
        next.depth     = ss.depth + 1;
        next.URFtoDLF  = mt.URFtoDLF[ss.URFtoDLF][move];
        next.FRtoBR    = mt.FRtoBR  [ss.FRtoBR  ][move];
        next.parity    = mt.parity  [ss.parity  ][move];
        next.URtoDF    = mt.URtoDF  [ss.URtoDF  ][move];
        phase2(next, depth - 1);
        freeStates.push(next);
        if (found.solution !== null) return;
      }
    }
  };

  const root = freeStates.pop()!.initFromCube(cube);
  for (let depth = 1; depth <= maxDepth; depth++) {
    phase1(root, depth);
    if (found.solution !== null) break;
  }
  return found.solution !== null ? found.solution.trim() : null;
}