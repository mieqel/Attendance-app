"use client";

import { useId } from "react";
import { skinHex, hairHex, shirtColorForId, shade } from "@/lib/avatar";

// --- small deterministic helpers for the organic hair silhouette ---
// Seeded off the patient's own id (or appearance choices as a fallback) so
// the same patient always gets the same slightly-irregular hair shape,
// rather than a new random wobble on every render.
function seededRand(i: number): number {
  const x = Math.sin(i * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 1000;
}

type Point = [number, number];

// Catmull-Rom through a set of points -> smooth bezier path, so the hair
// edge can be gently irregular instead of a perfect circle.
function smoothPath(points: Point[]): string {
  const n = points.length;
  let d = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)} `;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, n - 1)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)} `;
  }
  return d;
}

function capOutline(
  cx: number,
  cy: number,
  baseR: number,
  ampl: number,
  seedOffset: number,
  angleFrom: number,
  angleTo: number,
  steps: number
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = angleFrom + (angleTo - angleFrom) * (i / steps);
    const rad = (a * Math.PI) / 180;
    const jitter = (seededRand(seedOffset + i) - 0.5) * ampl;
    const r = baseR + Math.sin(((a * Math.PI) / 180) * 2.3) * (ampl * 0.6) + jitter;
    pts.push([cx + r * Math.cos(rad), cy + r * Math.sin(rad)]);
  }
  return pts;
}

export default function AvatarSvg({
  skinTone,
  hairStyle,
  hairColor,
  seed,
  size = 64,
}: {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  seed?: string;
  size?: number;
}) {
  const reactId = useId();
  const clipId = `avatar-clip-${reactId}`;
  const capClipId = `avatar-cap-clip-${reactId}`;
  const gradId = `avatar-hair-grad-${reactId}`;

  const skin = skinHex(skinTone);
  const hair = hairHex(hairColor);
  const dark = shade(hair, -0.28);
  const light = shade(hair, 0.22);
  const shirt = shirtColorForId(seed ?? hairStyle + hairColor + skinTone);
  const seedNum = hashSeed(seed ?? hairStyle + hairColor + skinTone);

  const cx = 50;
  const cy = 40;

  // Cap silhouette (short / long / bun): an irregular, gradient-shaded
  // shape centered on the head so it can't visually detach from it, with
  // a curved (not razor-flat) hairline.
  const isCap = hairStyle === "short" || hairStyle === "long" || hairStyle === "bun";
  let capOuterD = "";
  let capInnerD = "";
  let hairlineClipD = "";
  if (isCap) {
    const dip = hairStyle === "bun" ? 2 : 4.5;
    const baseY = hairStyle === "bun" ? 31 : 33;
    const capCy = cy - 3;
    const outerR = 25;
    const innerR = 22.2;
    const seedBase = seedNum * 7;
    const outerPts = capOutline(cx, capCy, outerR, 2.2, seedBase, -178, -2, 20);
    const innerPts = capOutline(cx, capCy, innerR, 1.6, seedBase + 5, -178, -2, 20);
    capOuterD = `${smoothPath(outerPts)} L${outerPts[outerPts.length - 1][0].toFixed(2)},60 L${outerPts[0][0].toFixed(2)},60 Z`;
    capInnerD = `${smoothPath(innerPts)} L${innerPts[innerPts.length - 1][0].toFixed(2)},60 L${innerPts[0][0].toFixed(2)},60 Z`;
    hairlineClipD = `M0,0 L100,0 L100,${baseY - dip} Q50,${baseY + dip} 0,${baseY - dip} Z`;
  }

  // Curly: two rings of curls anchored at the head's own radius (not
  // floating above it) plus small highlight dots for a rounded, glossy look.
  let curlyDark: { p: Point; r: number }[] = [];
  let curlyLight: { p: Point; r: number }[] = [];
  if (hairStyle === "curly") {
    const angles = [-162, -138, -114, -90, -66, -42, -18, -150, -126, -90, -54, -30, -102, -78];
    const seedBase2 = seedNum * 3;
    const pos = angles.map((a, i) => {
      const rad = (a * Math.PI) / 180;
      const jitter = (seededRand(seedBase2 + i) - 0.5) * 3.4;
      const isBack = i < 7;
      const distC = isBack ? 20 + jitter * 0.6 : i < 12 ? 12 + jitter * 0.8 : 16 + jitter * 0.7;
      const r = isBack
        ? 7.6 + seededRand(seedBase2 + i + 50) * 1.6
        : i < 12
        ? 5 + seededRand(seedBase2 + i + 80) * 1.3
        : 6 + seededRand(seedBase2 + i + 90) * 1.2;
      return { x: cx + distC * Math.cos(rad), y: cy + distC * Math.sin(rad), r, back: isBack };
    });
    curlyDark = pos.filter((c) => c.back).map((c) => ({ p: [c.x, c.y] as Point, r: c.r + 1.3 }));
    curlyLight = pos.filter((c) => !c.back).map((c) => ({ p: [c.x, c.y] as Point, r: c.r }));
  }

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Figuur">
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
        <linearGradient id={gradId} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="55%" stopColor={hair} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        {isCap && (
          <clipPath id={capClipId}>
            <path d={hairlineClipD} />
          </clipPath>
        )}
        {hairStyle === "receding" && (
          <clipPath id={capClipId}>
            <rect x="0" y="20" width="100" height="30" />
          </clipPath>
        )}
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <circle cx="50" cy="50" r="50" style={{ fill: "var(--avatar-bg)" }} />

        {/* shoulders */}
        <path d="M10 102 Q50 62 90 102 Z" fill={shirt} />

        {/* neck */}
        <rect x="42" y="55" width="16" height="14" fill={skin} />

        {/* ears */}
        <circle cx="28" cy="42" r="4" fill={skin} />
        <circle cx="72" cy="42" r="4" fill={skin} />

        {/* head */}
        <circle cx={cx} cy={cy} r="22" fill={skin} />

        {hairStyle === "bald" && <ellipse cx="43" cy="30" rx="7" ry="4" fill="#ffffff" opacity="0.12" />}

        {hairStyle === "receding" && (
          <g clipPath={`url(#${capClipId})`}>
            <path
              fillRule="evenodd"
              fill={`url(#${gradId})`}
              d={`M50,${cy - 23} a23,23 0 1,0 0.01,0 Z M50,${cy - 18} a18,18 0 1,1 -0.01,0 Z`}
            />
          </g>
        )}

        {isCap && (
          <>
            <g clipPath={`url(#${capClipId})`}>
              <path d={capOuterD} fill={dark} />
              <path d={capInnerD} fill={`url(#${gradId})`} />
            </g>
            <ellipse cx="27" cy="39" rx="2.6" ry="6.8" fill={hair} />
            <ellipse cx="73" cy="39" rx="2.6" ry="6.8" fill={hair} />
            <path d="M37 19 Q39 25 37 30" stroke={dark} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.42" />
            <path d="M63 19 Q61 25 63 30" stroke={dark} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.42" />
            <path d="M50 15 Q49 22 50 28" stroke={dark} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.3" />
          </>
        )}

        {hairStyle === "long" && (
          <>
            <path d="M26.5 36 C19 52 18 69 21 85 C23 91 30 91 33 87 C29 71 29 53 32.5 38 Z" fill={dark} />
            <path d="M28.5 36 C23 50 22 65 25 79 C26 83 31 83 32 79 C29 65 30 51 32.5 38 Z" fill={`url(#${gradId})`} />
            <path d="M73.5 36 C81 52 82 69 79 85 C77 91 70 91 67 87 C71 71 71 53 67.5 38 Z" fill={dark} />
            <path d="M71.5 36 C77 50 78 65 75 79 C74 83 69 83 68 79 C71 65 70 51 67.5 38 Z" fill={`url(#${gradId})`} />
          </>
        )}

        {hairStyle === "bun" && (
          <>
            <path d="M45 16 C45 12 47 9 50 9 C53 9 55 12 55 16 Z" fill={dark} />
            <ellipse cx="50" cy="14.5" rx="8.2" ry="6.8" fill={dark} />
            <ellipse cx="49.3" cy="13.6" rx="6.9" ry="5.6" fill={`url(#${gradId})`} />
            <path d="M43.5 14.2 Q50 12.2 56.5 14.2" stroke={dark} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.55" />
          </>
        )}

        {hairStyle === "curly" && (
          <>
            <g fill={dark}>
              {curlyDark.map(({ p: [x, y], r }, i) => (
                <circle key={`d${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r={r.toFixed(1)} />
              ))}
            </g>
            <g fill={hair}>
              {curlyLight.map(({ p: [x, y], r }, i) => (
                <circle key={`l${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r={r.toFixed(1)} />
              ))}
            </g>
            <g fill={light} opacity="0.35">
              {curlyDark.map(({ p: [x, y], r }, i) => (
                <circle key={`h${i}`} cx={(x - 1.4).toFixed(1)} cy={(y - 1.4).toFixed(1)} r={(r - 2.6).toFixed(1)} />
              ))}
            </g>
          </>
        )}

        {/* face */}
        <circle cx="43" cy="42" r="2" fill="#3a3a3a" />
        <circle cx="57" cy="42" r="2" fill="#3a3a3a" />
        <path d="M43 50 Q50 55 57 50" stroke="#3a3a3a" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
