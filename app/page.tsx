"use client";

import { useEffect, useRef, useState } from "react";
import { dealHand } from "@/lib/deal";
import { scoreHand } from "@/lib/score";
import { FAN_TABLE } from "@/lib/table";
import type { Hand } from "@/lib/types";
import { tileName } from "@/lib/tiles";
import { flowerNames, viewHand, type TileFace } from "@/lib/view";

type Stats = { ok: number; bad: number; streak: number };

function tone(id: string): string {
  if (id.endsWith("m") || id === "C") return "#c23a2e";
  if (id.endsWith("p") || id === "B") return "#1d4e89";
  if (id.endsWith("s") || id === "F") return "#187a43";
  if (id.startsWith("SE") || id.startsWith("GR")) return "#9a3460";
  return "#222";
}

function Tile({ face, flower }: { face: TileFace; flower?: boolean }) {
  return (
    <span className={`tile ${flower ? "flower" : ""} ${face.win ? "win" : ""}`} style={{ color: tone(face.id) }}>
      {face.win && <i className="hu">胡</i>}
      {tileName(face.id)}
    </span>
  );
}

function Table() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
      <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold">番數表</div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full text-left text-sm">
          <tbody>
            {FAN_TABLE.map((row) => (
              <tr key={row.name} className="border-t border-white/10">
                <td className="px-3 py-2 align-top">{row.name}</td>
                <td className="whitespace-nowrap px-2 py-2 align-top text-amber-200">{row.fan}</td>
                <td className="px-3 py-2 align-top text-white/60">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-xs leading-5 text-white/60">
        正花：東春梅、南夏蘭、西秋菊、北冬竹。花胡、七搶一、雪上加霜、圍骰呢類即時牌局，呢度唔出。間間胡未出。
      </p>
    </div>
  );
}

export default function Page() {
  const [hand, setHand] = useState<Hand | null>(null);
  const [raw, setRaw] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [hint, setHint] = useState("");
  const [stats, setStats] = useState<Stats>({ ok: 0, bad: 0, streak: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHand(dealHand());
    try {
      const saved = localStorage.getItem("fan-practice");
      if (saved) setStats(JSON.parse(saved) as Stats);
    } catch {
      /* ignore broken local stats */
    }
  }, []);

  function save(next: Stats) {
    setStats(next);
    localStorage.setItem("fan-practice", JSON.stringify(next));
  }

  function nextHand() {
    setHand(dealHand());
    setRaw("");
    setRevealed(false);
    setHint("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function submit() {
    if (!hand || revealed) return;
    if (!/^\d+$/.test(raw.trim())) {
      setHint("請輸入整數番數");
      return;
    }
    const guess = Number(raw.trim());
    const { total } = scoreHand(hand);
    setRevealed(true);
    setHint("");
    if (guess === total) save({ ok: stats.ok + 1, bad: stats.bad, streak: stats.streak + 1 });
    else save({ ok: stats.ok, bad: stats.bad + 1, streak: 0 });
  }

  if (!hand) {
    return <main className="grid min-h-screen place-items-center text-lg">洗緊牌…</main>;
  }

  const view = viewHand(hand);
  const scored = revealed ? scoreHand(hand) : null;
  const guess = /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : null;
  const correct = scored && guess === scored.total;

  return (
    <main className="mx-auto grid max-w-6xl gap-4 px-3 py-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-6">
      <section className="rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-6">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.2em] text-amber-200/80">港式台牌</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">計番練習</h1>
          </div>
          <p className="text-sm text-white/70">
            連續 {stats.streak} · 啱 {stats.ok} · 錯 {stats.bad}
          </p>
        </header>

        <p className="text-lg">{view.title}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {view.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-amber-50">
              {tag}
            </span>
          ))}
        </div>
        <p className="mt-2 text-sm text-white/60">{view.note}</p>

        <div className="mt-4">
          <p className="mb-1 text-xs text-white/50">花</p>
          {hand.flowers.length ? (
            <div className="flex flex-wrap gap-1.5">
              {hand.flowers.map((id) => (
                <Tile key={id} flower face={{ id, win: false }} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">{flowerNames(hand.flowers)}</p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {view.groups.map((group, i) => (
            <div key={i} className={`max-w-full rounded-2xl px-2 py-2 ${group.open ? "bg-amber-950/40" : "bg-black/25"}`}>
              <p className="mb-1 px-1 text-xs text-white/55">{group.label}</p>
              <div className="flex max-w-full flex-wrap gap-1">
                {group.tiles.map((face, j) => (
                  <Tile key={j} face={face} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <form
          className="mt-6 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="sr-only" htmlFor="fan">
            番數
          </label>
          <input
            id="fan"
            ref={inputRef}
            inputMode="numeric"
            value={raw}
            disabled={revealed}
            placeholder="輸入番數"
            onChange={(e) => setRaw(e.target.value)}
            className="h-12 flex-1 rounded-xl border border-white/15 bg-black/30 px-4 text-lg outline-none focus:border-amber-300"
          />
          {!revealed ? (
            <button className="h-12 rounded-xl bg-amber-300 px-5 font-semibold text-stone-900" type="submit">
              對答案
            </button>
          ) : (
            <button className="h-12 rounded-xl bg-amber-300 px-5 font-semibold text-stone-900" type="button" onClick={nextHand}>
              下一手
            </button>
          )}
        </form>
        {hint && <p className="mt-2 text-sm text-amber-200">{hint}</p>}

        {scored && (
          <div className={`mt-4 rounded-2xl p-4 ${correct ? "bg-emerald-950/70" : "bg-red-950/60"}`}>
            <p className="text-lg font-semibold">
              {correct ? `啱，${scored.total} 番` : `唔啱。你計 ${guess} 番，正確係 ${scored.total} 番`}
            </p>
            {!correct && guess !== null && (
              <p className="mt-1 text-sm text-white/80">
                你{guess < scored.total ? "少" : "多"}計咗 {Math.abs(scored.total - guess)} 番。對住下面明細，睇漏咗定計多咗邊項。
              </p>
            )}
            <ul className="mt-3 divide-y divide-white/10">
              {scored.lines.map((line, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                  <span>
                    {line.name}
                    {line.why ? <span className="ml-2 text-white/50">{line.why}</span> : null}
                  </span>
                  <span className="shrink-0 text-amber-200">{line.fan}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-white/70">
              {scored.lines.map((l) => l.fan).join(" + ")} = {scored.total}
            </p>
          </div>
        )}
      </section>

      <aside className="hidden lg:block">
        <div className="sticky top-4">
          <Table />
        </div>
      </aside>
      <details className="rounded-2xl border border-white/10 bg-black/20 p-4 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold">打開番數表</summary>
        <div className="mt-3">
          <Table />
        </div>
      </details>
    </main>
  );
}
