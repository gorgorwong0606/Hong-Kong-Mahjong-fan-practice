import { blankFlags, type Hand, type Meld, type Wind, type WinFlags } from "./types";
import { GRASSES, SEASONS, isHonor, isSuit, rank, suitOf } from "./tiles";
import { scoreHand } from "./score";

const WINDS: Wind[] = ["E", "S", "W", "N"];
const SUITS = ["m", "p", "s"] as const;
const HONORS = ["E", "S", "W", "N", "C", "F", "B"] as const;
const DRAGONS = ["C", "F", "B"] as const;
type Suit = (typeof SUITS)[number];

type Spec =
  | { k: "c"; suit: Suit; start: number }
  | { k: "p"; tile: string }
  | { k: "g"; tile: string };

type OpenMode = "closed" | "some" | "many" | "most" | "all";
type FlowerPick = "random" | "none" | "red" | "both" | "season" | "grass";

type FillOpt = {
  noLao?: boolean;
  noBro?: boolean;
  suits?: Suit[];
  ranks?: number[];
  honors?: boolean;
  chowBias?: number;
  reservePair?: string;
  forbid?: (spec: Spec, existing: Spec[]) => boolean;
};

type Mode = {
  source: string;
  ryanmen?: boolean;
  pairWait?: boolean;
  pair?: string;
  pairOk?: (tile: string) => boolean;
  ranks?: number[];
  open?: OpenMode;
  flowers?: FlowerPick;
  winBy?: "zimo" | "ron" | "either";
  tenpai?: number;
  flags?: Partial<WinFlags>;
  seat?: Wind;
  dealer?: boolean;
  winIndex?: number;
  winTile?: string;
};

function pick<T>(a: readonly T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}
function chance(p: number) {
  return Math.random() < p;
}
function ri(n: number) {
  return Math.floor(Math.random() * n);
}
function shuffle<T>(a: readonly T[]): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = ri(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function chow(a: string, b: string, c: string, open = false): Meld {
  const tiles = [a, b, c].sort();
  return { kind: "chow", tiles, open };
}
function pung(t: string, open = false): Meld {
  return { kind: "pung", tiles: [t, t, t], open };
}
function kong(t: string, open = false): Meld {
  return { kind: "kong", tiles: [t, t, t, t], open };
}
function tile(suit: Suit, n: number) {
  return `${n}${suit}`;
}
function ctx() {
  return { seat: pick(WINDS), round: pick(WINDS), dealer: chance(0.28) };
}
function flowers(n: number) {
  const all = [...SEASONS, ...GRASSES];
  for (let i = all.length - 1; i > 0; i--) {
    const j = ri(i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, n);
}
function maybeTenpai(h: Hand, p = 0.4) {
  if (chance(p)) {
    h.flags.tenpai = true;
    if (chance(0.45)) h.flags.ippatsu = true;
  }
}
function rollWall(): number {
  const r = Math.random();
  if (r < 0.12) return 1 + ri(7);
  if (r < 0.22) return 8 + ri(3);
  return 11 + ri(32);
}
function shell(partial: Omit<Hand, "flowers" | "flags"> & { flowers?: string[]; flags?: Hand["flags"] }): Hand {
  const h: Hand = { flowers: [], flags: blankFlags(), ...partial };
  if (h.flags.wallLeft < 0) h.flags.wallLeft = rollWall();
  return h;
}

const ALL_TILES = [
  ...SUITS.flatMap((s) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => tile(s, n))),
  ...HONORS,
];

function tally(specs: Spec[], pair?: string): Map<string, number> | null {
  const m = new Map<string, number>();
  const add = (id: string, n: number) => {
    const v = (m.get(id) ?? 0) + n;
    if (v > 4) return false;
    m.set(id, v);
    return true;
  };
  for (const s of specs) {
    if (s.k === "c") {
      for (let i = 0; i < 3; i++) if (!add(tile(s.suit, s.start + i), 1)) return null;
    } else if (!add(s.tile, s.k === "g" ? 4 : 3)) return null;
  }
  if (pair && !add(pair, 2)) return null;
  return m;
}

function startsOf(specs: Spec[], suit: Suit) {
  const s = new Set<number>();
  for (const spec of specs) if (spec.k === "c" && spec.suit === suit) s.add(spec.start);
  return s;
}
function isLao(specs: Spec[], suit: Suit) {
  const s = startsOf(specs, suit);
  return s.has(1) && s.has(7) && !s.has(4);
}
function createsLao(existing: Spec[], spec: Spec) {
  if (spec.k !== "c") return false;
  if (isLao(existing, spec.suit)) return false;
  return isLao([...existing, spec], spec.suit);
}
function createsBro(existing: Spec[], spec: Spec) {
  if (spec.k === "c" || !isSuit(spec.tile)) return false;
  const r = rank(spec.tile);
  const suit = suitOf(spec.tile);
  return existing.some((other) => other.k !== "c" && isSuit(other.tile) && rank(other.tile) === r && suitOf(other.tile) !== suit);
}
function allowHonors(opt: FillOpt) {
  if (opt.honors !== undefined) return opt.honors;
  return !opt.suits;
}
function hasYiBu(specs: Spec[]) {
  const s = new Set(specs.filter((x) => x.k === "c").map((x) => x.start));
  return [1, 3, 5, 7].every((n) => s.has(n));
}

function candidates(existing: Spec[], opt: FillOpt, kind: "c" | "p" | "g"): Spec[] {
  const out: Spec[] = [];
  const suits = opt.suits ?? [...SUITS];
  const push = (spec: Spec) => {
    if (!tally([...existing, spec], opt.reservePair)) return;
    if (opt.noLao && createsLao(existing, spec)) return;
    if (opt.noBro && createsBro(existing, spec)) return;
    if (opt.forbid?.(spec, existing)) return;
    out.push(spec);
  };
  if (kind === "c") {
    for (const suit of suits) {
      for (let start = 1; start <= 7; start++) {
        const seq = [start, start + 1, start + 2];
        if (opt.ranks && !seq.every((n) => opt.ranks!.includes(n))) continue;
        push({ k: "c", suit, start });
      }
    }
    return out;
  }
  for (const suit of suits) {
    for (let n = 1; n <= 9; n++) {
      if (opt.ranks && !opt.ranks.includes(n)) continue;
      push({ k: kind, tile: tile(suit, n) });
    }
  }
  if (allowHonors(opt)) for (const id of HONORS) push({ k: kind, tile: id });
  return out;
}

function tryAdd(existing: Spec[], opt: FillOpt): Spec | null {
  const bias = opt.chowBias ?? 0.62;
  const first: "c" | "p" | "g" = Math.random() < bias ? "c" : Math.random() < 0.8 ? "p" : "g";
  const order = [first, ...(["c", "p", "g"] as const).filter((k) => k !== first)];
  for (const kind of order) {
    const found = candidates(existing, opt, kind);
    if (found.length) return pick(found);
  }
  return null;
}

function fill(base: Spec[], n: number, opt: FillOpt = {}): Spec[] | null {
  if (!tally(base, opt.reservePair)) return null;
  if (n <= 0) return [...base];
  const out = [...base];
  while (out.length < base.length + n) {
    const spec = tryAdd(out, opt);
    if (!spec) return null;
    out.push(spec);
  }
  return out;
}

function ryanmenRanks(start: number): number[] {
  if (start === 1) return [1];
  if (start === 7) return [9];
  return [start, start + 2];
}

function legalPairs(specs: Spec[], mode: Mode): string[] {
  if (mode.pair) return tally(specs, mode.pair) ? [mode.pair] : [];
  let pool = ALL_TILES.filter((id) => tally(specs, id));
  if (mode.ranks) pool = pool.filter((id) => isSuit(id) && mode.ranks!.includes(rank(id)));
  if (mode.pairOk) pool = pool.filter(mode.pairOk);
  return pool;
}

function defaultOpen(): OpenMode {
  const r = Math.random();
  if (r < 0.36) return "closed";
  if (r < 0.74) return "some";
  if (r < 0.92) return "many";
  return "most";
}

function applyOpens(melds: Meld[], winAt: number | "pair", open: OpenMode) {
  const idx = melds.map((_, i) => i).filter((i) => i !== winAt);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = ri(i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  let n = 0;
  if (open === "closed") n = 0;
  else if (open === "all") n = idx.length;
  else if (open === "some") n = Math.min(idx.length, 1 + (chance(0.45) ? 1 : 0));
  else if (open === "many") n = Math.min(idx.length, 2 + ri(2));
  else n = Math.min(idx.length, 3 + ri(2));
  for (let k = 0; k < n; k++) melds[idx[k]].open = true;
}

function pickFlowers(kind: FlowerPick): string[] {
  if (kind === "none") return [];
  if (kind === "red") return [pick(SEASONS)];
  if (kind === "both") return [pick(SEASONS), pick(GRASSES)];
  if (kind === "season") return [...SEASONS];
  if (kind === "grass") return [...GRASSES];
  const r = Math.random();
  if (r < 0.3) return [];
  if (r < 0.38) return [...SEASONS];
  if (r < 0.44) return [...GRASSES];
  if (r < 0.52) return [pick(SEASONS), pick(GRASSES)];
  return flowers(1 + ri(3));
}

function toMelds(specs: Spec[]): Meld[] {
  return specs.map((s) => {
    if (s.k === "c") return chow(tile(s.suit, s.start), tile(s.suit, s.start + 1), tile(s.suit, s.start + 2));
    if (s.k === "g") return kong(s.tile);
    return pung(s.tile);
  });
}

function finish(specs: Spec[], mode: Mode): Hand | null {
  if (specs.length !== 5 || !tally(specs)) return null;
  const pairs = legalPairs(specs, mode);
  if (!pairs.length) return null;
  const pair = mode.pair ?? pick(pairs);
  const melds = toMelds(specs);

  let winAt: number | "pair";
  let winTile: string;
  if (mode.pairWait) {
    winAt = "pair";
    winTile = pair;
  } else if (mode.winIndex !== undefined) {
    const m = melds[mode.winIndex];
    if (!m) return null;
    winAt = mode.winIndex;
    winTile = mode.winTile ?? (m.kind === "chow" ? pick(m.tiles) : m.tiles[0]);
    if (!m.tiles.includes(winTile)) return null;
  } else if (mode.ryanmen) {
    const opts: { i: number; id: string }[] = [];
    specs.forEach((s, i) => {
      if (s.k !== "c") return;
      for (const n of ryanmenRanks(s.start)) opts.push({ i, id: tile(s.suit, n) });
    });
    if (!opts.length) return null;
    const w = pick(opts);
    winAt = w.i;
    winTile = w.id;
  } else {
    const i = ri(melds.length);
    const m = melds[i];
    winAt = i;
    winTile = m.kind === "chow" ? pick(m.tiles) : m.tiles[0];
  }

  applyOpens(melds, winAt, mode.open ?? defaultOpen());
  const c = ctx();
  const winBy = !mode.winBy || mode.winBy === "either" ? (chance(0.46) ? "zimo" : "ron") : mode.winBy;
  const h = shell({
    seat: mode.seat ?? c.seat,
    round: c.round,
    dealer: mode.dealer ?? c.dealer,
    source: mode.source,
    melds,
    pair,
    winTile,
    winBy,
    winAt,
    flowers: pickFlowers(mode.flowers ?? "random"),
    flags: { ...blankFlags(), ...mode.flags },
  });
  if (mode.tenpai && chance(mode.tenpai)) {
    h.flags.tenpai = true;
    if (chance(0.45)) h.flags.ippatsu = true;
  }
  return validateHand(h) ? null : h;
}

function capSame(suit: Suit, start: number, max: number) {
  return (spec: Spec, existing: Spec[]) =>
    spec.k === "c" && spec.suit === suit && spec.start === start && existing.filter((s) => s.k === "c" && s.suit === suit && s.start === start).length >= max;
}

function distribute(total: number, maxPer: number): number[] | null {
  const opts: number[][] = [];
  for (let a = 0; a <= maxPer; a++) {
    for (let b = 0; b <= maxPer; b++) {
      const c = total - a - b;
      if (c < 0 || c > maxPer) continue;
      const parts = [a, b, c];
      if (parts.filter((n) => n > 0).length < 2) continue;
      opts.push(parts);
    }
  }
  return opts.length ? pick(opts) : null;
}

function shapeMixed(): Hand | null {
  const nChow = 2 + ri(3);
  const specs: Spec[] = [];
  for (let i = 0; i < 5; i++) {
    const spec = tryAdd(specs, { noLao: true, noBro: true, chowBias: i < nChow ? 1 : 0 });
    if (!spec) return null;
    specs.push(spec);
  }
  return finish(specs, { source: "雜食", tenpai: 0.1 });
}

function shapePing(): Hand | null {
  const specs: Spec[] = [];
  for (let i = 0; i < 5; i++) {
    const found = candidates(specs, {
      noLao: true,
      honors: false,
      forbid: (spec, existing) => spec.k !== "c" || hasYiBu([...existing, spec]),
    }, "c");
    if (!found.length) return null;
    specs.push(pick(found));
  }
  return finish(specs, { source: "平胡", ryanmen: true });
}

function shapeLong(): Hand | null {
  const s = pick(SUITS);
  const base: Spec[] = [1, 4, 7].map((start) => ({ k: "c" as const, suit: s, start }));
  const specs = fill(base, 2, { noLao: true, noBro: true });
  if (!specs) return null;
  return finish(specs, { source: "明龍", open: chance(0.5) ? "some" : "closed" });
}

function shapeZa(): Hand | null {
  const order = shuffle(SUITS);
  const base: Spec[] = [1, 4, 7].map((start, i) => ({ k: "c" as const, suit: order[i], start }));
  const specs = fill(base, 2, { noLao: true, noBro: true });
  if (!specs) return null;
  return finish(specs, { source: "雜龍", open: chance(0.45) ? "some" : "closed" });
}

function shapeBan(): Hand | null {
  const suit = pick(SUITS);
  const start = 1 + ri(7);
  const base: Spec[] = [
    { k: "c", suit, start },
    { k: "c", suit, start },
  ];
  const specs = fill(base, 3, { noLao: true, noBro: true, forbid: capSame(suit, start, 2) });
  if (!specs) return null;
  return finish(specs, { source: "般高" });
}

function shapeSanBan(): Hand | null {
  const suit = pick(SUITS);
  const start = 1 + ri(7);
  const base: Spec[] = [0, 1, 2].map(() => ({ k: "c" as const, suit, start }));
  const specs = fill(base, 2, { noLao: true, noBro: true, forbid: capSame(suit, start, 3) });
  if (!specs) return null;
  return finish(specs, { source: "三般高" });
}

function shapeSiBan(): Hand | null {
  const suit = pick(SUITS);
  const start = 1 + ri(7);
  const base: Spec[] = [0, 1, 2, 3].map(() => ({ k: "c" as const, suit, start }));
  const specs = fill(base, 1, { noLao: true, noBro: true, forbid: capSame(suit, start, 4) });
  if (!specs) return null;
  return finish(specs, { source: "四般高" });
}

function shapeXiang(n: 2 | 3): Hand | null {
  const start = 1 + ri(7);
  const suits = shuffle(SUITS).slice(0, n);
  const base: Spec[] = suits.map((suit) => ({ k: "c" as const, suit, start }));
  const specs = fill(base, 5 - n, {
    noLao: true,
    noBro: true,
    forbid: (spec, existing) => {
      if (spec.k !== "c" || spec.start !== start) return false;
      if (!suits.includes(spec.suit)) return true;
      return existing.filter((s) => s.k === "c" && s.suit === spec.suit && s.start === start).length >= 2;
    },
  });
  if (!specs) return null;
  return finish(specs, { source: n === 3 ? "三相逢" : "二相逢" });
}
function shapeXiang2() {
  return shapeXiang(2);
}
function shapeXiang3() {
  return shapeXiang(3);
}

function shapeTong(total: 4 | 5): Hand | null {
  const start = 1 + ri(7);
  const parts = distribute(total, 3);
  if (!parts) return null;
  const suits = shuffle(SUITS);
  const base: Spec[] = [];
  parts.forEach((count, i) => {
    for (let k = 0; k < count; k++) base.push({ k: "c", suit: suits[i], start });
  });
  if (total === 5) return finish(base, { source: "五同順", ryanmen: chance(0.65) });
  const specs = fill(base, 1, {
    noLao: true,
    noBro: true,
    forbid: (spec) => spec.k === "c" && spec.start === start,
  });
  if (!specs) return null;
  return finish(specs, { source: "四同順" });
}
function shapeTong4() {
  return shapeTong(4);
}
function shapeTong5() {
  return shapeTong(5);
}

function shapeBuBu(): Hand | null {
  const start = 1 + ri(5);
  const pure = chance(0.55);
  const suit = pick(SUITS);
  const suits = pure ? [suit, suit, suit] : shuffle(SUITS);
  const base: Spec[] = [0, 1, 2].map((i) => ({ k: "c" as const, suit: suits[i], start: start + i }));
  const specs = fill(base, 2, { noLao: true, noBro: true });
  if (!specs) return null;
  return finish(specs, { source: "步步高" });
}

function shapeYiBu(): Hand | null {
  const s0 = pick(SUITS);
  let s3 = pick(SUITS);
  if (s3 === s0) s3 = SUITS[(SUITS.indexOf(s0) + 1) % 3];
  const suits = [s0, pick(SUITS), pick(SUITS), s3];
  const base: Spec[] = [1, 3, 5, 7].map((start, i) => ({ k: "c" as const, suit: suits[i], start }));
  const specs = fill(base, 1, { noLao: true, noBro: true });
  if (!specs) return null;
  return finish(specs, { source: "一步登天" });
}

function shapeDui(): Hand | null {
  const pool = shuffle(ALL_TILES);
  const specs: Spec[] = [];
  const usedRanks = new Set<number>();
  let honors = 0;
  for (const id of pool) {
    if (specs.length >= 5) break;
    if (isSuit(id)) {
      if (usedRanks.has(rank(id))) continue;
      usedRanks.add(rank(id));
    } else if (++honors > 3) continue;
    specs.push({ k: chance(0.12) ? "g" : "p", tile: id });
  }
  if (specs.length < 5) return null;
  const open = pick(["closed", "closed", "some", "many"] as const);
  const winBy = open === "closed" && chance(0.35) ? "zimo" : "either";
  return finish(specs, { source: "對對", open, winBy });
}

function shapeBro(): Hand | null {
  const kind = pick(["er", "er", "xiao", "da"] as const);
  const n = 1 + ri(9);
  const suits = shuffle(SUITS);
  if (kind === "da") {
    const base: Spec[] = suits.map((s) => ({ k: "p" as const, tile: tile(s, n) }));
    const specs = fill(base, 2, { noLao: true, noBro: true });
    if (!specs) return null;
    return finish(specs, { source: "兄弟" });
  }
  const base: Spec[] = [0, 1].map((i) => ({ k: "p" as const, tile: tile(suits[i], n) }));
  const pair = kind === "xiao" ? tile(suits[2], n) : undefined;
  const specs = fill(base, 3, { noLao: true, noBro: true, reservePair: pair });
  if (!specs) return null;
  return finish(specs, {
    source: "兄弟",
    pair,
    pairOk: kind === "er" ? (id) => id !== tile(suits[2], n) : undefined,
  });
}

function shapeSis(): Hand | null {
  const len = pick([2, 2, 3, 3, 4, 5]);
  const suit = pick(SUITS);
  const start = 1 + ri(10 - len);
  const base: Spec[] = [];
  for (let i = 0; i < len; i++) base.push({ k: "p", tile: tile(suit, start + i) });
  const adj = [start - 1, start + len].filter((n) => n >= 1 && n <= 9);
  const pair = adj.length && chance(0.55) ? tile(suit, pick(adj)) : undefined;
  const specs = fill(base, 5 - len, { noLao: true, noBro: true, reservePair: pair, chowBias: 0.45 });
  if (!specs) return null;
  return finish(specs, { source: "姊妹", pair, open: pick(["closed", "some", "some", "many"]) });
}

function shapeLao(): Hand | null {
  const s = pick(SUITS);
  const base: Spec[] = [
    { k: "c", suit: s, start: 1 },
    { k: "c", suit: s, start: 7 },
  ];
  const specs = fill(base, 3, {
    noLao: true,
    noBro: true,
    forbid: (spec) => spec.k === "c" && spec.suit === s && spec.start === 4,
  });
  if (!specs) return null;
  return finish(specs, { source: "老少" });
}

function shapeLaoPeng(): Hand | null {
  const s = pick(SUITS);
  const base: Spec[] = [
    { k: "p", tile: tile(s, 1) },
    { k: "p", tile: tile(s, 9) },
  ];
  const specs = fill(base, 3, { noLao: true, noBro: true });
  if (!specs) return null;
  return finish(specs, { source: "老少碰" });
}

function shapeQuan(): Hand | null {
  for (let attempt = 0; attempt < 24; attempt++) {
    const r = 1 + ri(9);
    const pairSuit = pick(SUITS);
    const pair = tile(pairSuit, r);
    const specs: Spec[] = [];
    let failed = false;
    for (let i = 0; i < 5; i++) {
      const found: Spec[] = [];
      for (const s of SUITS) {
        const p: Spec = { k: "p", tile: tile(s, r) };
        if (tally([...specs, p], pair)) found.push(p);
        for (let start = Math.max(1, r - 2); start <= Math.min(7, r); start++) {
          const c: Spec = { k: "c", suit: s, start };
          if (tally([...specs, c], pair)) found.push(c);
        }
      }
      if (!found.length) {
        failed = true;
        break;
      }
      specs.push(pick(found));
    }
    if (failed) continue;
    const h = finish(specs, { source: "全帶", pair });
    if (h) return h;
  }
  return null;
}

function shapeBand(ranks: number[], source: string, chowBias = 0.72): Hand | null {
  const specs = fill([], 5, { ranks, honors: false, noLao: true, noBro: true, chowBias });
  if (!specs) return null;
  return finish(specs, { source, ranks });
}
function shapeDuan() {
  return shapeBand([2, 3, 4, 5, 6, 7, 8], "斷么");
}
function shapeDa() {
  return shapeBand([6, 7, 8, 9], "全大", 0.55);
}
function shapeXi() {
  return shapeBand([1, 2, 3, 4], "全細", 0.55);
}
function shapeQueWu() {
  return shapeBand([1, 2, 3, 4, 6, 7, 8, 9], "缺五");
}

function shapeQing(): Hand | null {
  const s = pick(SUITS);
  const roll = ri(4);
  let specs: Spec[] | null = null;
  if (roll === 0) {
    const base: Spec[] = [1, 4, 7].map((start) => ({ k: "c" as const, suit: s, start }));
    specs = fill(base, 2, { suits: [s], honors: false, noBro: true });
  } else if (roll === 1) {
    specs = fill([], 5, { suits: [s], honors: false, chowBias: 1, noLao: true });
  } else if (roll === 2) {
    const len = 2 + ri(4);
    const startN = 1 + ri(10 - len);
    const base: Spec[] = [];
    for (let i = 0; i < len; i++) base.push({ k: "p", tile: tile(s, startN + i) });
    specs = fill(base, 5 - len, { suits: [s], honors: false, noLao: true, noBro: true });
  } else {
    specs = fill([], 5, { suits: [s], honors: false, noLao: true, noBro: true, chowBias: 0.55 });
  }
  if (!specs) return null;
  return finish(specs, {
    source: "清一色",
    ryanmen: roll === 1,
    pairOk: (id) => isSuit(id) && suitOf(id) === s,
  });
}

function shapeHun(): Hand | null {
  const s = pick(SUITS);
  const honorTiles = shuffle(HONORS).slice(0, 1 + ri(3));
  const base: Spec[] = honorTiles.map((id) => ({ k: "p" as const, tile: id }));
  const specs = fill(base, 5 - honorTiles.length, { suits: [s], honors: false, noLao: true, noBro: true, chowBias: 0.55 });
  if (!specs) return null;
  return finish(specs, {
    source: "混一色",
    pairOk: (id) => isHonor(id) || (isSuit(id) && suitOf(id) === s),
  });
}

function shapeSanYuan(): Hand | null {
  if (chance(0.55)) {
    const base: Spec[] = DRAGONS.map((id) => ({ k: "p" as const, tile: id }));
    const specs = fill(base, 2, { noLao: true, noBro: true });
    if (!specs) return null;
    return finish(specs, { source: "大三元", open: pick(["closed", "some", "many"]) });
  }
  const pair = pick(DRAGONS);
  const base: Spec[] = DRAGONS.filter((id) => id !== pair).map((id) => ({ k: "p" as const, tile: id }));
  const specs = fill(base, 3, { noLao: true, noBro: true, reservePair: pair });
  if (!specs) return null;
  return finish(specs, { source: "小三元", pair });
}

function shapeWinds(): Hand | null {
  const winds = shuffle(WINDS);
  const kind = pick(["dasi", "xiaosi", "dasan", "xiaosan"] as const);
  if (kind === "dasi") {
    const base: Spec[] = winds.map((id) => ({ k: "p" as const, tile: id }));
    const specs = fill(base, 1, { noLao: true, noBro: true });
    if (!specs) return null;
    return finish(specs, { source: "大四喜" });
  }
  if (kind === "xiaosi") {
    const base: Spec[] = winds.slice(0, 3).map((id) => ({ k: "p" as const, tile: id }));
    const specs = fill(base, 2, { noLao: true, noBro: true, reservePair: winds[3] });
    if (!specs) return null;
    return finish(specs, { source: "小四喜", pair: winds[3] });
  }
  if (kind === "dasan") {
    const base: Spec[] = winds.slice(0, 3).map((id) => ({ k: "p" as const, tile: id }));
    const specs = fill(base, 2, {
      noLao: true,
      noBro: true,
      forbid: (spec) => spec.k !== "c" && spec.tile === winds[3],
    });
    if (!specs) return null;
    return finish(specs, { source: "大三風", pairOk: (id) => id !== winds[3] });
  }
  const base: Spec[] = winds.slice(0, 2).map((id) => ({ k: "p" as const, tile: id }));
  const specs = fill(base, 3, {
    noLao: true,
    noBro: true,
    reservePair: winds[2],
    forbid: (spec) => spec.k !== "c" && (WINDS as readonly string[]).includes(spec.tile),
  });
  if (!specs) return null;
  return finish(specs, { source: "小三風", pair: winds[2] });
}

function shapeZi(): Hand | null {
  const honors = shuffle(HONORS);
  const specs: Spec[] = honors.slice(0, 5).map((id) => ({ k: "p" as const, tile: id }));
  return finish(specs, { source: "字一色", pair: honors[5], open: pick(["closed", "some", "many"]) });
}

function shapeWuMen(): Hand | null {
  const suits = shuffle(SUITS);
  const starts = shuffle([1, 2, 3, 4, 5, 6, 7]).slice(0, 3);
  const specs: Spec[] = [
    ...suits.map((suit, i) => ({ k: "c" as const, suit, start: starts[i] })),
    { k: "p", tile: pick(WINDS) },
    { k: "p", tile: pick(DRAGONS) },
  ];
  const flowers: FlowerPick = chance(0.22) ? "both" : chance(0.75) ? "red" : "random";
  return finish(specs, { source: "五門", flowers, open: pick(["closed", "some", "some", "many"]) });
}

function shapeQue(): Hand | null {
  const suits = shuffle(SUITS).slice(0, 2);
  const base: Spec[] = suits.map((suit) => ({ k: "c" as const, suit, start: 1 + ri(7) }));
  const specs = fill(base, 3, { suits, honors: chance(0.3), noLao: true, noBro: true, chowBias: 0.66 });
  if (!specs) return null;
  return finish(specs, {
    source: "缺一門",
    pairOk: (id) => !isSuit(id) || suits.includes(suitOf(id) as Suit),
  });
}

function shapeGang(): Hand | null {
  const n = chance(0.75) ? 1 : 2;
  const base: Spec[] = shuffle(ALL_TILES).slice(0, n).map((id) => ({ k: "g" as const, tile: id }));
  const specs = fill(base, 5 - n, { noLao: true, noBro: true });
  if (!specs) return null;
  return finish(specs, { source: "槓" });
}

function shapeLian(): Hand | null {
  const start = 1 + ri(7);
  const suits = shuffle(SUITS);
  if (chance(0.6)) {
    const base: Spec[] = [0, 1, 2].map((i) => ({ k: "p" as const, tile: tile(suits[i], start + i) }));
    const specs = fill(base, 2, { noLao: true, noBro: true });
    if (!specs) return null;
    return finish(specs, { source: "連碰" });
  }
  const base: Spec[] = [0, 1].map((i) => ({ k: "p" as const, tile: tile(suits[i], start + i) }));
  const pair = tile(suits[2], start + 2);
  const specs = fill(base, 3, { noLao: true, noBro: true, reservePair: pair });
  if (!specs) return null;
  return finish(specs, { source: "連碰", pair });
}

function groupHits(spec: Spec, rs: number[]) {
  if (spec.k === "c") return [spec.start, spec.start + 1, spec.start + 2].some((n) => rs.includes(n));
  return isHonor(spec.tile) || (isSuit(spec.tile) && rs.includes(rank(spec.tile)));
}

function shapeHunDai(): Hand | null {
  const windows = [
    [1, 2, 3],
    [7, 8, 9],
    [2, 3, 4],
    [4, 5, 6],
    [5, 6, 7],
    [6, 7, 8],
    [3, 4, 5],
  ];
  const single = chance(0.22);
  const rs = single ? [pick([1, 9, 2, 5, 8])] : pick(windows);
  const honorTiles = shuffle(HONORS).slice(0, 2);
  const specs: Spec[] = honorTiles.map((id) => ({ k: "p" as const, tile: id }));
  const suits = shuffle(SUITS);
  if (!single && rs[2] === rs[0] + 2) {
    specs.push({ k: "c", suit: suits[0], start: rs[0] }, { k: "c", suit: suits[1], start: rs[0] });
    const extra = tryAdd(specs, { noLao: true, noBro: true, forbid: (spec) => !groupHits(spec, rs) });
    if (!extra) return null;
    specs.push(extra);
    const pairPool = [
      ...HONORS.filter((id) => tally(specs, id)),
      ...SUITS.flatMap((s) => rs.map((n) => tile(s, n))).filter((id) => tally(specs, id)),
    ];
    if (!pairPool.length) return null;
    return finish(specs, { source: "混帶", pair: pick(pairPool) });
  }
  const n = rs[0];
  const start = Math.min(7, Math.max(1, n - 2));
  specs.push({ k: "p", tile: tile(suits[0], n) }, { k: "c", suit: suits[1], start });
  const pair = tile(suits[2], n);
  const extra = tryAdd(specs, { noLao: true, noBro: true, reservePair: pair, forbid: (spec) => !groupHits(spec, rs) });
  if (!extra || !tally([...specs, extra], pair)) return null;
  specs.push(extra);
  return finish(specs, { source: "混帶", pair });
}

function shapeQiu(): Hand | null {
  const specs = fill([], 5, { noLao: true, noBro: true, chowBias: 0.55 });
  if (!specs) return null;
  return finish(specs, { source: "求人", pairWait: true, open: "all", winBy: chance(0.55) ? "ron" : "zimo" });
}

function shapeTing(): Hand | null {
  const specs = fill([], 5, { noLao: true, noBro: true, chowBias: 0.72 });
  if (!specs) return null;
  return finish(specs, { source: "門清聽", open: "closed", tenpai: 1, winBy: chance(0.55) ? "zimo" : "ron" });
}

function shapeQingYao(): Hand | null {
  const terms = shuffle(["1m", "9m", "1p", "9p", "1s", "9s"]);
  const specs: Spec[] = terms.slice(0, 5).map((id) => ({ k: chance(0.15) ? "g" : "p", tile: id }));
  return finish(specs, { source: "清么", pair: terms[5], open: pick(["closed", "some", "many"]) });
}

function shapeHunYao(): Hand | null {
  const nH = 2 + ri(2);
  const honorTiles = shuffle(HONORS).slice(0, nH);
  const terms = shuffle(["1m", "9m", "1p", "9p", "1s", "9s"]);
  const specs: Spec[] = [
    ...honorTiles.map((id) => ({ k: "p" as const, tile: id })),
    ...terms.slice(0, 5 - nH).map((id) => ({ k: "p" as const, tile: id })),
  ];
  const pair = chance(0.5) ? shuffle(HONORS.filter((id) => !honorTiles.includes(id)))[0] : terms[5 - nH];
  if (!pair || !tally(specs, pair)) return null;
  return finish(specs, { source: "混么", pair });
}

function shapeTian(): Hand | null {
  const specs = fill([], 5, { noLao: true, noBro: true, chowBias: 0.75 });
  if (!specs) return null;
  return finish(specs, {
    source: "天胡",
    open: "closed",
    winBy: "zimo",
    seat: "E",
    dealer: true,
    flags: { tianHu: true },
    flowers: chance(0.7) ? "random" : "none",
  });
}

function shapeDi(): Hand | null {
  const specs = fill([], 5, { noLao: true, noBro: true, chowBias: 0.8 });
  if (!specs) return null;
  return finish(specs, {
    source: "地胡",
    open: "closed",
    winBy: "ron",
    seat: pick(["S", "W", "N"] as const),
    dealer: false,
    flags: { diHu: true, tianTing: chance(0.4) },
  });
}

function shapeRen(): Hand | null {
  const specs = fill([], 5, { noLao: true, noBro: true, chowBias: 0.75 });
  if (!specs) return null;
  return finish(specs, {
    source: "人胡",
    open: "closed",
    winBy: "ron",
    seat: pick(["S", "W", "N"] as const),
    dealer: false,
    flags: { renHu: true, tenpai: true, ippatsu: true },
  });
}

function shapeHai(): Hand | null {
  const real = chance(0.45);
  let specs: Spec[] | null;
  let winIndex: number | undefined;
  let winTile: string | undefined;
  if (real) {
    const base: Spec[] = chance(0.35) ? [{ k: "p", tile: "1p" }] : [{ k: "c", suit: "p", start: 1 }];
    specs = fill(base, 4, { noLao: true, noBro: true });
    winIndex = 0;
    winTile = "1p";
  } else specs = fill([], 5, { noLao: true, noBro: true, chowBias: 0.7 });
  if (!specs) return null;
  return finish(specs, {
    source: "海底",
    winBy: "zimo",
    open: "some",
    winIndex,
    winTile,
    flags: { haitei: true, wallLeft: 0 },
  });
}

function shapeQiang(): Hand | null {
  const id = pick(["C", "F", "B", "E", "S", "W", "N", "2m", "5p", "9s", "3m", "7p"]);
  const specs = fill([{ k: "p", tile: id }], 4, { noLao: true, noBro: true });
  if (!specs) return null;
  return finish(specs, { source: "搶槓", winBy: "ron", winIndex: 0, flags: { qiangGang: true } });
}

function shapeGangShang(): Hand | null {
  const id = pick([...HONORS, "2m", "5p", "8s", "9m", "4p", "3s", "7m"]);
  const specs = fill([{ k: "g", tile: id }], 4, { noLao: true, noBro: true });
  if (!specs) return null;
  const times: 1 | 2 = chance(0.3) ? 2 : 1;
  return finish(specs, { source: "槓上槓", winBy: "zimo", flags: { gangShangGang: times } });
}

function yao13(): Hand {
  const c = ctx();
  const types = ["1m", "9m", "1p", "9p", "1s", "9s", "E", "S", "W", "N", "C", "F", "B"];
  const pair = pick(types);
  const singles = types.filter((t) => t !== pair);
  const extra = chance(0.5) ? chow("2m", "3m", "4m") : pung(pick(["C", "E", "1p"].filter((t) => t !== pair)));
  const onExtra = chance(0.75);
  return shell({
    ...c,
    source: "十三么",
    melds: [],
    pair,
    winTile: onExtra ? extra.tiles[extra.kind === "chow" ? 1 : 0] : pair,
    winBy: "zimo",
    winAt: "pair",
    flowers: chance(0.3) ? flowers(ri(3)) : [],
    special: { kind: "yao", pair, singles, extra },
  });
}

function ligu(baFei = false): Hand {
  const c = ctx();
  const pool = chance(0.4)
    ? ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "9m"]
    : chance(0.4)
      ? ["E", "S", "W", "N", "C", "F", "B", pick(["1m", "9p", "1s"])]
      : ["E", "S", "W", "N", "C", "F", "1m", "9s"];
  const winTile = pick(pool);
  const h = shell({
    ...c,
    source: baFei ? "八飛" : "嚦咕",
    melds: [],
    pair: winTile,
    winTile,
    winBy: chance(0.7) ? "zimo" : "ron",
    winAt: "pair",
    flowers: chance(0.25) ? flowers(ri(3)) : [],
    special: { kind: "ligu", pairs: pool, baFei },
  });
  maybeTenpai(h, baFei ? 0 : 0.2);
  return h;
}

function budai(): Hand {
  const c = ctx();
  const honors = ["E", "S", "W", "N", "C", "F", "B"];
  const pair = pick(honors);
  const bonus = pick(["none", "none", "none", "xiang", "long"] as const);
  const cols =
    bonus === "xiang"
      ? [["1m", "2m", "3m"], ["1p", "2p", "3p"], ["1s", "2s", "3s"]]
      : bonus === "long"
        ? [["1m", "2m", "3m"], ["4p", "5p", "6p"], ["7s", "8s", "9s"]]
        : [["1m", "4m", "9m"], ["2p", "5p", "8p"], ["2s", "6s", "9s"]];
  return shell({
    ...c,
    source: "十六不搭",
    melds: [],
    pair,
    winTile: pair,
    winBy: chance(0.6) ? "zimo" : "ron",
    winAt: "pair",
    special: { kind: "budai", pair, honors: honors.filter((x) => x !== pair), cols, bonus },
  });
}

function shapeLigu() {
  return ligu(false);
}
function shapeBaFei() {
  return ligu(true);
}

/** One slot each. Repeating one 老少+二兄弟 door used to be most of the deck. */
const SHAPES: Array<() => Hand | null> = [
  shapeMixed, shapeMixed, shapeMixed,
  shapePing, shapePing,
  shapeLong, shapeZa, shapeBan, shapeSanBan,
  shapeXiang2, shapeXiang3, shapeTong4, shapeBuBu, shapeYiBu,
  shapeDui, shapeDui,
  shapeBro, shapeSis, shapeLao, shapeLaoPeng,
  shapeQuan, shapeDuan, shapeDa, shapeXi, shapeQueWu,
  shapeQing, shapeHun, shapeSanYuan, shapeWinds, shapeZi,
  shapeWuMen, shapeWuMen,
  shapeQue, shapeGang, shapeLian, shapeHunDai,
  shapeQiu, shapeTing, shapeSiBan, shapeTong5,
  shapeQingYao, shapeHunYao,
];

const SPECIALS: Array<() => Hand | null> = [
  shapeTian, shapeDi, shapeRen, shapeHai, shapeQiang, shapeGangShang,
  yao13, shapeLigu, shapeBaFei, budai,
];

function fallbackHand(): Hand {
  return shell({
    seat: "S",
    round: "E",
    dealer: false,
    source: "雞胡",
    melds: [chow("1m", "2m", "3m", true), chow("4m", "5m", "6m"), chow("2p", "3p", "4p"), pung("9s"), chow("6s", "7s", "8s")],
    pair: "E",
    winTile: "4m",
    winBy: "ron",
    winAt: 1,
  });
}

export function validateHand(h: Hand): string | null {
  const count = new Map<string, number>();
  const add = (t: string, n = 1) => count.set(t, (count.get(t) ?? 0) + n);
  if (h.special?.kind === "ligu") {
    if (h.special.pairs.length !== 8) return "ligu pairs";
    if (new Set(h.special.pairs).size !== 8) return "ligu dup";
    h.special.pairs.forEach((p) => add(p, 2));
  } else if (h.special?.kind === "yao") {
    if (h.special.singles.length !== 12) return "yao singles";
    h.special.singles.forEach((t) => add(t));
    add(h.special.pair, 2);
    h.special.extra.tiles.forEach((t) => add(t));
    if (h.special.extra.open) return "yao open";
  } else if (h.special?.kind === "budai") {
    add(h.special.pair, 2);
    if (h.special.honors.length !== 6) return "budai honors";
    h.special.honors.forEach((t) => add(t));
    if (h.special.cols.length !== 3) return "budai cols";
    h.special.cols.forEach((col) => col.forEach((t) => add(t)));
  } else {
    if (h.melds.length !== 5) return "melds";
    add(h.pair, 2);
    h.melds.forEach((m) => m.tiles.forEach((t) => add(t)));
    if (typeof h.winAt === "number" && h.melds[h.winAt]?.open) return "win meld open";
  }
  for (const [t, n] of count) if (n > 4) return `too many ${t}:${n}`;
  if (new Set(h.flowers).size !== h.flowers.length) return "flower dup";
  if (h.special?.kind === "ligu") {
    if (!h.special.pairs.includes(h.winTile)) return "win";
  } else if (h.special?.kind === "yao") {
    if (h.winTile !== h.special.pair && !h.special.extra.tiles.includes(h.winTile)) return "win";
  } else if (h.special?.kind === "budai") {
    if (h.winTile !== h.special.pair) return "win";
  } else if (h.winAt === "pair") {
    if (h.winTile !== h.pair) return "win";
  } else if (!h.melds[h.winAt]?.tiles.includes(h.winTile)) return "win";
  const f = h.flags;
  if (f.tianHu && (!h.dealer || h.winBy !== "zimo")) return "tian";
  if (f.diHu && (h.dealer || h.winBy !== "ron")) return "di";
  if (f.renHu && h.dealer) return "ren";
  if (f.haitei && h.winBy !== "zimo") return "hai";
  if (f.qiangGang && h.winBy !== "ron") return "qiang";
  if (f.gangShangGang && h.winBy !== "zimo") return "gang";
  if (f.ippatsu && !f.tenpai && !f.tianTing) return "ippatsu";
  const { total, lines } = scoreHand(h);
  if (total <= 0 || lines.some((l) => l.fan <= 0)) return "bad score";
  if (lines.reduce((s, l) => s + l.fan, 0) !== total) return "sum";
  return null;
}

export function dealHand(): Hand {
  for (let i = 0; i < 30; i++) {
    const build = chance(0.15) ? pick(SPECIALS) : pick(SHAPES);
    for (let t = 0; t < 8; t++) {
      const h = build();
      if (h && !validateHand(h)) return h;
    }
  }
  return fallbackHand();
}

export function stressBuilders(times = 6): string[] {
  const errors: string[] = [];
  for (const build of [...SHAPES, ...SPECIALS]) {
    let ok = 0;
    for (let n = 0; n < times; n++) {
      let got = false;
      let err = "";
      for (let t = 0; t < 16; t++) {
        const h = build();
        if (!h) continue;
        const problem = validateHand(h);
        if (!problem) {
          got = true;
          break;
        }
        err = `${h.source ?? build.name}: ${problem}`;
      }
      if (got) ok++;
      else errors.push(err || `${build.name}: no hand`);
    }
    if (ok < times) errors.push(`${build.name}: ${ok}/${times}`);
  }
  return errors;
}
