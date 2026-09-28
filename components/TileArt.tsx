const RED = "#d23b32";
const BLUE = "#1d4e89";
const GREEN = "#178243";
const INK = "#1a1a1a";
const IVORY = "#f7f1e4";

const FONT = '"WenQuanYi Micro Hei", sans-serif';
const NUM = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

const DOTS: Record<number, [number, number][]> = {
  1: [[32, 43]],
  2: [[32, 24], [32, 62]],
  3: [[18, 22], [32, 43], [46, 64]],
  4: [[18, 24], [46, 24], [18, 62], [46, 62]],
  5: [[18, 22], [46, 22], [32, 43], [18, 64], [46, 64]],
  6: [[20, 22], [44, 22], [20, 43], [44, 43], [20, 64], [44, 64]],
  7: [[18, 18], [46, 18], [18, 43], [46, 43], [18, 68], [46, 68], [32, 43]],
  8: [[22, 16], [42, 16], [22, 34], [42, 34], [22, 52], [42, 52], [22, 70], [42, 70]],
  9: [[18, 22], [32, 22], [46, 22], [18, 43], [32, 43], [46, 43], [18, 64], [32, 64], [46, 64]],
};

const DOT_R: Record<number, number> = { 1: 16, 2: 9, 3: 8, 4: 8, 5: 7, 6: 6.5, 7: 5.2, 8: 5, 9: 5 };

function dotColors(n: number): string[] {
  if (n === 2) return [GREEN, RED];
  if (n === 3) return [GREEN, RED, BLUE];
  if (n === 4) return [GREEN, RED, BLUE, GREEN];
  if (n === 5) return [GREEN, BLUE, RED, RED, GREEN];
  if (n === 6) return [GREEN, RED, GREEN, RED, GREEN, RED];
  if (n === 7) return [GREEN, RED, GREEN, RED, GREEN, RED, BLUE];
  if (n === 8) return Array(8).fill(BLUE);
  return [BLUE, GREEN, BLUE, GREEN, RED, GREEN, BLUE, GREEN, BLUE];
}

function Pip({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx} cy={cy} r={r * 0.58} fill={IVORY} />
      <circle cx={cx} cy={cy} r={r * 0.28} fill={color} />
    </g>
  );
}

function Dots({ n }: { n: number }) {
  if (n === 1) {
    return (
      <g>
        <circle cx="32" cy="43" r="18" fill={RED} />
        <circle cx="32" cy="43" r="13.5" fill={IVORY} />
        <circle cx="32" cy="43" r="9" fill={GREEN} />
        <circle cx="32" cy="43" r="4.5" fill={BLUE} />
      </g>
    );
  }
  const colors = dotColors(n);
  return (
    <g>
      {DOTS[n].map(([cx, cy], i) => (
        <Pip key={i} cx={cx} cy={cy} r={DOT_R[n]} color={colors[i]} />
      ))}
    </g>
  );
}

function Stalk({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={w / 2} fill={color} />
      <rect x={x + 1.2} y={y + h * 0.22} width={w - 2.4} height={1.3} fill="rgba(247,241,228,0.55)" />
      <rect x={x + 1.2} y={y + h * 0.48} width={w - 2.4} height={1.6} fill="rgba(247,241,228,0.9)" />
      <rect x={x + 1.2} y={y + h * 0.72} width={w - 2.4} height={1.3} fill="rgba(247,241,228,0.55)" />
    </g>
  );
}

function stalks(n: number) {
  const g = GREEN;
  const r = RED;
  if (n === 2) {
    return [
      { x: 15, y: 12, w: 13, h: 62, color: g },
      { x: 36, y: 12, w: 13, h: 62, color: g },
    ];
  }
  if (n === 3) {
    return [
      { x: 8, y: 14, w: 12, h: 58, color: g },
      { x: 26, y: 14, w: 12, h: 58, color: r },
      { x: 44, y: 14, w: 12, h: 58, color: g },
    ];
  }
  if (n === 4) {
    return [0, 1].flatMap((col) =>
      [0, 1].map((row) => ({ x: 14 + col * 22, y: 12 + row * 34, w: 12, h: 26, color: g })),
    );
  }
  if (n === 5) {
    return [0, 1, 2, 3, 4].map((i) => ({ x: 6 + i * 11, y: 16, w: 8, h: 54, color: i === 2 ? r : g }));
  }
  if (n === 6 || n === 7) {
    const side = [0, 1, 2].flatMap((row) =>
      [0, 1].map((col) => ({ x: 12 + col * 28, y: 10 + row * 24, w: 11, h: 18, color: g })),
    );
    if (n === 6) return side;
    return [...side, { x: 26.5, y: 34, w: 11, h: 18, color: r }];
  }
  if (n === 8) {
    return [0, 1, 2, 3].flatMap((row) =>
      [0, 1].map((col) => ({ x: 16 + col * 20, y: 8 + row * 19, w: 11, h: 15, color: g })),
    );
  }
  return [0, 1, 2].flatMap((row) =>
    [0, 1, 2].map((col) => ({
      x: 8 + col * 18,
      y: 10 + row * 24,
      w: 10,
      h: 18,
      color: row === 1 && col === 1 ? r : g,
    })),
  );
}

function Bamboo({ n }: { n: number }) {
  if (n === 1) {
    return (
      <g>
        <ellipse cx="40" cy="46" rx="13" ry="7" fill={GREEN} />
        <ellipse cx="28" cy="44" rx="13" ry="10" fill={GREEN} />
        <circle cx="16" cy="40" r="8" fill={GREEN} />
        <polygon points="6,40 15,36 15,44" fill={RED} />
        <circle cx="15" cy="38.5" r="1.5" fill={IVORY} />
        <circle cx="14.6" cy="38.5" r="0.7" fill={INK} />
        <path d="M24 40c6 2 10 8 8 14" fill="none" stroke="#146b36" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    );
  }
  const pieces = stalks(n);
  return (
    <g>
      {pieces.map((s, i) => (
        <Stalk key={i} {...s} />
      ))}
      {n === 2 && <rect x="16" y="40" width="32" height="3.2" rx="1" fill={RED} />}
    </g>
  );
}

function FaceText({ children, fill, size = 42 }: { children: string; fill: string; size?: number }) {
  return (
    <text
      x="32"
      y="44"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily={FONT}
      fontSize={size}
      fontWeight="700"
      fill={fill}
    >
      {children}
    </text>
  );
}

function Characters({ n }: { n: number }) {
  return (
    <g>
      <text x="32" y="32" textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontSize="28" fontWeight="700" fill={RED}>
        {NUM[n]}
      </text>
      <text x="32" y="60" textAnchor="middle" dominantBaseline="central" fontFamily={FONT} fontSize="24" fontWeight="700" fill={BLUE}>
        萬
      </text>
    </g>
  );
}

const FLOWER: Record<string, { name: string; fill: string }> = {
  SE1: { name: "春", fill: RED },
  SE2: { name: "夏", fill: RED },
  SE3: { name: "秋", fill: RED },
  SE4: { name: "冬", fill: RED },
  GR1: { name: "梅", fill: BLUE },
  GR2: { name: "蘭", fill: BLUE },
  GR3: { name: "菊", fill: BLUE },
  GR4: { name: "竹", fill: BLUE },
};

function Flower({ id }: { id: string }) {
  const face = FLOWER[id];
  const season = id.startsWith("SE");
  return (
    <g>
      {season ? (
        <g fill={RED}>
          <circle cx="32" cy="22" r="8" />
          <circle cx="32" cy="22" r="3.2" fill={IVORY} />
        </g>
      ) : id === "GR4" ? (
        <g>
          <rect x="24" y="10" width="5" height="24" rx="2.5" fill={BLUE} />
          <rect x="35" y="12" width="5" height="22" rx="2.5" fill={BLUE} />
        </g>
      ) : (
        <g fill={BLUE}>
          <circle cx="32" cy="16" r="4.2" />
          <circle cx="24" cy="22" r="4.2" />
          <circle cx="40" cy="22" r="4.2" />
          <circle cx="27" cy="30" r="4.2" />
          <circle cx="37" cy="30" r="4.2" />
          <circle cx="32" cy="23" r="2.4" fill={IVORY} />
        </g>
      )}
      <text
        x="32"
        y="62"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={FONT}
        fontSize="24"
        fontWeight="700"
        fill={face.fill}
      >
        {face.name}
      </text>
    </g>
  );
}

export function TileArt({ id }: { id: string }) {
  let body = <FaceText fill={INK}>{id}</FaceText>;
  if (/^[1-9]m$/.test(id)) body = <Characters n={Number(id[0])} />;
  else if (/^[1-9]p$/.test(id)) body = <Dots n={Number(id[0])} />;
  else if (/^[1-9]s$/.test(id)) body = <Bamboo n={Number(id[0])} />;
  else if (id === "E") body = <FaceText fill={RED}>東</FaceText>;
  else if (id === "S") body = <FaceText fill={GREEN}>南</FaceText>;
  else if (id === "W") body = <FaceText fill={BLUE}>西</FaceText>;
  else if (id === "N") body = <FaceText fill={INK}>北</FaceText>;
  else if (id === "C") body = <FaceText fill={RED}>中</FaceText>;
  else if (id === "F") body = <FaceText fill={GREEN}>發</FaceText>;
  else if (id === "B") {
    body = <rect x="16" y="18" width="32" height="50" rx="2.5" fill="none" stroke={BLUE} strokeWidth="3.5" />;
  } else if (FLOWER[id]) body = <Flower id={id} />;

  return (
    <svg viewBox="0 0 64 86" aria-hidden="true">
      {body}
    </svg>
  );
}
