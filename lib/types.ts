export type Wind = "E" | "S" | "W" | "N";

export type Meld = {
  kind: "chow" | "pung" | "kong";
  tiles: string[];
  open: boolean;
};

export type WinFlags = {
  tenpai: boolean;
  ippatsu: boolean;
  tianTing: boolean;
  haitei: boolean;
  houtei: boolean;
  huaShang: boolean;
  gangShang: boolean;
  gangShangGang: 0 | 1 | 2;
  qiangGang: boolean;
  qiangGangGang: boolean;
  tianHu: boolean;
  diHu: boolean;
  renHu: boolean;
  wallLeft: number;
};

export type Special =
  | { kind: "ligu"; pairs: string[]; baFei: boolean }
  | { kind: "yao"; pair: string; singles: string[]; extra: Meld }
  | {
      kind: "budai";
      pair: string;
      honors: string[];
      cols: string[][];
      bonus: "none" | "xiang" | "long";
    };

/** A finished winning hand. Concealed groups are already split. */
export type Hand = {
  melds: Meld[];
  pair: string;
  flowers: string[];
  seat: Wind;
  round: Wind;
  dealer: boolean;
  winTile: string;
  winBy: "zimo" | "ron";
  /** Meld index the winning tile belongs to, or the pair. */
  winAt: number | "pair";
  flags: WinFlags;
  special?: Special;
  source?: string;
};

export type Line = { name: string; fan: number; why: string };

export function blankFlags(wallLeft = -1): WinFlags {
  return {
    tenpai: false,
    ippatsu: false,
    tianTing: false,
    haitei: false,
    houtei: false,
    huaShang: false,
    gangShang: false,
    gangShangGang: 0,
    qiangGang: false,
    qiangGangGang: false,
    tianHu: false,
    diHu: false,
    renHu: false,
    wallLeft,
  };
}
