import { useId } from "react";
import type { AvatarSpec } from "@/lib/types";

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb colour. */
export function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const GOLD = "#d9a93b";
const INK = "#221c18";

/** A flat illustrated portrait drawn from a handful of parameters. Recognisable by signature features, never a photo. */
export function Avatar({ spec, size = 40, className, ring }: { spec: AvatarSpec; size?: number; className?: string; ring?: string }) {
  const uid = useId().replace(/:/g, "");
  const a = spec;
  const skin = a.skin;
  const skinDark = shade(skin, -0.14);
  const line = shade(skin, -0.32);
  const hc = a.hairColor;
  const fc = a.facialColor || hc;
  const oc = a.outfitColor;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-hidden="true" style={{ flex: "none" }}>
      <defs>
        <clipPath id={`c${uid}`}><circle cx="50" cy="50" r="50" /></clipPath>
      </defs>
      <g clipPath={`url(#c${uid})`}>
        <rect width="100" height="100" fill={a.bg} />
        <circle cx="78" cy="18" r="30" fill="#fff" opacity="0.08" />
        <BackHair a={a} />
        <path d="M43 56 L43 77 L57 77 L57 56Z" fill={skinDark} />
        {a.outfit === "hoodie" && <path d="M30 78 C32 64 68 64 70 78" stroke={shade(oc, -0.18)} strokeWidth="6" fill="none" />}
        <path d="M11 101 C12 83 28 73 50 73 C72 73 88 83 89 101Z" fill={oc} />
        <Outfit a={a} neck={skinDark} />
        {a.accessory === "elfears" ? (
          <g fill={skinDark}>
            <path d="M35 42 C24 38 12 34 4 33 C10 40 20 50 35 54Z" />
            <path d="M65 42 C76 38 88 34 96 33 C90 40 80 50 65 54Z" />
            <path d="M33 44 C25 41 17 39 11 38 C16 43 23 48 33 51Z" fill={shade(skin, 0.12)} opacity="0.5" />
            <path d="M67 44 C75 41 83 39 89 38 C84 43 77 48 67 51Z" fill={shade(skin, 0.12)} opacity="0.5" />
          </g>
        ) : (
          <>
            <ellipse cx="33" cy="48" rx="3.4" ry="5" fill={skinDark} />
            <ellipse cx="67" cy="48" rx="3.4" ry="5" fill={skinDark} />
          </>
        )}
        <ellipse cx="50" cy="46" rx="17" ry="20" fill={skin} />
        {(a.hair === "bald" || a.hair === "receding") && <ellipse cx="44" cy="31" rx="5.5" ry="2.4" fill="#fff" opacity="0.2" />}
        <circle cx="40.5" cy="55" r="3.2" fill="#ff6b6b" opacity="0.13" />
        <circle cx="59.5" cy="55" r="3.2" fill="#ff6b6b" opacity="0.13" />
        <Brows a={a} />
        <ellipse cx="43" cy="47.5" rx="1.75" ry="2.15" fill={INK} />
        <ellipse cx="57" cy="47.5" rx="1.75" ry="2.15" fill={INK} />
        <circle cx="43.6" cy="46.7" r="0.55" fill="#fff" />
        <circle cx="57.6" cy="46.7" r="0.55" fill="#fff" />
        <path d="M50.5 48.5 C49 52 48.4 54 50 55 C51 55.4 52 55 52.6 54.4" stroke={line} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <Facial a={a} color={fc} />
        <FrontHair a={a} />
        <Glasses kind={a.glasses} />
        <Accessory a={a} />
      </g>
      {ring && <circle cx="50" cy="50" r="48.5" fill="none" stroke={ring} strokeWidth="3" />}
    </svg>
  );
}

function BackHair({ a }: { a: AvatarSpec }) {
  const c = a.hairColor;
  switch (a.hair) {
    case "wild": {
      const puffs: [number, number, number][] = [[29, 41, 9], [27, 53, 8], [33, 29, 9], [42, 21, 9], [55, 20, 9], [66, 26, 9], [72, 38, 9], [74, 51, 8], [30, 62, 5], [70, 62, 5]];
      return <g fill={c}>{puffs.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g>;
    }
    case "curly": {
      const puffs: [number, number, number][] = [[34, 33, 8], [41, 25, 8], [50, 22.5, 8], [59, 25, 8], [66, 33, 8], [31, 43, 7], [69, 43, 7], [31, 52, 5.5], [69, 52, 5.5]];
      return <g fill={c}>{puffs.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g>;
    }
    case "long":
      return <path d="M30 44 C29 23 40 18.5 50 18.5 C60 18.5 71 23 70 44 L72 80 C65 82 59 78 58 71 L42 71 C41 78 35 82 28 80Z" fill={c} />;
    case "bob":
      return <path d="M29.5 46 C29 24 40 19.5 50 19.5 C60 19.5 71 24 70.5 46 L71 65 L29 65Z" fill={c} />;
    case "bun":
      return <circle cx="50" cy="19" r="7.5" fill={c} />;
    case "receding":
      return <path d="M31 40 C30 52 31 60 34 64 L38 64 L36 40Z M69 40 C70 52 69 60 66 64 L62 64 L64 40Z" fill={c} />;
    default:
      return null;
  }
}

function FrontHair({ a }: { a: AvatarSpec }) {
  const c = a.hairColor;
  switch (a.hair) {
    case "short":
      return <path d="M32.5 46 C31 30 39 23.5 50 23.5 C61 23.5 69 30 67.5 46 C66 38 62 33.5 55 32.5 C50 34.5 42 33 38 35 C35 37.5 33.5 41 32.5 46Z" fill={c} />;
    case "buzz":
      return <path d="M33 43 C32.5 29 41 25 50 25 C59 25 67.5 29 67 43 C63 34 57 31.5 50 31.5 C43 31.5 37 34 33 43Z" fill={c} opacity="0.55" />;
    case "receding":
      return <path d="M33 47 C32 40 33 35 37 32 C36 37 36 42 37 47Z M67 47 C68 40 67 35 63 32 C64 37 64 42 63 47Z" fill={c} />;
    case "sidepart":
      return (
        <g fill={c}>
          <path d="M32.5 46 C30 28 42 22 52 22.5 C62 23 70 30 67.5 46 C66 37 63 32 58 30.5 C50 32 40 30.5 36 36 C34 39 33 42 32.5 46Z" />
          <path d="M44 24 C40 26 37 29 35.5 33" stroke={shade(c, 0.25)} strokeWidth="0.9" fill="none" opacity="0.6" />
        </g>
      );
    case "pompadour":
      return <path d="M32.5 44 C31 27 36 15 50 14.5 C64 15 70 26 67.5 44 C66 36 62 31 54 30 C46 29 38 33 32.5 44Z" fill={c} />;
    case "wild":
      return <path d="M34 41 C36 30 44 27 50 28 C56 27 64 30 66 41 C62 35 56 33.5 50 34.5 C44 33.5 38 35 34 41Z" fill={c} />;
    case "curly": {
      const curls: [number, number][] = [[37.5, 33], [43.5, 29.5], [50, 28.5], [56.5, 29.5], [62.5, 33]];
      return <g fill={c}>{curls.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" />)}</g>;
    }
    case "long":
      return <path d="M32.5 50 C31 30 40 23 50 23 C60 23 69 30 67.5 50 C65 38 59 30 50.5 28 C49.5 28 41 30 37 37 C35 41 33.5 45 32.5 50Z" fill={c} />;
    case "bob":
      return <path d="M33 41 C32 27.5 40 22.5 50 22.5 C60 22.5 68 27.5 67 41Z" fill={c} />;
    case "bun":
      return <path d="M32.5 46 C31 29 40 23.5 50 23.5 C60 23.5 69 29 67.5 46 C65 36 59 31.5 50 31.5 C41 31.5 35 36 32.5 46Z" fill={c} />;
    case "braidcrown":
      return (
        <g>
          <path d="M32.5 46 C31 29 40 24 50 24 C60 24 69 29 67.5 46 C65 36 59 32 50 32 C41 32 35 36 32.5 46Z" fill={c} />
          <path d="M31.5 37 C35 21 65 21 68.5 37" stroke={c} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M31.5 37 C35 21 65 21 68.5 37" stroke={shade(c, 0.22)} strokeWidth="5" fill="none" strokeDasharray="2.2 2.4" strokeLinecap="round" />
        </g>
      );
    case "mohawk":
      return (
        <g fill={c}>
          <path d="M34 42 C33.5 30 41 26.5 50 26.5 C59 26.5 66.5 30 66 42 C62 35 57 32 50 32 C43 32 38 35 34 42Z" opacity="0.35" />
          <path d="M45 31 C43.5 19 46 10 50 7.5 C54 10 56.5 19 55 31 C53 29 47 29 45 31Z" />
        </g>
      );
    default:
      return null;
  }
}

function Brows({ a }: { a: AvatarSpec }) {
  const c = a.hairColor === "#ffffff" || a.hair === "bald" ? shade(a.facialColor || a.hairColor, -0.1) : a.hairColor;
  const color = a.hair === "bald" && !a.facialColor ? shade(a.skin, -0.5) : c;
  switch (a.brows) {
    case "bushy":
      return <g stroke={color} strokeWidth="2.8" strokeLinecap="round" fill="none"><path d="M38.5 42.5 Q43 39.6 47 42" /><path d="M53 42 Q57 39.6 61.5 42.5" /></g>;
    case "unibrow":
      return <path d="M38.5 42.6 Q44 39.6 50 41.6 Q56 39.6 61.5 42.6" stroke={color} strokeWidth="2.3" strokeLinecap="round" fill="none" />;
    case "arched":
      return <g stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"><path d="M39 43 Q42.5 39 47 41.6" /><path d="M53 41.6 Q57.5 39 61 43" /></g>;
    default:
      return <g stroke={color} strokeWidth="1.7" strokeLinecap="round" fill="none"><path d="M39 42.6 Q43 40.6 47 42.2" /><path d="M53 42.2 Q57 40.6 61 42.6" /></g>;
  }
}

const MUSTACHE = "M43.5 58.6 C45 56 48 56 50 57 C52 56 55 56 56.5 58.6 C54 58.4 52 58.8 50 58.4 C48 58.8 46 58.4 43.5 58.6Z";
const BEARD = "M33.2 48 C33 60 39 69.5 50 69.5 C61 69.5 67 60 66.8 48 C66 55 62 58.5 57 58.5 C54 57 46 57 43 58.5 C38 58.5 34 55 33.2 48Z";
const MOUTH = "M45.5 60.6 Q50 63.2 54.5 60.6";

function Facial({ a, color }: { a: AvatarSpec; color: string }) {
  const mouth = <path d={MOUTH} stroke="#8a4134" strokeWidth="1.5" fill="none" strokeLinecap="round" />;
  switch (a.facial) {
    case "stubble":
      return <g><path d={BEARD} fill={color} opacity="0.3" /><path d={MUSTACHE} fill={color} opacity="0.35" />{mouth}</g>;
    case "mustache":
      return <g>{mouth}<path d={MUSTACHE} fill={color} /></g>;
    case "walrus":
      return <g>{mouth}<path d="M41 61 C41.5 55.5 47 54.2 50 55.8 C53 54.2 58.5 55.5 59 61 C56.5 59.4 53 59.6 50 59.3 C47 59.6 43.5 59.4 41 61Z" fill={color} /></g>;
    case "goatee":
      return <g><path d="M44.5 61.5 C44.5 66.5 47 69 50 69 C53 69 55.5 66.5 55.5 61.5 C53 63.4 47 63.4 44.5 61.5Z" fill={color} />{mouth}<path d={MUSTACHE} fill={color} /></g>;
    case "beard":
      return <g><path d={BEARD} fill={color} />{mouth}<path d={MUSTACHE} fill={color} /></g>;
    case "bigbeard":
      return <g><path d="M33 48 C31 66 38 81 50 82 C62 81 69 66 67 48 C66 55 62 58.5 57 58.5 C54 57 46 57 43 58.5 C38 58.5 34 55 33 48Z" fill={color} />{mouth}<path d={MUSTACHE} fill={color} /></g>;
    default:
      return mouth;
  }
}

function Glasses({ kind }: { kind: string }) {
  const s = { stroke: "#2a2522", strokeWidth: 1.3, fill: "rgba(255,255,255,0.14)" };
  switch (kind) {
    case "round":
      return <g {...s}><circle cx="43" cy="47.5" r="4.6" /><circle cx="57" cy="47.5" r="4.6" /><path d="M47.6 47 Q50 45.6 52.4 47 M38.4 46.6 L33.5 45.8 M61.6 46.6 L66.5 45.8" fill="none" /></g>;
    case "square":
      return <g {...s}><rect x="37.6" y="43.6" width="10.6" height="7.8" rx="1.6" /><rect x="51.8" y="43.6" width="10.6" height="7.8" rx="1.6" /><path d="M48.2 46.6 L51.8 46.6 M37.6 46 L33.5 45.6 M62.4 46 L66.5 45.6" fill="none" /></g>;
    case "small":
      return <g {...s}><ellipse cx="43" cy="49.6" rx="3.7" ry="2.6" /><ellipse cx="57" cy="49.6" rx="3.7" ry="2.6" /><path d="M46.7 49.2 Q50 48 53.3 49.2" fill="none" /></g>;
    default:
      return null;
  }
}

function Outfit({ a, neck }: { a: AvatarSpec; neck: string }) {
  const oc = a.outfitColor;
  const dark = shade(oc, -0.22);
  switch (a.outfit) {
    case "tee":
      return <g><path d="M42 73.2 Q50 81 58 73.2Z" fill={neck} /><path d="M41.6 73.4 Q50 81.5 58.4 73.4" stroke={dark} strokeWidth="1.6" fill="none" /></g>;
    case "suit":
      return (
        <g>
          <path d="M42 73.5 L50 89 L58 73.5Z" fill="#f4f1ea" />
          <path d="M48.6 76 L51.4 76 L52.6 91 L50 94 L47.4 91Z" fill={shade(oc, -0.45)} />
          <path d="M41.5 73.6 L50 89 L45 101 L37 101 L36 77Z" fill={dark} />
          <path d="M58.5 73.6 L50 89 L55 101 L63 101 L64 77Z" fill={dark} />
        </g>
      );
    case "turtleneck":
      return <g><path d="M41.6 63 L58.4 63 L59.5 75.5 Q50 78.5 40.5 75.5Z" fill={oc} /><path d="M42 67 L58 67 M41.6 71 L58.4 71" stroke={dark} strokeWidth="0.8" /></g>;
    case "toga":
      return <g stroke={dark} fill="none"><path d="M28 77 C40 84 56 92 72 101" strokeWidth="2.6" /><path d="M22 85 C36 90 48 96 56 101" strokeWidth="1.4" /><path d="M42 73.2 Q50 79 58 73.2" strokeWidth="1.2" /></g>;
    case "dress":
      return <path d="M38 73.8 Q50 87 62 73.8Z" fill={neck} />;
    case "uniform":
      return (
        <g>
          <path d="M41.6 65 L58.4 65 L59.5 75 L40.5 75Z" fill={dark} stroke={GOLD} strokeWidth="1" />
          <ellipse cx="24" cy="81" rx="9" ry="3.6" fill={GOLD} transform="rotate(-22 24 81)" />
          <ellipse cx="76" cy="81" rx="9" ry="3.6" fill={GOLD} transform="rotate(22 76 81)" />
          {[82, 89, 96].map((y) => <circle key={y} cx="50" cy={y} r="1.4" fill={GOLD} />)}
        </g>
      );
    case "ruff": {
      const n = 14;
      return (
        <g>
          <ellipse cx="50" cy="72" rx="17.5" ry="6" fill="#f4efe4" stroke="#d3cbb9" strokeWidth="0.8" />
          {Array.from({ length: n }, (_, i) => {
            const t = (i / n) * Math.PI * 2;
            return <path key={i} d={`M50 72 L${50 + Math.cos(t) * 17} ${72 + Math.sin(t) * 5.8}`} stroke="#d3cbb9" strokeWidth="0.6" />;
          })}
        </g>
      );
    }
    case "coat":
      return (
        <g>
          <path d="M41.5 73.6 L48 86 L44 101 L36 101 L35 77Z" fill={dark} />
          <path d="M58.5 73.6 L52 86 L56 101 L64 101 L65 77Z" fill={dark} />
          <path d="M45.5 71.5 L54.5 71.5 L56 82 Q50 86 44 82Z" fill="#f3efe6" stroke="#d6cfc0" strokeWidth="0.7" />
        </g>
      );
    case "cardigan":
      return (
        <g>
          <path d="M42.5 73.4 L50 87 L57.5 73.4Z" fill="#ece5d6" />
          <path d="M50 87 L50 101" stroke={dark} strokeWidth="1.2" />
          {[91, 97].map((y) => <circle key={y} cx="52.6" cy={y} r="1.2" fill={dark} />)}
        </g>
      );
    case "hoodie":
      return <g><path d="M42 73.2 Q50 80 58 73.2Z" fill={neck} /><path d="M46 77 L45.5 90 M54 77 L54.5 90" stroke="#f2efe8" strokeWidth="1.2" strokeLinecap="round" /></g>;
    default:
      return null;
  }
}

function Accessory({ a }: { a: AvatarSpec }) {
  switch (a.accessory) {
    case "headphones":
      return (
        <g>
          <path d="M31.5 45 C30 15 70 15 68.5 45" stroke="#26262a" strokeWidth="3.2" fill="none" />
          <rect x="26.5" y="40" width="8" height="14" rx="3.4" fill="#2f2f34" />
          <rect x="65.5" y="40" width="8" height="14" rx="3.4" fill="#2f2f34" />
        </g>
      );
    case "laurel": {
      const leaves = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const x = (1 - t) ** 2 * 33 + 2 * (1 - t) * t * 50 + t ** 2 * 67;
        const y = (1 - t) ** 2 * 37 + 2 * (1 - t) * t * 19 + t ** 2 * 37;
        const ang = -60 + t * 120;
        leaves.push(<ellipse key={i} cx={x} cy={y} rx="3.4" ry="1.6" fill={i % 2 ? "#7c9a3e" : "#5f7f2c"} transform={`rotate(${ang + (i % 2 ? 35 : -35)} ${x} ${y})`} />);
      }
      return <g>{leaves}</g>;
    }
    case "circlet":
      return (
        <g>
          <path d="M33 37 C40 32.5 60 32.5 67 37" stroke={GOLD} strokeWidth="2.6" fill="none" />
          <circle cx="50" cy="33.4" r="2.8" fill={GOLD} />
          <circle cx="50" cy="33.4" r="1.2" fill="#2f7d8c" />
          <circle cx="33" cy="56" r="2" fill={GOLD} />
          <circle cx="67" cy="56" r="2" fill={GOLD} />
        </g>
      );
    case "bicorne":
      return (
        <g>
          <path d="M16 31 C24 18 39 9.5 50 11.5 C61 9.5 76 18 84 31 C72 27.5 61 28.5 50 32 C39 28.5 28 27.5 16 31Z" fill="#1b1b22" />
          <circle cx="62" cy="22" r="3.6" fill="#2a4fa0" />
          <circle cx="62" cy="22" r="2.4" fill="#f4f1ea" />
          <circle cx="62" cy="22" r="1.2" fill="#c8322f" />
        </g>
      );
    case "flowers":
      return (
        <g>
          {([[35, 29, "#e8435a"], [50, 22.5, "#f2b632"], [65, 29, "#d9467e"]] as const).map(([x, y, c]) => (
            <g key={x}>
              {[0, 72, 144, 216, 288].map((r) => <circle key={r} cx={x + Math.cos((r * Math.PI) / 180) * 2.6} cy={y + Math.sin((r * Math.PI) / 180) * 2.6} r="2.4" fill={c} />)}
              <circle cx={x} cy={y} r="1.5" fill="#fff3c4" />
            </g>
          ))}
        </g>
      );
    case "earrings":
      return <g fill={GOLD}><circle cx="33" cy="55.5" r="1.9" /><circle cx="67" cy="55.5" r="1.9" /></g>;
    case "pearls": {
      const dots = [];
      for (let i = 0; i <= 9; i++) {
        const t = i / 9;
        const x = (1 - t) ** 2 * 40 + 2 * (1 - t) * t * 50 + t ** 2 * 60;
        const y = (1 - t) ** 2 * 74.5 + 2 * (1 - t) * t * 84 + t ** 2 * 74.5;
        dots.push(<circle key={i} cx={x} cy={y} r="1.35" fill="#fbf7ef" stroke="#d8d0c0" strokeWidth="0.3" />);
      }
      return <g>{dots}</g>;
    }
    case "bowtie":
      return <g fill="#1d1d24"><path d="M43.5 73 L50 76 L43.5 79Z" /><path d="M56.5 73 L50 76 L56.5 79Z" /><circle cx="50" cy="76" r="1.5" /></g>;
    case "eyepatch":
      return <g><path d="M33 39 L67 51" stroke="#151515" strokeWidth="1.2" /><ellipse cx="57" cy="47.6" rx="4.6" ry="4.1" fill="#151515" /></g>;
    case "beanie":
      return <g><path d="M31 41 C30 19 70 19 69 41Z" fill={a.outfitColor} /><rect x="30.5" y="35" width="39" height="7" rx="3" fill={shade(a.outfitColor, -0.18)} /></g>;
    default:
      return null;
  }
}

/** Overlapping avatars for a group. */
export function AvatarStack({ specs, size = 28 }: { specs: AvatarSpec[]; size?: number }) {
  const shown = specs.slice(0, 3);
  return (
    <div className="flex items-center" style={{ minWidth: size }}>
      {shown.map((s, i) => (
        <div key={i} className="rounded-full ring-2 ring-[var(--panel)]" style={{ marginLeft: i ? -size * 0.38 : 0, zIndex: 3 - i }}>
          <Avatar spec={s} size={size} />
        </div>
      ))}
      {specs.length > 3 && <span className="ml-1 text-xs text-mute">+{specs.length - 3}</span>}
    </div>
  );
}
