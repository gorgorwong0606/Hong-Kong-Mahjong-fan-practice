import type { Wind } from "./types";

export const WIND_NAME: Record<Wind, string> = {
  E: "東",
  S: "南",
  W: "西",
  N: "北",
};

const NUM = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const SUIT: Record<string, string> = { m: "萬", p: "筒", s: "索" };

const FLOWER: Record<string, string> = {
  SE1: "春",
  SE2: "夏",
  SE3: "秋",
  SE4: "冬",
  GR1: "梅",
  GR2: "蘭",
  GR3: "菊",
  GR4: "竹",
};

/** Seat flower: 春梅東、夏蘭南、秋菊西、冬竹北. */
export const FLOWER_SEAT: Record<string, Wind> = {
  SE1: "E",
  SE2: "S",
  SE3: "W",
  SE4: "N",
  GR1: "E",
  GR2: "S",
  GR3: "W",
  GR4: "N",
};

export const SEASONS = ["SE1", "SE2", "SE3", "SE4"];
export const GRASSES = ["GR1", "GR2", "GR3", "GR4"];

export function isSuit(t: string): boolean {
  return /^[1-9][mps]$/.test(t);
}

export function isHonor(t: string): boolean {
  return t === "E" || t === "S" || t === "W" || t === "N" || t === "C" || t === "F" || t === "B";
}

export function isFlower(t: string): boolean {
  return t in FLOWER;
}

export function rank(t: string): number {
  return Number(t[0]);
}

export function suitOf(t: string): string {
  return t[1];
}

export function tileName(id: string): string {
  if (id === "E") return "東";
  if (id === "S") return "南";
  if (id === "W") return "西";
  if (id === "N") return "北";
  if (id === "C") return "中";
  if (id === "F") return "發";
  if (id === "B") return "白";
  if (FLOWER[id]) return FLOWER[id];
  if (isSuit(id)) return NUM[rank(id)] + SUIT[suitOf(id)];
  return id;
}

export function suitLabel(s: string): string {
  return SUIT[s] ?? s;
}

const ORDER = [
  "1m","2m","3m","4m","5m","6m","7m","8m","9m",
  "1p","2p","3p","4p","5p","6p","7p","8p","9p",
  "1s","2s","3s","4s","5s","6s","7s","8s","9s",
  "E","S","W","N","C","F","B",
];

export function tileSort(a: string, b: string): number {
  return ORDER.indexOf(a) - ORDER.indexOf(b);
}

export const YAO_TYPES = [
  "1m",
  "9m",
  "1p",
  "9p",
  "1s",
  "9s",
  "E",
  "S",
  "W",
  "N",
  "C",
  "F",
  "B",
];
