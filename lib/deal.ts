import { blankFlags, type Hand, type Meld, type Wind } from "./types";
import { GRASSES, SEASONS } from "./tiles";
import { scoreHand } from "./score";

const WINDS: Wind[] = ["E", "S", "W", "N"];
const SUITS = ["m", "p", "s"] as const;

function pick<T>(a: readonly T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}
function chance(p: number) {
  return Math.random() < p;
}
function ri(n: number) {
  return Math.floor(Math.random() * n);
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
function ctx() {
  return { seat: pick(WINDS), round: pick(WINDS), dealer: chance(0.28) };
}
function doorFlowers() {
  if (chance(0.18)) return [];
  const red = flowers(1 + ri(2)).filter((id) => id.startsWith("SE"));
  const season = red[0] ?? pick(SEASONS);
  if (chance(0.42)) return [...new Set([season, pick(GRASSES)])];
  return [season];
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
function openOthers(melds: Meld[], winAt: number | "pair", n: number) {
  const idx = melds.map((_, i) => i).filter((i) => i !== winAt);
  for (let k = 0; k < n && idx.length; k++) {
    const j = ri(idx.length);
    melds[idx[j]].open = true;
    idx.splice(j, 1);
  }
}

function shell(partial: Omit<Hand, "flowers" | "flags"> & { flowers?: string[]; flags?: Hand["flags"] }): Hand {
  const h: Hand = { flowers: [], flags: blankFlags(), ...partial };
  if (h.flags.wallLeft < 0) h.flags.wallLeft = rollWall();
  return h;
}

function jiHu(): Hand {
  const c = ctx();
  const melds = [chow("1m", "2m", "3m"), chow("4m", "5m", "6m"), chow("2p", "3p", "4p"), pung("9s"), chow("6s", "7s", "8s")];
  const openAt = pick([0, 2, 3, 4]);
  melds.forEach((m, i) => (m.open = i === openAt));
  return shell({
    ...c,
    source: "雞胡",
    melds,
    pair: pick(["E", "S", "W", "N", "C", "F", "B"]),
    winTile: "4m",
    winBy: "ron",
    winAt: 1,
  });
}

function daPing(): Hand {
  const c = ctx();
  const melds = [chow("1m", "2m", "3m"), chow("4m", "5m", "6m"), chow("7m", "8m", "9m"), chow("1p", "2p", "3p"), chow("4p", "5p", "6p")];
  const pure = chance(0.55);
  const winAt = 1;
  if (!pure) openOthers(melds, winAt, 1);
  const h = shell({
    ...c,
    source: "大平胡",
    melds,
    pair: "2s",
    winTile: "4m",
    winBy: pure ? "zimo" : pick(["zimo", "ron"] as const),
    winAt,
    flowers: pure ? [] : chance(0.7) ? flowers(1 + ri(3)) : [],
  });
  if (!pure) maybeTenpai(h, 0.3);
  return h;
}

function pingMixed(): Hand {
  const c = ctx();
  const melds = [chow("2m", "3m", "4m"), chow("5m", "6m", "7m"), chow("2p", "3p", "4p"), chow("6s", "7s", "8s"), chow("2s", "3s", "4s")];
  const winAt = 0;
  if (chance(0.4)) openOthers(melds, winAt, 1);
  const h = shell({
    ...c,
    source: "平胡",
    melds,
    pair: "5p",
    winTile: "2m",
    winBy: chance(0.5) ? "zimo" : "ron",
    winAt,
    flowers: chance(0.55) ? flowers(1 + ri(2)) : [],
  });
  maybeTenpai(h, 0.35);
  return h;
}

function daSanYuan(): Hand {
  const s = pick(SUITS);
  const c = ctx();
  const melds = [pung("C"), pung("F"), pung("B"), pung("1" + s), pung("9" + s)];
  const winAt = ri(5);
  openOthers(melds, winAt, ri(3));
  const pair = chance(0.5) ? "2" + s : "E";
  const h = shell({
    ...c,
    source: "大三元",
    melds,
    pair,
    winTile: melds[winAt].tiles[0],
    winBy: chance(0.55) ? "zimo" : "ron",
    winAt,
    flowers: chance(0.4) ? flowers(1 + ri(3)) : [],
  });
  maybeTenpai(h);
  return h;
}

function daSiXi(): Hand {
  const c = ctx();
  const fifth = pick(["C", "F", "B"]);
  const pair = pick(["C", "F", "B"].filter((d) => d !== fifth));
  const melds = [pung("E"), pung("S"), pung("W"), pung("N"), pung(fifth)];
  const winAt = ri(5);
  openOthers(melds, winAt, ri(3));
  const h = shell({
    ...c,
    source: "大四喜",
    melds,
    pair,
    winTile: melds[winAt].tiles[0],
    winBy: chance(0.6) ? "zimo" : "ron",
    winAt,
    flowers: chance(0.3) ? flowers(ri(3)) : [],
  });
  maybeTenpai(h, 0.25);
  return h;
}

function xiaoSanYuan(): Hand {
  const c = ctx();
  const dragons = ["C", "F", "B"];
  const pair = pick(dragons);
  const rest = dragons.filter((d) => d !== pair);
  const melds = [pung(rest[0]), pung(rest[1]), pung("2m"), pung("5p"), pung("8s")];
  const winAt = ri(5);
  openOthers(melds, winAt, ri(3));
  const h = shell({
    ...c,
    source: "小三元",
    melds,
    pair,
    winTile: melds[winAt].tiles[0],
    winBy: chance(0.5) ? "zimo" : "ron",
    winAt,
    flowers: chance(0.35) ? flowers(1 + ri(2)) : [],
  });
  maybeTenpai(h, 0.3);
  return h;
}

function qingYiSe(): Hand {
  const s = pick(SUITS);
  const c = ctx();
  const t = (n: number) => `${n}${s}`;
  const melds = [chow(t(1), t(2), t(3)), chow(t(4), t(5), t(6)), chow(t(7), t(8), t(9)), chow(t(2), t(3), t(4)), chow(t(6), t(7), t(8))];
  const winAt = 1;
  if (chance(0.45)) openOthers(melds, winAt, 1);
  const h = shell({
    ...c,
    source: "清一色",
    melds,
    pair: t(5),
    winTile: t(4),
    winBy: chance(0.55) ? "zimo" : "ron",
    winAt,
    flowers: chance(0.4) ? flowers(1 + ri(4)) : [],
  });
  maybeTenpai(h, 0.35);
  return h;
}

function xiaoLiu(): Hand {
  const s = pick(SUITS);
  const start = 1 + ri(4);
  const c = ctx();
  const melds = [0, 1, 2, 3, 4].map((i) => pung(`${start + i}${s}`));
  const winAt = chance(0.7) ? ("pair" as const) : ri(5);
  if (chance(0.35)) openOthers(melds, winAt, 1);
  const h = shell({
    ...c,
    source: "小六姊妹",
    melds,
    pair: `${start + 5}${s}`,
    winTile: winAt === "pair" ? `${start + 5}${s}` : melds[winAt].tiles[0],
    winBy: chance(0.6) ? "zimo" : "ron",
    winAt,
  });
  maybeTenpai(h, 0.2);
  return h;
}

function siZiMei(): Hand {
  const c = ctx();
  const melds = [pung("1m"), pung("2m"), pung("3m"), pung("4m"), pung("9p")];
  const winAt = 4;
  const h = shell({
    ...c,
    source: "四姊妹",
    melds,
    pair: "E",
    winTile: "9p",
    winBy: chance(0.5) ? "zimo" : "ron",
    winAt,
    flowers: chance(0.3) ? flowers(ri(3)) : [],
  });
  maybeTenpai(h, 0.25);
  return h;
}

function quanDaiYi(): Hand {
  const c = ctx();
  const melds = [pung("1m"), pung("1p"), chow("1m", "2m", "3m"), chow("1p", "2p", "3p"), chow("1s", "2s", "3s")];
  const winAt = 4;
  if (chance(0.4)) openOthers(melds, winAt, 1);
  const h = shell({
    ...c,
    source: "全帶一",
    melds,
    pair: "1s",
    winTile: "2s",
    winBy: chance(0.55) ? "zimo" : "ron",
    winAt,
  });
  maybeTenpai(h, 0.25);
  return h;
}

function duanYao(): Hand {
  const c = ctx();
  const melds = [chow("2m", "3m", "4m"), chow("6m", "7m", "8m"), chow("2p", "3p", "4p"), chow("6p", "7p", "8p"), chow("2s", "3s", "4s")];
  const winAt = 0;
  const h = shell({
    ...c,
    source: "斷么",
    melds,
    pair: "6s",
    winTile: "2m",
    winBy: chance(0.5) ? "zimo" : "ron",
    winAt,
    flowers: chance(0.25) ? flowers(1) : [],
  });
  maybeTenpai(h, 0.3);
  return h;
}

function hunDai(): Hand {
  const c = ctx();
  const melds = [pung("3m"), pung("3p"), pung("3s"), pung("C"), pung("E")];
  const winAt = ri(3);
  openOthers(melds, winAt, ri(2));
  const h = shell({
    ...c,
    source: "混帶",
    melds,
    pair: "F",
    winTile: melds[winAt].tiles[0],
    winBy: chance(0.5) ? "zimo" : "ron",
    winAt,
  });
  maybeTenpai(h, 0.25);
  return h;
}

function yao13(): Hand {
  const c = ctx();
  const types = ["1m", "9m", "1p", "9p", "1s", "9s", "E", "S", "W", "N", "C", "F", "B"];
  const pair = pick(types);
  const singles = types.filter((t) => t !== pair);
  const extra = chance(0.5)
    ? chow("2m", "3m", "4m")
    : pung(pick(["C", "E", "1p"].filter((t) => t !== pair)));
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

function qingYao(): Hand {
  const c = ctx();
  const melds = [pung("1m"), pung("1p"), pung("1s"), pung("9m"), pung("9p")];
  const winAt = "pair" as const;
  if (chance(0.3)) openOthers(melds, winAt, 1);
  const h = shell({
    ...c,
    source: "清么",
    melds,
    pair: "9s",
    winTile: "9s",
    winBy: chance(0.6) ? "zimo" : "ron",
    winAt,
  });
  maybeTenpai(h, 0.2);
  return h;
}

function tianHu(): Hand {
  const round = pick(WINDS);
  const melds = [chow("1m", "2m", "3m"), chow("4p", "5p", "6p"), chow("7s", "8s", "9s"), chow("2m", "3m", "4m"), chow("6p", "7p", "8p")];
  return shell({
    source: "天胡",
    seat: "E",
    round,
    dealer: true,
    melds,
    pair: "B",
    winTile: "5p",
    winBy: "zimo",
    winAt: 1,
    flowers: chance(0.8) ? flowers(1 + ri(3)) : [],
    flags: { ...blankFlags(), tianHu: true },
  });
}

function diHu(): Hand {
  const c = ctx();
  const melds = [chow("1m", "2m", "3m"), chow("4m", "5m", "6m"), chow("7m", "8m", "9m"), chow("1p", "2p", "3p"), chow("4p", "5p", "6p")];
  const ting = chance(0.45);
  return shell({
    source: "地胡",
    seat: c.seat === "E" ? "S" : c.seat,
    round: c.round,
    dealer: false,
    melds,
    pair: "2s",
    winTile: "4m",
    winBy: "ron",
    winAt: 1,
    flags: { ...blankFlags(), diHu: true, tianTing: ting },
  });
}

function renHu(): Hand {
  const c = ctx();
  const melds = [chow("2s", "3s", "4s"), chow("5m", "6m", "7m"), chow("7p", "8p", "9p"), chow("2m", "3m", "4m"), chow("4s", "5s", "6s")];
  return shell({
    source: "人胡",
    seat: pick(["S", "W", "N"] as const),
    round: c.round,
    dealer: false,
    melds,
    pair: "8m",
    winTile: "3s",
    winBy: "ron",
    winAt: 0,
    flags: { ...blankFlags(), renHu: true, tenpai: true, ippatsu: true },
  });
}

function haiDi(): Hand {
  const c = ctx();
  const melds = [chow("1p", "2p", "3p"), chow("4m", "5m", "6m"), chow("6s", "7s", "8s"), chow("2m", "3m", "4m"), chow("7p", "8p", "9p")];
  const real = chance(0.45);
  return shell({
    ...c,
    source: "海底",
    melds,
    pair: "E",
    winTile: real ? "1p" : "4m",
    winBy: "zimo",
    winAt: real ? 0 : 1,
    flags: { ...blankFlags(0), haitei: true },
  });
}

function qiZhi(): Hand {
  const c = ctx();
  const melds = [chow("2m", "3m", "4m"), chow("5p", "6p", "7p"), chow("3s", "4s", "5s"), pung("B"), pung("9m")];
  const winAt = 1;
  return shell({
    ...c,
    source: "七只",
    melds,
    pair: "5s",
    winTile: "6p",
    winBy: chance(0.5) ? "zimo" : "ron",
    winAt,
    flags: { ...blankFlags(1 + ri(7)) },
  });
}

function menQingTing(): Hand {
  const c = ctx();
  const melds = [chow("1m", "2m", "3m"), chow("4m", "5m", "6m"), chow("2p", "3p", "4p"), chow("6s", "7s", "8s"), chow("7p", "8p", "9p")];
  const zimo = chance(0.55);
  return shell({
    ...c,
    source: "門清聽",
    melds,
    pair: "C",
    winTile: "4m",
    winBy: zimo ? "zimo" : "ron",
    winAt: 1,
    flags: { ...blankFlags(), tenpai: true, ippatsu: chance(0.5) },
  });
}

function quanQiu(): Hand {
  const c = ctx();
  const zimo = chance(0.45);
  const pair = pick(["E", "S", "C", "B"]);
  const melds = [
    chow("1m", "2m", "3m", true),
    chow("4m", "5m", "6m", true),
    chow("2p", "3p", "4p", true),
    chow("6s", "7s", "8s", true),
    chow("7p", "8p", "9p", true),
  ];
  return shell({
    ...c,
    source: zimo ? "半求人" : "全求人",
    melds,
    pair,
    winTile: pair,
    winBy: zimo ? "zimo" : "ron",
    winAt: "pair",
    flowers: chance(0.3) ? flowers(1) : [],
  });
}

function yiBu(): Hand {
  const c = ctx();
  const melds = [chow("1m", "2m", "3m"), chow("3p", "4p", "5p"), chow("5s", "6s", "7s"), chow("7m", "8m", "9m"), chow("2p", "3p", "4p")];
  const h = shell({
    ...c,
    source: "一步登天",
    melds,
    pair: "6s",
    winTile: "2p",
    winBy: chance(0.6) ? "zimo" : "ron",
    winAt: 4,
  });
  maybeTenpai(h, 0.3);
  return h;
}

function zaLong(): Hand {
  const c = ctx();
  const melds = [chow("1m", "2m", "3m"), chow("4p", "5p", "6p"), chow("7s", "8s", "9s"), chow("2m", "3m", "4m"), chow("6p", "7p", "8p")];
  const winAt = 2;
  if (chance(0.3)) openOthers(melds, winAt, 1);
  const h = shell({
    ...c,
    source: "雜龍",
    melds,
    pair: "5m",
    winTile: "8s",
    winBy: chance(0.55) ? "zimo" : "ron",
    winAt,
    flowers: chance(0.3) ? flowers(1 + ri(2)) : [],
  });
  maybeTenpai(h, 0.3);
  return h;
}

function lianPeng(): Hand {
  const c = ctx();
  const melds = [pung("2m"), pung("3p"), pung("4s"), pung("6m"), pung("9p")];
  const winAt = 4;
  if (chance(0.35)) openOthers(melds, winAt, 1);
  const h = shell({
    ...c,
    source: "連碰",
    melds,
    pair: "5s",
    winTile: "9p",
    winBy: chance(0.5) ? "zimo" : "ron",
    winAt,
  });
  maybeTenpai(h, 0.25);
  return h;
}

function gangShang(): Hand {
  const c = ctx();
  const melds = [kong("2m"), pung("2p"), pung("5s"), pung("C"), pung("E")];
  const winAt = 1;
  const double = chance(0.35);
  const h = shell({
    ...c,
    source: "槓上槓",
    melds,
    pair: "8p",
    winTile: "2p",
    winBy: "zimo",
    winAt,
    flags: { ...blankFlags(), gangShangGang: double ? 2 : 1 },
  });
  return h;
}

function laoShao(): Hand {
  const c = ctx();
  const melds = [chow("1m", "2m", "3m"), chow("7m", "8m", "9m"), chow("4p", "5p", "6p"), chow("4s", "5s", "6s"), chow("2p", "3p", "4p")];
  const winAt = 2;
  const h = shell({
    ...c,
    source: "老少",
    melds,
    pair: "6s",
    winTile: "4p",
    winBy: chance(0.5) ? "zimo" : "ron",
    winAt,
    flowers: chance(0.35) ? flowers(1 + ri(2)) : [],
  });
  maybeTenpai(h, 0.35);
  return h;
}

/** 一二三 + 七八九、兩門同數刻、箭刻、風眼。日常最常見嘅五門齊形。 */
function commonDoor(): Hand {
  const c = ctx();
  const lao = pick(SUITS);
  const rest = SUITS.filter((s) => s !== lao);
  const n = 2 + ri(7);
  const dragon = pick(["C", "F", "B"]);
  const melds = [
    chow(`1${lao}`, `2${lao}`, `3${lao}`),
    chow(`7${lao}`, `8${lao}`, `9${lao}`),
    pung(`${n}${rest[0]}`),
    pung(`${n}${rest[1]}`),
    pung(dragon),
  ];
  const wins = [
    { at: 0, tile: `1${lao}` },
    { at: 0, tile: `2${lao}` },
    { at: 1, tile: `8${lao}` },
    { at: 1, tile: `9${lao}` },
  ];
  const win = pick(wins);
  const calls = chance(0.78) ? 1 + (chance(0.42) ? 1 : 0) : 0;
  openOthers(melds, win.at, calls);
  const h = shell({
    ...c,
    source: "老少門",
    melds,
    pair: pick(WINDS),
    winTile: win.tile,
    winBy: chance(0.42) ? "zimo" : "ron",
    winAt: win.at,
    flowers: doorFlowers(),
  });
  if (chance(0.12)) maybeTenpai(h, 1);
  return h;
}

/** 出街一兩組、順刻夾雜，接近實戰食胡。 */
function streetHand(): Hand {
  const c = ctx();
  const roll = ri(3);
  let melds: Meld[];
  let winAt: number;
  let winTile: string;
  if (roll === 0) {
    melds = [chow("2m", "3m", "4m"), chow("6m", "7m", "8m"), chow("3p", "4p", "5p"), pung("9m"), pung("8p")];
    winAt = 0;
    winTile = "2m";
  } else if (roll === 1) {
    melds = [chow("2m", "3m", "4m"), chow("5p", "6p", "7p"), chow("2s", "3s", "4s"), pung("8s"), pung(pick(["C", "F", "B"]))];
    winAt = 1;
    winTile = "6p";
  } else {
    const n = pick([4, 5]);
    melds = [chow("1m", "2m", "3m"), chow("7p", "8p", "9p"), pung(`${n}m`), pung(`${n}s`), pung(pick(["C", "F", "B"]))];
    winAt = 0;
    winTile = "2m";
  }
  openOthers(melds, winAt, chance(0.8) ? 1 + (chance(0.4) ? 1 : 0) : 0);
  const h = shell({
    ...c,
    source: "日常",
    melds,
    pair: pick(WINDS),
    winTile,
    winBy: chance(0.4) ? "zimo" : "ron",
    winAt,
    flowers: chance(0.55) ? flowers(1 + ri(2)) : [],
  });
  if (chance(0.1)) maybeTenpai(h, 1);
  return h;
}

function wuAn(): Hand {
  const c = ctx();
  const melds = [pung("2m"), pung("5p"), pung("8s"), pung("E"), pung("C")];
  const winAt = ri(5);
  const h = shell({
    ...c,
    source: "五暗刻",
    melds,
    pair: "2s",
    winTile: melds[winAt].tiles[0],
    winBy: "zimo",
    winAt,
  });
  maybeTenpai(h, 0.3);
  return h;
}

function qiang(): Hand {
  const c = ctx();
  const melds = [pung("F"), chow("2m", "3m", "4m"), chow("5p", "6p", "7p"), chow("6s", "7s", "8s"), pung("9m")];
  return shell({
    ...c,
    source: "搶槓",
    melds,
    pair: "N",
    winTile: "F",
    winBy: "ron",
    winAt: 0,
    flags: { ...blankFlags(), qiangGang: true },
  });
}

const RARE = [
  daSanYuan, daSiXi, xiaoSanYuan, qingYiSe, xiaoLiu, siZiMei, quanDaiYi, hunDai,
  yao13, () => ligu(false), () => ligu(true), budai, qingYao, tianHu, diHu, renHu,
  haiDi, qiZhi, menQingTing, quanQiu, yiBu, zaLong, lianPeng, gangShang, wuAn, qiang,
];
const PLAIN = [streetHand, streetHand, pingMixed, daPing, jiHu, laoShao, duanYao];
const BUILDERS = [...Array(14).fill(commonDoor), ...PLAIN, ...PLAIN, ...RARE];

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
  for (let i = 0; i < 40; i++) {
    const h = pick(BUILDERS)();
    if (!validateHand(h)) return h;
  }
  return jiHu();
}

export function stressBuilders(times = 6): string[] {
  const errors: string[] = [];
  BUILDERS.forEach((build) => {
    for (let n = 0; n < times; n++) {
      const h = build();
      const err = validateHand(h);
      if (err) errors.push(`${h.source ?? "hand"}: ${err}`);
    }
  });
  return errors;
}
