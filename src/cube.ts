import { CubeState, Center, Corner, Edge } from './types';
import {
  centerColor, cornerColor, cornerFacelet, edgeColor, edgeFacelet,
  faceNums, faceNames,
} from './constants';
import { Cnk, factorial, rotateLeft, rotateRight } from './math';

export class Cube {
  public center = new Int8Array([0, 1, 2, 3, 4, 5]);
  public cp     = new Int8Array([0, 1, 2, 3, 4, 5, 6, 7]);
  public co     = new Int8Array(8);
  public ep     = new Int8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  public eo     = new Int8Array(12);

  private newCenter = new Int8Array(6);
  private newCp     = new Int8Array(8);
  private newEp     = new Int8Array(12);
  private newCo     = new Int8Array(8);
  private newEo     = new Int8Array(12);

  // ── Static move registry (populated by initSolver) ──────────────
  public static moves: Cube[] = [];

  // ── Construction ─────────────────────────────────────────────────

  public clone(): Cube {
    const c = new Cube();
    c.center.set(this.center); c.cp.set(this.cp); c.co.set(this.co);
    c.ep.set(this.ep); c.eo.set(this.eo);
    return c;
  }

  public fromRaw(raw: CubeState): this {
    this.center.set(raw.center);
    this.cp.set(raw.cp); this.co.set(raw.co);
    this.ep.set(raw.ep); this.eo.set(raw.eo);
    return this;
  }

  public toJSON(): CubeState {
    return {
      center: Array.from(this.center),
      cp:     Array.from(this.cp),
      co:     Array.from(this.co),
      ep:     Array.from(this.ep),
      eo:     Array.from(this.eo),
    };
  }

  // ── String serialization ─────────────────────────────────────────

  /**
   * Returns the 54-character facelet string (U face first, then R F D L B).
   */
  public asString(): string {
    const result = new Array(54);
    for (let i = 0; i < 6; i++) result[9 * i + 4] = centerColor[this.center[i]];
    for (let i = 0; i < 8; i++) {
      const corner = this.cp[i], ori = this.co[i];
      for (let n = 0; n < 3; n++)
        result[cornerFacelet[i][(n + ori) % 3]] = cornerColor[corner][n];
    }
    for (let i = 0; i < 12; i++) {
      const edge = this.ep[i], ori = this.eo[i];
      for (let n = 0; n < 2; n++)
        result[edgeFacelet[i][(n + ori) % 2]] = edgeColor[edge][n];
    }
    return result.join('');
  }

  public static fromString(str: string): Cube {
    const cube = new Cube();
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++)
        if (str[9 * i + 4] === centerColor[j]) cube.center[i] = j;

    for (let i = 0; i < 8; i++) {
      let ori = 0;
      for (; ori < 3; ori++)
        if (str[cornerFacelet[i][ori]] === 'U' || str[cornerFacelet[i][ori]] === 'D') break;
      const col1 = str[cornerFacelet[i][(ori + 1) % 3]];
      const col2 = str[cornerFacelet[i][(ori + 2) % 3]];
      for (let j = 0; j < 8; j++)
        if (col1 === cornerColor[j][1] && col2 === cornerColor[j][2]) {
          cube.cp[i] = j; cube.co[i] = ori % 3;
        }
    }

    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 12; j++) {
        if (str[edgeFacelet[i][0]] === edgeColor[j][0] && str[edgeFacelet[i][1]] === edgeColor[j][1]) {
          cube.ep[i] = j; cube.eo[i] = 0; break;
        }
        if (str[edgeFacelet[i][0]] === edgeColor[j][1] && str[edgeFacelet[i][1]] === edgeColor[j][0]) {
          cube.ep[i] = j; cube.eo[i] = 1; break;
        }
      }
    }
    return cube;
  }

  // ── Multiplication ────────────────────────────────────────────────

  public centerMultiply(other: Cube): void {
    for (let to = 0; to < 6; to++) this.newCenter[to] = this.center[other.center[to]];
    this.center.set(this.newCenter);
  }

  public cornerMultiply(other: Cube): void {
    for (let to = 0; to < 8; to++) {
      const from = other.cp[to];
      this.newCp[to] = this.cp[from];
      this.newCo[to] = (this.co[from] + other.co[to]) % 3;
    }
    this.cp.set(this.newCp); this.co.set(this.newCo);
  }

  public edgeMultiply(other: Cube): void {
    for (let to = 0; to < 12; to++) {
      const from = other.ep[to];
      this.newEp[to] = this.ep[from];
      this.newEo[to] = (this.eo[from] + other.eo[to]) % 2;
    }
    this.ep.set(this.newEp); this.eo.set(this.newEo);
  }

  public multiply(other: Cube): void {
    this.centerMultiply(other);
    this.cornerMultiply(other);
    this.edgeMultiply(other);
  }

  // ── Move application ──────────────────────────────────────────────

  /**
   * Apply an algorithm string, e.g. "R U R' U'".
   * Supports U R F D L B, E M S, x y z, u r f d l b.
   */
  public move(alg: string): this {
    for (const m of alg.trim().split(/\s+/)) {
      if (!m) continue;
      const face = faceNums[m[0]];
      if (face === undefined) throw new Error(`Invalid move: ${m}`);
      let power: number;
      if (m.length === 1) power = 0;
      else if (m[1] === '2') power = 1;
      else if (m[1] === "'") power = 2;
      else throw new Error(`Invalid move: ${m}`);
      for (let i = 0; i <= power; i++) this.multiply(Cube.moves[face]);
    }
    return this;
  }

  // ── Upright rotation ──────────────────────────────────────────────

  /**
   * Returns a rotation sequence (x/y/z) that puts the cube in standard
   * orientation (F center facing front, U center on top).
   */
  public upright(): string {
    const clone = this.clone();
    const result: string[] = [];

    let i = 0;
    for (; i < 6; i++) if (clone.center[i] === Center.F) break;
    const rot1 = (
      i === Center.D ? 'x'  :
      i === Center.U ? "x'" :
      i === Center.B ? 'x2' :
      i === Center.R ? 'y'  :
      i === Center.L ? "y'" : ''
    );
    if (rot1) { result.push(rot1); clone.move(rot1); }

    let j = 0;
    for (; j < 6; j++) if (clone.center[j] === Center.U) break;
    const rot2 = (
      j === Center.L ? 'z'  :
      j === Center.R ? "z'" :
      j === Center.D ? 'z2' : ''
    );
    if (rot2) result.push(rot2);

    return result.join(' ');
  }

  // ── Solved check ──────────────────────────────────────────────────

  /**
   * Verifies the cube state is mathematically valid.
   * Returns true if valid, or an error message string if not.
   */
  public verify(): true | string {
    // Check all corners are present and unique
    const cornerCount = new Int8Array(8);
    for (let i = 0; i < 8; i++) {
      if (this.cp[i] === -1) return 'Invalid cube: Unrecognized or missing corners.';
      cornerCount[this.cp[i]]++;
    }
    for (let i = 0; i < 8; i++)
      if (cornerCount[i] !== 1) return 'Invalid cube: Duplicate corner detected.';

    // Check all edges are present and unique
    const edgeCount = new Int8Array(12);
    for (let i = 0; i < 12; i++) {
      if (this.ep[i] === -1) return 'Invalid cube: Unrecognized or missing edges.';
      edgeCount[this.ep[i]]++;
    }
    for (let i = 0; i < 12; i++)
      if (edgeCount[i] !== 1) return 'Invalid cube: Duplicate edge detected.';

    // Corner orientation sum must be divisible by 3
    let twistSum = 0;
    for (let i = 0; i < 8; i++) twistSum += this.co[i];
    if (twistSum % 3 !== 0)
      return 'Invalid cube: Corner twist error (1 corner needs twisting).';

    // Edge orientation sum must be divisible by 2
    let flipSum = 0;
    for (let i = 0; i < 12; i++) flipSum += this.eo[i];
    if (flipSum % 2 !== 0)
      return 'Invalid cube: Edge flip error (1 edge needs flipping).';

    // Corner and edge permutation parities must match
    if (this.cornerParity() !== this.edgeParity())
      return 'Invalid cube: Parity error (2 edges or 2 corners need swapping).';

    return true;
  }

  public isSolved(): boolean {
    const clone = this.clone();
    clone.move(clone.upright());
    for (let i = 0; i < 6; i++)  if (clone.center[i] !== i) return false;
    for (let i = 0; i < 8; i++)  if (clone.cp[i] !== i || clone.co[i] !== 0) return false;
    for (let i = 0; i < 12; i++) if (clone.ep[i] !== i || clone.eo[i] !== 0) return false;
    return true;
  }

  // ── Randomization ─────────────────────────────────────────────────

  public randomize(): this {
    const randint = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
    const shuffle = (arr: Int8Array) => {
      let cur = arr.length;
      while (cur--) {
        const r = randint(0, cur);
        const tmp = arr[cur]; arr[cur] = arr[r]; arr[r] = tmp;
      }
    };
    const swaps = (arr: Int8Array) => {
      let n = 0; const seen = new Array(arr.length).fill(false);
      while (true) {
        let cur = -1;
        for (let i = 0; i < arr.length; i++) if (!seen[i]) { cur = i; break; }
        if (cur === -1) break;
        let len = 0;
        while (!seen[cur]) { seen[cur] = true; len++; cur = arr[cur]; }
        n += len + 1;
      }
      return n;
    };
    const randOri = (arr: Int8Array, mod: number) => {
      for (let i = 0; i < arr.length; i++) arr[i] = randint(0, mod - 1);
    };
    const validOri = (arr: Int8Array, mod: number) =>
      Array.from(arr).reduce((a, b) => a + b, 0) % mod === 0;

    shuffle(this.ep); shuffle(this.cp);
    while ((swaps(this.ep) + swaps(this.cp)) % 2 !== 0) { shuffle(this.ep); shuffle(this.cp); }

    randOri(this.co, 3); while (!validOri(this.co, 3)) randOri(this.co, 3);
    randOri(this.eo, 2); while (!validOri(this.eo, 2)) randOri(this.eo, 2);
    return this;
  }

  public static random(): Cube { return new Cube().randomize(); }

  // ── Algorithm helpers ─────────────────────────────────────────────

  public static inverse(alg: string): string {
    return alg.trim().split(/\s+/).filter(Boolean).map(m => {
      const f = m[0];
      if (m.length === 1)  return f + "'";
      if (m[1] === '2')    return f + '2';
      if (m[1] === "'")    return f;
      throw new Error(`Invalid move: ${m}`);
    }).reverse().join(' ');
  }

  // ── Coordinates (Phase 1 & 2) ─────────────────────────────────────

  public twist(val?: number): number | void {
    if (val !== undefined) {
      let parity = 0;
      for (let i = 6; i >= 0; i--) {
        const ori = val % 3; val = Math.floor(val / 3);
        this.co[i] = ori; parity += ori;
      }
      this.co[7] = (3 - parity % 3) % 3;
    } else {
      let v = 0;
      for (let i = 0; i <= 6; i++) v = 3 * v + this.co[i];
      return v;
    }
  }

  public flip(val?: number): number | void {
    if (val !== undefined) {
      let parity = 0;
      for (let i = 10; i >= 0; i--) {
        const ori = val % 2; val = Math.floor(val / 2);
        this.eo[i] = ori; parity += ori;
      }
      this.eo[11] = (2 - parity % 2) % 2;
    } else {
      let v = 0;
      for (let i = 0; i <= 10; i++) v = 2 * v + this.eo[i];
      return v;
    }
  }

  public cornerParity(): number {
    let s = 0;
    for (let i = Corner.DRB; i >= Corner.URF + 1; i--)
      for (let j = i - 1; j >= Corner.URF; j--)
        if (this.cp[j] > this.cp[i]) s++;
    return s % 2;
  }

  public edgeParity(): number {
    let s = 0;
    for (let i = Edge.BR; i >= Edge.UR + 1; i--)
      for (let j = i - 1; j >= Edge.UR; j--)
        if (this.ep[j] > this.ep[i]) s++;
    return s % 2;
  }

  public permutationIndex(
    context: 'corners' | 'edges',
    start: number,
    end: number,
    fromEnd: boolean,
    index?: number,
  ): number {
    const maxOur = end - start;
    const maxB = factorial(maxOur + 1);
    const maxAll = context === 'corners' ? 7 : 11;
    const permArray = context === 'corners' ? this.cp : this.ep;
    const our = new Int8Array(maxOur + 1);

    if (index !== undefined) {
      for (let i = 0; i <= maxOur; i++) our[i] = i + start;
      let b = index % maxB;
      let a = Math.floor(index / maxB);
      permArray.fill(-1);

      for (let j = 1; j <= maxOur; j++) {
        let k = b % (j + 1); b = Math.floor(b / (j + 1));
        while (k-- > 0) rotateRight(our, 0, j);
      }
      let x = maxOur;
      if (fromEnd) {
        for (let j = 0; j <= maxAll; j++) {
          const c = Cnk(maxAll - j, x + 1);
          if (a - c >= 0) { permArray[j] = our[maxOur - x]; a -= c; x--; }
        }
      } else {
        for (let j = maxAll; j >= 0; j--) {
          const c = Cnk(j, x + 1);
          if (a - c >= 0) { permArray[j] = our[x]; a -= c; x--; }
        }
      }
      return index;
    } else {
      our.fill(-1);
      let a = 0, b = 0, x = 0;
      if (fromEnd) {
        for (let j = maxAll; j >= 0; j--) {
          if (start <= permArray[j] && permArray[j] <= end) {
            a += Cnk(maxAll - j, x + 1); our[maxOur - x] = permArray[j]; x++;
          }
        }
      } else {
        for (let j = 0; j <= maxAll; j++) {
          if (start <= permArray[j] && permArray[j] <= end) {
            a += Cnk(j, x + 1); our[x] = permArray[j]; x++;
          }
        }
      }
      for (let j = maxOur; j >= 0; j--) {
        let k = 0;
        while (our[j] !== start + j) { rotateLeft(our, 0, j); k++; }
        b = (j + 1) * b + k;
      }
      return a * maxB + b;
    }
  }

  public URFtoDLF(idx?: number): number { return this.permutationIndex('corners', Corner.URF, Corner.DLF, false, idx); }
  public URtoUL(idx?: number):   number { return this.permutationIndex('edges',   Edge.UR,    Edge.UL,    false, idx); }
  public UBtoDF(idx?: number):   number { return this.permutationIndex('edges',   Edge.UB,    Edge.DF,    false, idx); }
  public URtoDF(idx?: number):   number { return this.permutationIndex('edges',   Edge.UR,    Edge.DF,    false, idx); }
  public FRtoBR(idx?: number):   number { return this.permutationIndex('edges',   Edge.FR,    Edge.BR,    true,  idx); }
}