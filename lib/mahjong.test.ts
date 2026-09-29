import { blankFlags, type Hand, type Meld } from "./types";
import { scoreHand } from "./score";
import { stressBuilders } from "./deal";
import { viewHand } from "./view";

function chow(a: string, b: string, c: string, open = false): Meld {
  return { kind: "chow", tiles: [a, b, c].sort(), open };
}
function pung(t: string, open = false): Meld {
  return { kind: "pung", tiles: [t, t, t], open };
}
function hand(p: Partial<Hand> & Pick<Hand, "melds" | "pair" | "winTile" | "winBy" | "winAt">): Hand {
  return {
    flowers: [],
    seat: "S",
    round: "E",
    dealer: false,
    flags: blankFlags(),
    ...p,
  };
}

function expectScore(h: Hand, expected: Record<string, number>) {
  const { lines, total } = scoreHand(h);
  const got: Record<string, number> = {};
  for (const l of lines) got[l.name] = (got[l.name] ?? 0) + l.fan;
  const problems: string[] = [];
  for (const [k, v] of Object.entries(expected)) {
    if (got[k] !== v) problems.push(`want ${k}=${v}, got ${got[k] ?? "none"}`);
  }
  for (const [k, v] of Object.entries(got)) {
    if (!(k in expected)) problems.push(`extra ${k}=${v}`);
  }
  const exp = Object.values(expected).reduce((a, b) => a + b, 0);
  if (total !== exp) problems.push(`total ${total} vs ${exp}`);
  if (problems.length) {
    throw new Error(problems.join("\n") + "\n" + lines.map((l) => `${l.name} ${l.fan} ${l.why}`).join("\n"));
  }
}

const flags = blankFlags;

expectScore(
  hand({
    melds: [chow("1m", "2m", "3m", true), chow("4m", "5m", "6m"), chow("2p", "3p", "4p"), pung("9s"), chow("6s", "7s", "8s")],
    pair: "E",
    winTile: "4m",
    winBy: "ron",
    winAt: 1,
  }),
  { 雞胡: 25 },
);

expectScore(
  hand({
    seat: "N",
    round: "W",
    dealer: true,
    melds: [chow("1m", "2m", "3m"), chow("4m", "5m", "6m"), chow("2p", "3p", "4p"), chow("6s", "7s", "8s", true), chow("7p", "8p", "9p")],
    pair: "B",
    winTile: "4m",
    winBy: "ron",
    winAt: 1,
  }),
  { 平胡: 5, 無花: 1 },
);

expectScore(
  hand({
    seat: "E",
    round: "E",
    melds: [chow("1m", "2m", "3m"), chow("4m", "5m", "6m"), chow("7m", "8m", "9m"), chow("1p", "2p", "3p"), chow("4p", "5p", "6p")],
    pair: "2s",
    winTile: "4m",
    winBy: "zimo",
    winAt: 1,
  }),
  { 無字花平胡: 15, "明龍（暗）": 20, 將眼: 2, 門清自摸: 8, 老少: 3, 二相逢: 4 },
);

expectScore(
  hand({
    melds: [pung("4m"), pung("5m"), pung("6m"), pung("7m"), pung("8m")],
    pair: "9m",
    winTile: "9m",
    winBy: "zimo",
    winAt: "pair",
  }),
  { 小六姊妹: 300, 坎坎糊: 200, 獨獨: 2, 無字花: 5 },
);

expectScore(
  hand({
    melds: [chow("1m", "2m", "3m"), chow("4m", "5m", "6m"), chow("2p", "3p", "4p"), chow("6s", "7s", "8s"), chow("7p", "8p", "9p")],
    pair: "E",
    winTile: "4m",
    winBy: "ron",
    winAt: 1,
    flags: { ...flags(), diHu: true },
  }),
  { 地胡: 110, 平胡: 5, 無花: 1 },
);

expectScore(
  hand({
    melds: [chow("1m", "2m", "3m"), chow("4m", "5m", "6m"), chow("2p", "3p", "4p"), chow("6s", "7s", "8s"), chow("7p", "8p", "9p")],
    pair: "E",
    winTile: "4m",
    winBy: "zimo",
    winAt: 1,
    flags: { ...flags(), tenpai: true },
  }),
  { 門清聽牌自摸: 20, 平胡: 5, 無花: 1 },
);

expectScore(
  hand({
    melds: [chow("1m", "2m", "3m"), chow("4m", "5m", "6m"), chow("2p", "3p", "4p"), chow("6s", "7s", "8s"), chow("7p", "8p", "9p")],
    pair: "E",
    winTile: "4m",
    winBy: "zimo",
    winAt: 1,
    flags: { ...flags(), tianTing: true },
  }),
  { 天聽: 45, 門清自摸: 8, 平胡: 5, 無花: 1 },
);

expectScore(
  hand({
    seat: "E",
    round: "S",
    melds: [pung("E"), pung("S"), pung("W"), pung("N"), pung("C")],
    pair: "F",
    winTile: "C",
    winBy: "zimo",
    winAt: 4,
  }),
  {
    字一色: 150,
    坎坎糊: 200,
    大四喜: 120,
    "正風／正圈": 4,
    偏風: 2,
    箭: 2,
    對碰: 1,
    無花: 1,
  },
);

expectScore(
  hand({
    melds: [pung("1m"), pung("1p"), pung("1s"), pung("9m"), pung("9p")],
    pair: "9s",
    winTile: "9s",
    winBy: "zimo",
    winAt: "pair",
  }),
  { 清么: 350, 坎坎糊: 200, 缺五: 10, 無字花: 5, 獨獨: 2 },
);

expectScore(
  hand({
    melds: [pung("1m"), pung("1p"), chow("1m", "2m", "3m"), chow("1p", "2p", "3p"), chow("1s", "2s", "3s")],
    pair: "1s",
    winTile: "2s",
    winBy: "zimo",
    winAt: 4,
  }),
  { 全帶一: 120, "四歸二（暗）": 20, "三相逢（暗）": 20, 小三兄弟: 10, 缺五: 10, 門清自摸: 8, 無字花: 5, 二暗刻: 5, 假獨: 1 },
);

expectScore(
  hand({
    melds: [chow("1m", "2m", "3m"), chow("3p", "4p", "5p"), chow("5s", "6s", "7s"), chow("7m", "8m", "9m"), chow("2p", "3p", "4p")],
    pair: "6s",
    winTile: "2p",
    winBy: "zimo",
    winAt: 4,
  }),
  { 一步登天: 25, 門清自摸: 8, 無字花: 5, 老少: 3 },
);

expectScore(
  hand({
    melds: [pung("3m"), pung("3p"), pung("3s"), pung("C"), pung("E")],
    pair: "F",
    winTile: "F",
    winBy: "zimo",
    winAt: "pair",
    seat: "S",
    round: "E",
  }),
  { 坎坎糊: 200, 大三兄弟: 20, 混帶三: 20, 獨獨: 2, 箭: 2, "正風／正圈": 2, 無花: 1 },
);

expectScore(
  hand({
    melds: [],
    pair: "E",
    winTile: "3m",
    winBy: "zimo",
    winAt: "pair",
    special: {
      kind: "yao",
      pair: "E",
      singles: ["1m", "9m", "1p", "9p", "1s", "9s", "S", "W", "N", "C", "F", "B"],
      extra: chow("2m", "3m", "4m"),
    },
  }),
  { 十三么: 90, 門清自摸: 8, 假獨: 1, 無花: 1 },
);

expectScore(
  hand({
    melds: [],
    pair: "1m",
    winTile: "1m",
    winBy: "zimo",
    winAt: "pair",
    special: { kind: "ligu", pairs: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "9m"], baFei: false },
  }),
  { 清一色: 90, 嚦咕嚦咕: 40, 門清自摸: 8, 無字花: 5 },
);

expectScore(
  hand({
    melds: [],
    pair: "E",
    winTile: "E",
    winBy: "ron",
    winAt: "pair",
    special: { kind: "ligu", pairs: ["E", "S", "W", "N", "C", "F", "B", "1m"], baFei: true },
  }),
  { 混一色: 30, 混么: 80, 八飛嚦咕: 50, 門清: 5, 無花: 1 },
);

expectScore(
  hand({
    melds: [chow("1m", "2m", "3m", true), chow("4m", "5m", "6m", true), chow("2p", "3p", "4p", true), chow("6s", "7s", "8s", true), chow("7p", "8p", "9p", true)],
    pair: "E",
    winTile: "E",
    winBy: "ron",
    winAt: "pair",
  }),
  { 全求人: 15, 獨獨: 2, 無花: 1 },
);

expectScore(
  hand({
    melds: [pung("2m"), pung("3p"), pung("4s"), pung("6m"), pung("9p")],
    pair: "5s",
    winTile: "9p",
    winBy: "ron",
    winAt: 4,
  }),
  { 五暗刻: 80, 對對胡: 30, "三色連碰（大）": 15, 無字花: 5, 門清: 5, 將眼: 2, 對碰: 1 },
);

expectScore(
  hand({
    melds: [chow("1m", "2m", "3m"), chow("7m", "8m", "9m"), pung("3p"), pung("3s"), pung("F")],
    pair: "N",
    winTile: "1m",
    winBy: "ron",
    winAt: 0,
  }),
  { 三暗刻: 15, 門清: 5, 二兄弟: 5, 老少: 3, 箭: 2, 無花: 1 },
);

expectScore(
  hand({
    melds: [chow("1m", "2m", "3m"), chow("7m", "8m", "9m"), pung("3p"), pung("3s"), pung("F")],
    pair: "N",
    winTile: "1m",
    winBy: "ron",
    winAt: 0,
    flowers: ["SE2"],
  }),
  { 三暗刻: 15, 五門齊: 10, 門清: 5, 二兄弟: 5, 老少: 3, 箭: 2, 正花: 2 },
);

expectScore(
  hand({
    melds: [chow("1m", "2m", "3m"), chow("7m", "8m", "9m"), pung("3p"), pung("3s"), pung("F")],
    pair: "N",
    winTile: "1m",
    winBy: "ron",
    winAt: 0,
    flowers: ["GR2"],
  }),
  { 三暗刻: 15, 門清: 5, 二兄弟: 5, 老少: 3, 箭: 2, 正花: 2 },
);

expectScore(
  hand({
    seat: "E",
    melds: [chow("1m", "2m", "3m"), chow("7m", "8m", "9m"), pung("3p"), pung("3s"), pung("F")],
    pair: "N",
    winTile: "1m",
    winBy: "ron",
    winAt: 0,
    flowers: ["SE1", "GR3"],
  }),
  { 三暗刻: 15, 七門齊: 15, 門清: 5, 二兄弟: 5, 老少: 3, 箭: 2, 正花: 2, 爛花: 1 },
);

expectScore(
  hand({
    seat: "E",
    round: "S",
    melds: [chow("7m", "8m", "9m", true), pung("5p", true), chow("1m", "2m", "3m"), pung("5s"), pung("C")],
    pair: "W",
    winTile: "1m",
    winBy: "ron",
    winAt: 2,
    flowers: ["SE1", "SE3", "GR4"],
    flags: { ...blankFlags(), tenpai: true, ippatsu: true, wallLeft: 46 },
  }),
  { 七門齊: 15, 聽牌: 5, 一發: 5, 二兄弟: 5, 二暗刻: 5, 老少: 3, 箭: 2, 正花: 2, 爛花: 2 },
);

expectScore(
  hand({
    melds: [chow("1m", "2m", "3m"), chow("7m", "8m", "9m", true), pung("3p"), pung("3s", true), pung("F")],
    pair: "N",
    winTile: "1m",
    winBy: "ron",
    winAt: 0,
  }),
  { 二兄弟: 5, 二暗刻: 5, 老少: 3, 箭: 2, 無花: 1 },
);

function kong(t: string, open = false): Meld {
  return { kind: "kong", tiles: [t, t, t, t], open };
}

expectScore(
  hand({
    melds: [pung("2m"), pung("5p"), pung("8s"), pung("4m"), pung("9p")],
    pair: "9s",
    winTile: "9s",
    winBy: "zimo",
    winAt: "pair",
  }),
  { 坎坎糊: 200, 無字花: 5, 獨獨: 2 },
);

expectScore(
  hand({
    melds: [kong("2m"), pung("5p"), pung("8s"), pung("4m"), pung("9p")],
    pair: "9s",
    winTile: "5p",
    winBy: "zimo",
    winAt: 1,
    flags: { ...flags(), tenpai: true },
  }),
  { 坎坎糊: 200, "四歸一（暗）": 10, 無字花: 5, 聽牌: 5, 暗槓: 2, 對碰: 1 },
);

expectScore(
  hand({
    melds: [pung("2m"), pung("5p", true), pung("8s"), pung("4m"), pung("9p")],
    pair: "9s",
    winTile: "9s",
    winBy: "zimo",
    winAt: "pair",
  }),
  { 對對胡: 30, 四暗刻: 35, 無字花: 5, 自摸: 1, 獨獨: 2 },
);

expectScore(
  hand({
    melds: [pung("C", true), pung("F"), pung("B"), pung("2m"), pung("5p")],
    pair: "8s",
    winTile: "2m",
    winBy: "zimo",
    winAt: 3,
  }),
  { 大三元: 50, 對對胡: 30, 四暗刻: 35, 將眼: 2, 自摸: 1, 對碰: 1, 無花: 1 },
);

expectScore(
  hand({
    melds: [pung("C"), pung("F"), pung("B"), pung("1m"), pung("9m")],
    pair: "5p",
    winTile: "C",
    winBy: "zimo",
    winAt: 0,
  }),
  { 坎坎糊: 200, 大三元: 50, 老少碰: 5, 缺一門: 5, 將眼: 2, 對碰: 1, 無花: 1 },
);

expectScore(
  hand({
    melds: [pung("C"), pung("F"), pung("2m"), pung("5p"), pung("9s")],
    pair: "B",
    winTile: "B",
    winBy: "zimo",
    winAt: "pair",
  }),
  { 坎坎糊: 200, 小三元: 25, 箭: 4, 無花: 1, 獨獨: 2 },
);

const shown = viewHand(
  hand({
    melds: [chow("1m", "2m", "3m"), chow("7m", "8m", "9m", true), pung("3p"), pung("3s", true), pung("F")],
    pair: "N",
    winTile: "1m",
    winBy: "zimo",
    winAt: 0,
  }),
);
if (shown.tags[0] !== "自摸") throw new Error(`tag ${shown.tags[0]}`);
if (shown.called.length !== 2) throw new Error(`called ${shown.called.length}`);
if (shown.win?.id !== "1m") throw new Error("win tile");
if ([...shown.called, ...shown.closed].flat().some((t) => t.id === "1m")) throw new Error("win still in a row");

const errors = stressBuilders(8);
if (errors.length) throw new Error(errors.slice(0, 12).join("\n"));

console.log("ok");
