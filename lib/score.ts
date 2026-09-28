import type { Hand, Line, Meld } from "./types";
import {
  FLOWER_SEAT,
  GRASSES,
  SEASONS,
  isHonor,
  isSuit,
  rank,
  suitLabel,
  suitOf,
  tileName,
} from "./tiles";

type Chow = { tiles: string[]; open: boolean; start: number; suit: string; seq: string };

function chowsOf(melds: Meld[]): Chow[] {
  const out: Chow[] = [];
  for (const m of melds) {
    if (m.kind !== "chow") continue;
    const nums = m.tiles.map(rank).sort((a, b) => a - b);
    out.push({
      tiles: m.tiles,
      open: m.open,
      start: nums[0],
      suit: suitOf(m.tiles[0]),
      seq: nums.join(""),
    });
  }
  return out;
}

function pungsOf(melds: Meld[]): { tile: string; open: boolean; kong: boolean }[] {
  return melds
    .filter((m) => m.kind === "pung" || m.kind === "kong")
    .map((m) => ({ tile: m.tiles[0], open: m.open, kong: m.kind === "kong" }));
}

export function handTiles(h: Hand): string[] {
  if (h.special?.kind === "ligu") return h.special.pairs.flatMap((p) => [p, p]);
  if (h.special?.kind === "yao") {
    return [...h.special.singles, h.special.pair, h.special.pair, ...h.special.extra.tiles];
  }
  if (h.special?.kind === "budai") {
    return [h.special.pair, h.special.pair, ...h.special.honors, ...h.special.cols.flat()];
  }
  return [h.pair, h.pair, ...h.melds.flatMap((m) => m.tiles)];
}

export function isMenqing(h: Hand): boolean {
  if (h.special) {
    if (h.special.kind === "yao") return !h.special.extra.open;
    return true;
  }
  return h.melds.every((m) => !m.open);
}

function groupsOf(h: Hand): string[][] {
  if (h.special?.kind === "yao") {
    return [[...h.special.singles, h.special.pair, h.special.pair], h.special.extra.tiles];
  }
  if (h.special) return [];
  return [...h.melds.map((m) => m.tiles), [h.pair, h.pair]];
}

type Wait = "ryanmen" | "penchan" | "kanchan" | "pair" | "pung" | "other";

export function waitShape(h: Hand): Wait {
  if (h.special?.kind === "ligu" || h.special?.kind === "budai") return "other";
  if (h.special?.kind === "yao") {
    const ex = h.special.extra;
    if (ex.tiles.includes(h.winTile)) return ex.kind === "chow" ? chowWait(ex.tiles, h.winTile) : "pung";
    if (h.winTile === h.special.pair) return "pair";
    return "other";
  }
  if (h.winAt === "pair") return "pair";
  const m = h.melds[h.winAt];
  if (!m || !m.tiles.includes(h.winTile)) return "other";
  if (m.kind === "pung" || m.kind === "kong") return "pung";
  return chowWait(m.tiles, h.winTile);
}

function chowWait(tiles: string[], win: string): Wait {
  const nums = tiles.map(rank).sort((a, b) => a - b);
  const w = rank(win);
  const others = [...nums];
  others.splice(others.indexOf(w), 1);
  const [a, b] = others;
  if (b === a + 1) {
    if ((a === 1 && b === 2 && w === 3) || (a === 8 && b === 9 && w === 7)) return "penchan";
    return "ryanmen";
  }
  if (b === a + 2 && w === a + 1) return "kanchan";
  return "other";
}

function push(lines: Line[], name: string, fan: number, why: string) {
  if (fan) lines.push({ name, fan, why });
}

function addFlowers(h: Hand, lines: Line[], noHonor: boolean, pinghu: boolean) {
  const flowers = h.flowers;
  const noFlower = flowers.length === 0;
  const allGrass = GRASSES.every((g) => flowers.includes(g));
  const allSeason = SEASONS.every((g) => flowers.includes(g));
  let proper = 0;
  let rotten = 0;
  for (const f of flowers) {
    if (allGrass && f.startsWith("GR")) continue;
    if (FLOWER_SEAT[f] === h.seat) proper += 1;
    else rotten += 1;
  }
  if (proper) push(lines, "正花", proper * 2, `${proper} 隻對位花`);
  if (rotten) push(lines, "爛花", rotten, `${rotten} 隻`);
  if (allSeason) push(lines, "一台花", 10, "春夏秋冬齊");
  if (allGrass) push(lines, "一台草", 3, "梅蘭菊竹齊，只收一次，唔再逐隻計");

  const realPing = pinghu;
  if (realPing && noHonor && noFlower) {
    push(lines, "無字花平胡", 15, "無番子、無花、平胡，已包括呢三項");
  } else {
    if (realPing) push(lines, "平胡", 5, "五順、兩面食胡，眼可以係番子");
    if (noHonor && noFlower) push(lines, "無字花", 5, "無番子兼無花，已包括無字、無花");
    else if (noHonor) push(lines, "無字", 1, "沒有番子");
    else if (noFlower) push(lines, "無花", 1, "一隻花都無");
  }
}

function addSituation(h: Hand, lines: Line[]) {
  const f = h.flags;
  const zimo = h.winBy === "zimo";
  const menqing = isMenqing(h);
  const suppress = f.diHu || f.renHu;

  if (f.tianHu) push(lines, "天胡", 250, "莊家補花後即糊");
  if (f.diHu) push(lines, "地胡", 110, "莊家第一隻出沖，唔計門清");
  if (f.renHu) push(lines, "人胡", 70, "閒家一巡內食胡，唔計門清");
  if (f.tianTing) push(lines, "天聽", 45, "第一隻牌前聽牌");

  if (!suppress && !f.tianTing) {
    if (menqing && f.tenpai && zimo) push(lines, "門清聽牌自摸", 20, "已包括門清、聽牌、自摸");
    else if (menqing && f.tenpai) push(lines, "門清聽牌", 15, "已包括門清、聽牌");
    else if (menqing && zimo) push(lines, "門清自摸", 8, "已包括門清同自摸");
    else if (menqing) push(lines, "門清", 5, "門前清，暗槓都計");
    else if (zimo) push(lines, "自摸", 1, "");
    if (!menqing && f.tenpai) push(lines, "聽牌", 5, "已叫胡");
  } else if (f.tianTing && !suppress) {
    if (menqing && zimo) push(lines, "門清自摸", 8, "天聽，門清自摸另計");
    else if (menqing) push(lines, "門清", 5, "天聽，門清另計");
    else if (zimo) push(lines, "自摸", 1, "");
  } else if (suppress) {
    if (zimo) push(lines, "自摸", 1, "");
    if (f.tenpai) push(lines, "聽牌", 5, "已叫胡");
  }

  if (f.ippatsu && (f.tenpai || f.tianTing)) push(lines, "一發", 5, "聽牌後一巡內糊");
  if (f.haitei) {
    if (h.winTile === "1p") push(lines, "真海底撈月", 20, "海底摸一筒");
    else push(lines, "海底撈月", 10, "海底自摸");
  }
  if (f.houtei) push(lines, "河底撈魚", 5, "最後一隻出沖");
  if (f.qiangGangGang) push(lines, "搶槓上槓食胡", 30, "當出沖");
  else if (f.qiangGang) push(lines, "搶槓食胡", 1, "當出沖，花式當暗");
  if (f.gangShangGang > 0) {
    push(lines, "槓上槓食胡", 30 * f.gangShangGang, f.gangShangGang === 2 ? "30+30" : "隔花不計");
  } else if (f.gangShang) push(lines, "槓上食胡", 1, "");
  if (f.huaShang) push(lines, "花上食胡", 1, "");
  if (f.wallLeft >= 0 && f.wallLeft <= 7) push(lines, "七只內", 30, `牌牆剩 ${f.wallLeft} 隻`);
  else if (f.wallLeft >= 8 && f.wallLeft <= 10) push(lines, "十只內", 15, `牌牆剩 ${f.wallLeft} 隻`);
}

function addQuad(lines: Line[], tiles: string[], melds: Meld[]) {
  const count = new Map<string, number>();
  for (const t of tiles) if (isSuit(t)) count.set(t, (count.get(t) ?? 0) + 1);
  const quads = [...count.entries()].filter(([, n]) => n >= 4).map(([t]) => t);
  if (quads.length !== 1 && quads.length !== 2 && quads.length < 4) return;
  const concealed = quads.every((t) => melds.every((m) => m.open === false || !m.tiles.includes(t)));
  const n = (quads.length >= 4 ? 4 : quads.length) as 1 | 2 | 4;
  const names = { 1: "四歸一", 2: "四歸二", 4: "四歸四" } as const;
  const openFan = { 1: 5, 2: 10, 4: 20 } as const;
  const anFan = { 1: 10, 2: 20, 4: 40 } as const;
  const why = quads.map(tileName).join("、");
  push(lines, concealed ? `${names[n]}（暗）` : names[n], concealed ? anFan[n] : openFan[n], why);
}

function addDoors(lines: Line[], tiles: string[], flowers: string[]) {
  const suits = new Set<string>();
  const winds = new Set<string>();
  let dragon = false;
  for (const t of tiles) {
    if (isSuit(t)) suits.add(suitOf(t));
    else if ("ESWN".includes(t)) winds.add(t);
    else if ("CFB".includes(t)) dragon = true;
  }
  const red = flowers.some((f) => f.startsWith("SE"));
  const blue = flowers.some((f) => f.startsWith("GR"));
  const door = suits.size === 3 && winds.size >= 1 && dragon;
  if (door && red && blue) push(lines, "七門齊", 15, "萬筒索、一款箭、一款風，紅花藍花各一");
  else if (door && red) push(lines, "五門齊", 10, "萬筒索、一款箭、一款風，再加一隻紅花");
  if (suits.size === 2) push(lines, "缺一門", 5, "番子不計，缺一門數子");
  return suits;
}

function addColors(lines: Line[], tiles: string[], skipQing: boolean) {
  const suits = new Set<string>();
  let honor = false;
  for (const t of tiles) {
    if (isSuit(t)) suits.add(suitOf(t));
    else if (isHonor(t)) honor = true;
  }
  if (suits.size === 0 && honor) push(lines, "字一色", 150, "未計對對胡或嚦咕，三元四喜另計");
  else if (suits.size === 1 && !honor && !skipQing) push(lines, "清一色", 90, suitLabel([...suits][0]));
  else if (suits.size === 1 && honor) push(lines, "混一色", 30, suitLabel([...suits][0]) + "加番子");
}

function addTerminals(h: Hand, lines: Line[], tiles: string[], meldsForQuad: Meld[]) {
  const suitTiles = tiles.filter(isSuit);
  const honor = tiles.some(isHonor);
  const ranks = suitTiles.map(rank);
  const hasSuit = suitTiles.length > 0;
  const allTerm = hasSuit && tiles.every((t) => isSuit(t) && (rank(t) === 1 || rank(t) === 9));
  const allTermOrHonor =
    tiles.every((t) => isHonor(t) || (isSuit(t) && (rank(t) === 1 || rank(t) === 9))) &&
    tiles.some((t) => isSuit(t) && (rank(t) === 1 || rank(t) === 9)) &&
    honor;

  let qingyao = false;
  if (allTerm) {
    qingyao = true;
    push(lines, "清么", 350, "全副么九。兄弟、老少碰唔計；對對胡、四歸另計");
  } else if (allTermOrHonor && h.special?.kind !== "yao" && h.special?.kind !== "budai") {
    push(lines, "混么", 80, "全副么九及番子。對對胡、嚦咕、三元四喜另計");
  }

  const groups = groupsOf(h);
  const standard = !h.special;
  let quan19 = false;
  let quanMid = false;
  if (standard && !honor && hasSuit && groups.length) {
    const every = (r: number) => groups.every((g) => g.some((t) => isSuit(t) && rank(t) === r));
    if (every(1)) {
      quan19 = true;
      push(lines, "全帶一", 120, "已包括全帶么同全細");
    } else if (every(9)) {
      quan19 = true;
      push(lines, "全帶九", 120, "已包括全帶么同全大");
    } else {
      for (let r = 2; r <= 8; r++) {
        if (every(r)) {
          quanMid = true;
          push(lines, "全帶" + ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"][r], 50, "每一組都有呢隻數");
          break;
        }
      }
      const yao = groups.every((g) => g.some((t) => isSuit(t) && (rank(t) === 1 || rank(t) === 9)));
      if (yao && !qingyao) push(lines, "全帶么", 50, "每一組都有么九，無番子");
    }
  }

  if (!honor && hasSuit && !quan19) {
    if (ranks.every((r) => r >= 6 && r <= 9)) {
      push(lines, "全大", quanMid ? 20 : 40, quanMid ? "連全帶，全大只計 20" : "只有六至九");
    }
    if (ranks.every((r) => r >= 1 && r <= 4)) {
      push(lines, "全細", quanMid ? 20 : 40, quanMid ? "連全帶，全細只計 20" : "只有一至四");
    }
  }

  if (!qingyao && !allTermOrHonor && honor && standard && groups.length) {
    const num = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
    const wrap = (rs: number[]) =>
      groups.every((g) => g.some((t) => isHonor(t) || (isSuit(t) && rs.includes(rank(t)))));
    const seen = (rs: number[]) => rs.every((r) => tiles.some((t) => isSuit(t) && rank(t) === r));
    const cnt = (rs: number[]) => tiles.filter((t) => isSuit(t) && rs.includes(rank(t))).length;
    const cands: { fan: number; name: string; inc: boolean }[] = [];
    const add = (rs: number[], fan: number, name: string, inc: boolean) => {
      if (wrap(rs) && seen(rs) && cnt(rs) >= 5) cands.push({ fan, name, inc });
    };
    add([1, 2, 3], 50, "混帶一二三", true);
    add([7, 8, 9], 50, "混帶七八九", true);
    add([1], 35, "混帶一", true);
    add([9], 35, "混帶九", true);
    for (let n = 2; n <= 6; n++) add([n, n + 1, n + 2], 35, `三混帶${num[n]}${num[n + 1]}${num[n + 2]}`, false);
    for (let n = 1; n <= 8; n++) add([n, n + 1], 30, `雙混帶${num[n]}${num[n + 1]}`, false);
    for (let n = 2; n <= 8; n++) add([n], 20, `混帶${num[n]}`, false);
    cands.sort((a, b) => b.fan - a.fan);
    const best = cands[0];
    if (best) push(lines, best.name, best.fan, best.inc ? "已包括混帶么" : "非番子最少五隻");
    const hunYao = groups.every((g) =>
      g.some((t) => isHonor(t) || (isSuit(t) && (rank(t) === 1 || rank(t) === 9))),
    );
    if (hunYao && !best?.inc && suitTiles.length > 0) push(lines, "混帶么", 25, "每一組都有么九或番子");
  }

  if (hasSuit && !honor && ranks.every((r) => r >= 2 && r <= 8)) push(lines, "斷么", 5, "無么九、無番子");
  if (hasSuit && !honor && ranks.every((r) => r !== 5)) push(lines, "缺五", 10, "無五、無番子");

  addQuad(lines, tiles, meldsForQuad);
  addDoors(lines, tiles, h.flowers);
  return qingyao;
}

function addChows(lines: Line[], chows: Chow[]) {
  let yibu = false;
  const starts = chows.map((c) => c.start);
  if ([1, 3, 5, 7].every((n) => starts.includes(n))) {
    yibu = true;
    push(lines, "一步登天", 25, "一二三、三四五、五六七、七八九，唔計平胡");
  }

  const bySeq = new Map<string, Chow[]>();
  for (const c of chows) {
    const list = bySeq.get(c.seq) ?? [];
    list.push(c);
    bySeq.set(c.seq, list);
  }
  for (const [seq, list] of bySeq) {
    const suits = new Set(list.map((c) => c.suit));
    if (suits.size >= 3) {
      const pick: Chow[] = [];
      for (const s of suits) {
        const one = list.find((c) => c.suit === s);
        if (one) pick.push(one);
        if (pick.length === 3) break;
      }
      const an = pick.every((c) => !c.open);
      push(lines, an ? "三相逢（暗）" : "三相逢", an ? 20 : 10, seqLabel(seq));
    } else if (suits.size === 2) {
      push(lines, "二相逢", 2, seqLabel(seq));
    }
    const fourSameSuit = [...suits].some((s) => list.filter((c) => c.suit === s).length >= 4);
    if (list.length >= 4 && !fourSameSuit) {
      const an = list.every((c) => !c.open);
      push(lines, an ? "四同順（暗）" : "四同順", an ? 15 : 5, "相逢、般高另計");
    }
    if (list.length >= 5 && !fourSameSuit) {
      const an = list.every((c) => !c.open);
      push(lines, an ? "五同順（暗）" : "五同順", an ? 15 : 5, "在四同順之上另加");
    }
    for (const s of suits) {
      const same = list.filter((c) => c.suit === s);
      const an = same.every((c) => !c.open);
      if (same.length >= 4) push(lines, an ? "四般高（暗）" : "四般高", an ? 90 : 45, an ? "45+45，唔計四同順" : "唔計四同順");
      else if (same.length >= 3) push(lines, an ? "三般高（暗）" : "三般高", an ? 30 : 15, an ? "15+15" : suitLabel(s));
      else if (same.length >= 2) push(lines, an ? "般高（暗）" : "般高", an ? 10 : 5, an ? "5+5" : suitLabel(s) + seqLabel(seq));
    }
  }

  // 明龍 / 雜龍
  for (const s of ["m", "p", "s"]) {
    const cs = chows.filter((c) => c.suit === s);
    if ([1, 4, 7].every((st) => cs.some((c) => c.start === st))) {
      const used = [1, 4, 7].map((st) => cs.find((c) => c.start === st)!);
      const an = used.every((c) => !c.open);
      push(lines, an ? "明龍（暗）" : "明龍", an ? 20 : 10, suitLabel(s) + "一至九");
    }
  }
  const c1 = chows.filter((c) => c.start === 1);
  const c4 = chows.filter((c) => c.start === 4);
  const c7 = chows.filter((c) => c.start === 7);
  let za: Chow[] | null = null;
  for (const a of c1) for (const b of c4) for (const c of c7) {
    const ss = new Set([a.suit, b.suit, c.suit]);
    if (ss.size === 3) za = [a, b, c];
  }
  if (za) {
    const an = za.every((c) => !c.open);
    push(lines, an ? "雜龍（暗）" : "雜龍", an ? 15 : 8, "三門一至九");
  }

  // 步步高：取最高一組
  let best: { fan: number; name: string; why: string } | null = null;
  for (let i = 0; i < chows.length; i++) {
    for (let j = i + 1; j < chows.length; j++) {
      for (let k = j + 1; k < chows.length; k++) {
        const g = [chows[i], chows[j], chows[k]];
        const st = g.map((c) => c.start).sort((a, b) => a - b);
        if (!(st[0] + 1 === st[1] && st[1] + 1 === st[2])) continue;
        const ss = new Set(g.map((c) => c.suit));
        if (ss.size === 1 && (!best || best.fan < 10)) {
          best = { fan: 10, name: "清色步步高", why: suitLabel(g[0].suit) };
        } else if (ss.size === 3 && (!best || best.fan < 5)) {
          best = { fan: 5, name: "三色步步高", why: "三門步步高" };
        }
      }
    }
  }
  if (best) push(lines, best.name, best.fan, best.why);

  return yibu;
}

function seqLabel(seq: string): string {
  const n = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  return seq.split("").map((d) => n[Number(d)]).join("");
}

function addPungs(h: Hand, lines: Line[], qingyao: boolean) {
  const ps = pungsOf(h.melds);
  for (const p of ps) {
    const t = p.tile;
    if ("ESWN".includes(t)) {
      const zheng = t === h.seat || t === h.round;
      push(lines, zheng ? "正風／正圈" : "偏風", zheng ? 2 : 1, tileName(t) + (zheng ? "（正只計 2）" : ""));
    }
    if ("CFB".includes(t)) push(lines, "箭", 2, tileName(t));
    if (p.kong) push(lines, p.open ? "明槓" : "暗槓", p.open ? 1 : 2, tileName(t));
  }
  const an = ps.filter((p) => !p.open).length;
  const anFan: Record<number, [string, number]> = {
    2: ["二暗刻", 5],
    3: ["三暗刻", 15],
    4: ["四暗刻", 35],
    5: ["五暗刻", 80],
  };
  if (anFan[an]) push(lines, anFan[an][0], anFan[an][1], `${an} 組暗刻`);

  const dragons = new Set(ps.filter((p) => "CFB".includes(p.tile)).map((p) => p.tile));
  const winds = new Set(ps.filter((p) => "ESWN".includes(p.tile)).map((p) => p.tile));
  if (dragons.size === 3) push(lines, "大三元", 50, "中發白刻");
  else if (dragons.size === 2 && "CFB".includes(h.pair) && !dragons.has(h.pair)) push(lines, "小三元", 25, "兩刻一對");
  if (winds.size === 4) push(lines, "大四喜", 120, "東南西北刻");
  else if (winds.size === 3 && "ESWN".includes(h.pair) && !winds.has(h.pair)) push(lines, "小四喜", 60, "三刻一對");
  else if (winds.size === 3) push(lines, "大三風", 40, "三風刻");
  else if (winds.size === 2 && "ESWN".includes(h.pair) && !winds.has(h.pair)) push(lines, "小三風", 20, "兩刻一對");

  if (!qingyao) {
    for (let n = 1; n <= 9; n++) {
      const got = ps.filter((p) => isSuit(p.tile) && rank(p.tile) === n);
      const suits = new Set(got.map((p) => suitOf(p.tile)));
      const pairOk = isSuit(h.pair) && rank(h.pair) === n && !suits.has(suitOf(h.pair));
      if (got.length >= 3) push(lines, "大三兄弟", 20, `${n} 三門刻`);
      else if (got.length === 2 && pairOk) push(lines, "小三兄弟", 10, `${n} 兩刻加眼`);
      else if (got.length === 2) push(lines, "二兄弟", 5, `${n} 兩門刻`);
    }
    addLianPeng(lines, ps);
  }

  const bySuit = new Map<string, number[]>();
  for (const p of ps) {
    if (!isSuit(p.tile)) continue;
    const s = suitOf(p.tile);
    const arr = bySuit.get(s) ?? [];
    arr.push(rank(p.tile));
    bySuit.set(s, arr);
  }
  let xiaoliu = false;
  for (const [s, nums] of bySuit) {
    const uniq = [...new Set(nums)].sort((a, b) => a - b);
    let best: number[] = [];
    let cur: number[] = [];
    for (const n of uniq) {
      if (!cur.length || n === cur[cur.length - 1] + 1) cur.push(n);
      else {
        if (cur.length > best.length) best = cur;
        cur = [n];
      }
    }
    if (cur.length > best.length) best = cur;
    if (best.length < 2) continue;
    const pairN = isSuit(h.pair) && suitOf(h.pair) === s ? rank(h.pair) : 0;
    const ext = pairN === best[0] - 1 || pairN === best[best.length - 1] + 1;
    const table: Record<number, [string, number, string, number]> = {
      2: ["二姊妹", 3, "小三姊妹", 8],
      3: ["三姊妹", 15, "小四姊妹", 25],
      4: ["四姊妹", 40, "小五姊妹", 65],
      5: ["五姊妹", 110, "小六姊妹", 300],
    };
    const row = table[best.length];
    if (!row) continue;
    if (ext && row[2] === "小六姊妹") xiaoliu = true;
    if (!qingyao) push(lines, ext ? row[2] : row[0], ext ? row[3] : row[1], suitLabel(s));
  }
  return xiaoliu;
}

function addLianPeng(lines: Line[], ps: { tile: string; open: boolean }[]) {
  const suitP = ps.filter((p) => isSuit(p.tile)).map((p) => ({ s: suitOf(p.tile), r: rank(p.tile) }));
  let big = false;
  for (let i = 0; i < suitP.length; i++) {
    for (let j = i + 1; j < suitP.length; j++) {
      for (let k = j + 1; k < suitP.length; k++) {
        const g = [suitP[i], suitP[j], suitP[k]];
        const ss = new Set(g.map((x) => x.s));
        const rs = g.map((x) => x.r).sort((a, b) => a - b);
        if (ss.size === 3 && new Set(rs).size === 3 && rs[2] - rs[0] === 2) big = true;
      }
    }
  }
  if (big) push(lines, "三色連碰（大）", 15, "三門刻子數字相連，每手計一次");
}

function addLaoShao(lines: Line[], h: Hand, qingyao: boolean) {
  if (qingyao) return;
  const ch = chowsOf(h.melds);
  const ps = pungsOf(h.melds);
  for (const s of ["m", "p", "s"]) {
    const has = (st: number) => ch.some((c) => c.suit === s && c.start === st);
    if (has(1) && has(7)) push(lines, "老少", 3, suitLabel(s) + "一二三加七八九");
    const pung = (n: number) => ps.some((p) => isSuit(p.tile) && suitOf(p.tile) === s && rank(p.tile) === n);
    if (pung(1) && pung(9)) push(lines, "老少碰", 5, suitLabel(s) + "一一一加九九九");
  }
}

function addWait(h: Hand, lines: Line[], pinghu: boolean) {
  if (pinghu || h.special?.kind === "ligu" || h.special?.kind === "budai") return;
  const w = waitShape(h);
  if (w === "pair") push(lines, "獨獨", 2, "單釣眼");
  else if (w === "pung") push(lines, "對碰", 1, "食刻");
  else if (w === "penchan" || w === "kanchan") push(lines, "假獨", 1, w === "kanchan" ? "嵌張" : "邊張");
}

function addStandard(h: Hand, lines: Line[]): { pinghu: boolean; noHonor: boolean } {
  const tiles = handTiles(h);
  const noHonor = !tiles.some(isHonor);
  const qingyao = addTerminals(h, lines, tiles, h.melds);
  const xiaoliu = addPungs(h, lines, qingyao);
  addLaoShao(lines, h, qingyao);
  const yibu = addChows(lines, chowsOf(h.melds));
  const allPung = h.melds.length === 5 && h.melds.every((m) => m.kind === "pung" || m.kind === "kong");
  if (allPung && !xiaoliu) push(lines, "對對胡", 30, "五組刻");
  addColors(lines, tiles, xiaoliu);

  const allChow = h.melds.length === 5 && h.melds.every((m) => m.kind === "chow");
  const shape = waitShape(h);
  const pinghu = allChow && shape === "ryanmen" && !yibu;
  addWait(h, lines, pinghu);

  if (isSuit(h.pair) && [2, 5, 8].includes(rank(h.pair))) push(lines, "將眼", 2, tileName(h.pair));

  const allOpen = h.melds.length === 5 && h.melds.every((m) => m.open);
  if (allOpen && h.winAt === "pair" && h.winBy === "ron") push(lines, "全求人", 15, "全落地單釣出沖");
  if (allOpen && h.winAt === "pair" && h.winBy === "zimo") push(lines, "半求人", 8, "全落地單釣自摸");

  // 小連碰：兩刻加眼，三門，數字相連。大連碰已在刻子度計過，呢度補小。
  if (!qingyao && isSuit(h.pair)) {
    const ps = pungsOf(h.melds)
      .filter((p) => isSuit(p.tile))
      .map((p) => ({ s: suitOf(p.tile), r: rank(p.tile) }));
    let small = false;
    for (let i = 0; i < ps.length && !small; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const g = [ps[i], ps[j], { s: suitOf(h.pair), r: rank(h.pair) }];
        const ss = new Set(g.map((x) => x.s));
        const rs = g.map((x) => x.r).sort((a, b) => a - b);
        if (ss.size === 3 && new Set(rs).size === 3 && rs[2] - rs[0] === 2) small = true;
      }
    }
    if (small) push(lines, "三色連碰（小）", 8, "兩刻加相連眼，每手計一次");
  }

  return { pinghu, noHonor };
}

function addSpecial(h: Hand, lines: Line[]): { pinghu: boolean; noHonor: boolean } {
  const tiles = handTiles(h);
  const noHonor = !tiles.some(isHonor);
  const sp = h.special!;
  if (sp.kind === "ligu") {
    push(lines, sp.baFei ? "八飛嚦咕" : "嚦咕嚦咕", sp.baFei ? 50 : 40, sp.baFei ? "嚦咕叫八飛" : "八對子");
    addColors(lines, tiles, false);
    addTerminals(h, lines, tiles, []);
    return { pinghu: false, noHonor };
  }
  if (sp.kind === "yao") {
    push(lines, "十三么", 90, "十三么加自摸順子或暗刻");
    const tiles2 = handTiles(h);
    addColors(lines, tiles2, false);
    addTerminals(h, lines, tiles2, [sp.extra]);
    if ((sp.extra.kind === "pung" || sp.extra.kind === "kong") && isHonor(sp.extra.tiles[0])) {
      const t = sp.extra.tiles[0];
      if ("ESWN".includes(t)) {
        const zheng = t === h.seat || t === h.round;
        push(lines, zheng ? "正風／正圈" : "偏風", zheng ? 2 : 1, tileName(t));
      }
      if ("CFB".includes(t)) push(lines, "箭", 2, tileName(t));
    }
    addWait(h, lines, false);
    return { pinghu: false, noHonor };
  }
  push(lines, "十六不搭", 40, "七星加三門不搭，再加眼");
  if (sp.kind === "budai" && sp.bonus === "xiang") push(lines, "十六不搭三相逢（暗）", 20, "另加");
  if (sp.kind === "budai" && sp.bonus === "long") push(lines, "十六不搭雜龍（暗）", 20, "另加");
  addColors(lines, tiles, false);
  addDoors(lines, tiles, h.flowers);
  if (!tiles.some(isHonor) && tiles.filter(isSuit).every((t) => rank(t) !== 5)) push(lines, "缺五", 10, "");
  return { pinghu: false, noHonor };
}

export function scoreHand(h: Hand): { lines: Line[]; total: number } {
  const lines: Line[] = [];
  const info = h.special ? addSpecial(h, lines) : addStandard(h, lines);
  addFlowers(h, lines, info.noHonor, info.pinghu);
  addSituation(h, lines);
  const total = lines.reduce((s, l) => s + l.fan, 0);
  if (total === 1) {
    const from = lines.map((l) => `${l.name}${l.fan}`).join("、");
    if (h.winBy === "zimo") {
      return { lines: [{ name: "鴨胡", fan: 13, why: `自摸雞胡，原本只得 ${from}` }], total: 13 };
    }
    return { lines: [{ name: "雞胡", fan: 25, why: `原本只得 ${from}，出沖雞胡` }], total: 25 };
  }
  lines.sort((a, b) => b.fan - a.fan || a.name.localeCompare(b.name, "zh-Hant"));
  return { lines, total };
}
