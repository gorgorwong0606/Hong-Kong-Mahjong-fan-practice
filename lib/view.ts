import { isMenqing, waitShape } from "./score";
import type { Hand } from "./types";
import { WIND_NAME, tileName, tileSort } from "./tiles";

export type TileFace = { id: string; win: boolean };
export type ViewGroup = { label: string; open: boolean; tiles: TileFace[] };

function faces(tiles: string[], winTile: string, hot: boolean): TileFace[] {
  let used = false;
  return tiles.map((id) => {
    const win = hot && !used && id === winTile;
    if (win) used = true;
    return { id, win };
  });
}

function meldLabel(kind: string, open: boolean) {
  if (kind === "chow") return open ? "上" : "順";
  if (kind === "kong") return open ? "明槓" : "暗槓";
  return open ? "碰" : "暗刻";
}

export function viewHand(h: Hand): { title: string; tags: string[]; groups: ViewGroup[]; note: string } {
  const title = `${WIND_NAME[h.round]}圈 · ${WIND_NAME[h.seat]}門 · ${h.dealer ? "莊家" : "閒家"}`;
  const tags: string[] = [h.winBy === "zimo" ? "自摸" : "出沖"];
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

  const wait = waitShape(h);
  const waitName: Record<string, string> = {
    ryanmen: "兩面",
    penchan: "邊張",
    kanchan: "嵌張",
    pair: "單釣",
    pung: "食刻",
    other: "",
  };
  if (waitName[wait]) tags.push(waitName[wait]);

  const groups: ViewGroup[] = [];
  let note = "暗牌已拆好組，跟畫面計。金邊係食胡嗰隻。";
  if (h.flags.diHu || h.flags.renHu) note += " 地胡、人胡唔計門清。";

  if (h.special?.kind === "ligu") {
    note = h.special.baFei
      ? "特殊牌型：嚦咕嚦咕，叫八飛。八對子，唔使五組一對。"
      : "特殊牌型：嚦咕嚦咕。八對子，三隻一樣唔計碰。";
    tags.push(h.special.baFei ? "八飛" : "嚦咕嚦咕");
    h.special.pairs.forEach((p) => {
      groups.push({ label: "對", open: false, tiles: faces([p, p], h.winTile, p === h.winTile) });
    });
  } else if (h.special?.kind === "yao") {
    note = "特殊牌型：十三么，另三隻係自己摸返嚟嘅順子或暗刻。";
    tags.push("十三么");
    const yaoTiles = [...h.special.singles, h.special.pair, h.special.pair].sort(tileSort);
    groups.push({
      label: "十三么",
      open: false,
      tiles: faces(yaoTiles, h.winTile, h.winTile === h.special.pair),
    });
    const ex = h.special.extra;
    groups.push({
      label: meldLabel(ex.kind, false),
      open: false,
      tiles: faces([...ex.tiles].sort(tileSort), h.winTile, ex.tiles.includes(h.winTile)),
    });
  } else if (h.special?.kind === "budai") {
    note =
      h.special.bonus === "xiang"
        ? "特殊牌型：十六不搭，三門構成三相逢，暗，另加。"
        : h.special.bonus === "long"
          ? "特殊牌型：十六不搭，三門構成雜龍，暗，另加。"
          : "特殊牌型：十六不搭。七星加三門不搭，再加一對眼。";
    tags.push("十六不搭");
    if (h.special.bonus === "xiang") tags.push("三相逢");
    if (h.special.bonus === "long") tags.push("雜龍");
    const honors = [...h.special.honors, h.special.pair, h.special.pair].sort(tileSort);
    groups.push({ label: "字", open: false, tiles: faces(honors, h.winTile, true) });
    const suitName = ["萬", "筒", "索"];
    h.special.cols.forEach((col, i) => {
      groups.push({ label: suitName[i] ?? "數", open: false, tiles: faces([...col].sort(tileSort), h.winTile, false) });
    });
  } else {
    h.melds.forEach((m, i) => {
      const tiles = [...m.tiles].sort(tileSort);
      groups.push({
        label: meldLabel(m.kind, m.open),
        open: m.open,
        tiles: faces(tiles, h.winTile, h.winAt === i),
      });
    });
    groups.push({
      label: "眼",
      open: false,
      tiles: faces([h.pair, h.pair], h.winTile, h.winAt === "pair"),
    });
  }

  return { title, tags, groups, note };
}

export function flowerNames(ids: string[]): string {
  if (!ids.length) return "無花";
  return ids.map(tileName).join(" ");
}
