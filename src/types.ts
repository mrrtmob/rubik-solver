export enum Center { U, R, F, D, L, B }
export enum Corner { URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB }
export enum Edge { UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR }

export interface CubeState {
  center: number[];
  cp: number[];
  co: number[];
  ep: number[];
  eo: number[];
}
