import { isMenqing, waitShape } from "./score";
import type { Hand, Meld } from "./types";
import { WIND_NAME, tileSort } from "./tiles";

export type TileFace = { id: string; win: boolean };

export type HandView = {
  title: string;
  tags: string[];
  note: string;
  called: TileFace[][];
  closed: TileFace[][];
  win: TileFace | null;
};

function sorted(tiles: string[]): string[] {
  return [...tiles].sort(tileSort);
}

function splitWin(tiles: string[], hot: boolean, winTile: string): { rest: TileFace[]; win: TileFace | null } {
  const rest: TileFace[] = [];
  let win: TileFace | null = null;
  for (const id of tiles) {
    if (hot && !win && id === winTile) win = { id, win: true };
    else rest.push({ id, win: false });
  }
  return { rest, win };
}

function meldTiles(m: Meld): string[] {
  return sorted(m.tiles);
}

export function viewHand(h: Hand): HandView {
  const title = `${WIND_NAME[h.round]}圈 · ${WIND_NAME[h.seat]}門 · ${h.dealer ? "莊家" : "閒家"}`;
  const tags: string[] = [h.winBy === "zimo" ? "自摸" : "食出"];
  if (isMenqing(h) && !h.flags.diHu && !h.flags.renHu) tags.push("門清");
  const f = h.flags;
  if (f.tenpai) tags.push("聽牌");
  if (f.ippatsu) tags.push("一發");
  if (f.tianTing) tags.push("天聽");
  if (f.tianHu) tags.push("天胡");
  if (f.diHu) tags.push("地胡");
  if (f.renHu) tags.push("人胡");
  if (f.haitei) tags.push(h.winTile === "1p" ? "真海底（一筒）" : "海底撈月");
  if (f.houtei) tags.push("河底撈魚");
  if (f.huaShang) tags.push("花上");
  if (f.gangShangGang === 2) tags.push("槓上槓上槓");
  else if (f.gangShangGang === 1) tags.push("槓上槓");
  else if (f.gangShang) tags.push("槓上");
  if (f.qiangGangGang) tags.push("搶槓上槓");
  else if (f.qiangGang) tags.push("搶槓");
  tags.push(`牌牆剩 ${f.wallLeft} 隻`);
  const waitName: Record<string, string> = {
    ryanmen: "兩面",
    penchan: "邊張",
    kanchan: "嵌張",
    pair: "單釣",
    pung: "食刻",
    other: "",
  };
  const wait = waitName[waitShape(h)];
  if (wait) tags.push(wait);

  const called: TileFace[][] = [];
  const closed: TileFace[][] = [];
  let win: TileFace | null = null;
  const take = (tiles: string[], hot: boolean) => {
    const part = splitWin(tiles, hot, h.winTile);
    if (part.win) win = part.win;
    return part.rest;
  };

  if (h.special?.kind === "ligu") {
    h.special.pairs.forEach((p) => {
      const rest = take([p, p], p === h.winTile);
      if (rest.length) closed.push(rest);
    });
  } else if (h.special?.kind === "yao") {
    const yao = sorted([...h.special.singles, h.special.pair, h.special.pair]);
    const rest = take(yao, h.winTile === h.special.pair);
    if (rest.length) closed.push(rest);
    const extra = take(sorted(h.special.extra.tiles), h.special.extra.tiles.includes(h.winTile));
    if (extra.length) closed.push(extra);
  } else if (h.special?.kind === "budai") {
    const honors = sorted([...h.special.honors, h.special.pair, h.special.pair]);
    const rest = take(honors, true);
    if (rest.length) closed.push(rest);
    h.special.cols.forEach((col) => {
      const tiles = take(sorted(col), false);
      if (tiles.length) closed.push(tiles);
    });
  } else {
    h.melds.forEach((m, i) => {
      const rest = take(meldTiles(m), h.winAt === i);
      if (!rest.length) return;
      if (m.open) called.push(rest);
      else closed.push(rest);
    });
    const pair = take([h.pair, h.pair], h.winAt === "pair");
    if (pair.length) closed.push(pair);
  }

  const note = h.special
    ? "打橫嗰隻係今次食胡。"
    : called.length
      ? "上面係出街嘅牌，下面係手牌。打橫嗰隻係今次食胡。"
      : "冇出街，全部係手牌。打橫嗰隻係今次食胡。";

  return { title, tags, note, called, closed, win };
}
