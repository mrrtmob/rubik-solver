import { Cube } from '../cube';
import { N_SLICE1, N_SLICE2, N_PARITY } from '../constants';
import { pruning } from '../tables/tables';

const moveNames = [
  'U', 'U2', "U'",
  'R', 'R2', "R'",
  'F', 'F2', "F'",
  'D', 'D2', "D'",
  'L', 'L2', "L'",
  'B', 'B2', "B'",
];

export class SearchState {
  public parent:   SearchState | null = null;
  public lastMove: number | null      = null;
  public depth                        = 0;

  public flip      = 0;
  public twist     = 0;
  public slice     = 0;
  public parity    = 0;
  public URFtoDLF  = 0;
  public FRtoBR    = 0;
  public URtoUL    = 0;
  public UBtoDF    = 0;
  public URtoDF    = 0;

  private pt!: Record<string, Int32Array>;
  private mt!: Record<string, any>;

  setTables(mt: Record<string, any>, pt: Record<string, Int32Array>): this {
    this.mt = mt; this.pt = pt; return this;
  }

  initFromCube(c: Cube): this {
    this.flip      = c.flip()      as number;
    this.twist     = c.twist()     as number;
    this.slice     = Math.floor(c.FRtoBR()! / 24);
    this.parity    = c.cornerParity();
    this.URFtoDLF  = c.URFtoDLF();
    this.FRtoBR    = c.FRtoBR();
    this.URtoUL    = c.URtoUL();
    this.UBtoDF    = c.UBtoDF();
    return this;
  }

  solution(): string {
    return this.parent
      ? this.parent.solution() + moveNames[this.lastMove!] + ' '
      : '';
  }

  minDist1(): number {
    return Math.max(
      pruning(this.pt.sliceFlip,  N_SLICE1 * this.flip  + this.slice),
      pruning(this.pt.sliceTwist, N_SLICE1 * this.twist + this.slice),
    );
  }

  minDist2(): number {
    const idx1 = (N_SLICE2 * this.URtoDF   + this.FRtoBR) * N_PARITY + this.parity;
    const idx2 = (N_SLICE2 * this.URFtoDLF + this.FRtoBR) * N_PARITY + this.parity;
    return Math.max(
      pruning(this.pt.sliceURtoDFParity,    idx1),
      pruning(this.pt.sliceURFtoDLFParity,  idx2),
    );
  }

  /** Propagate Phase-2 coordinates down the parent chain. */
  init2(top = true): void {
    if (!this.parent) return;
    this.parent.init2(false);
    const m = this.lastMove!;
    this.URFtoDLF = this.mt.URFtoDLF[this.parent.URFtoDLF][m];
    this.FRtoBR   = this.mt.FRtoBR  [this.parent.FRtoBR  ][m];
    this.parity   = this.mt.parity  [this.parent.parity  ][m];
    this.URtoUL   = this.mt.URtoUL  [this.parent.URtoUL  ][m];
    this.UBtoDF   = this.mt.UBtoDF  [this.parent.UBtoDF  ][m];
    if (top) this.URtoDF = this.mt.mergeURtoDF[this.URtoUL][this.UBtoDF];
  }
}
