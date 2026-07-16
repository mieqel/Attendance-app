"use client";

import { useId } from "react";
import { skinHex, hairHex, shirtColorForId } from "@/lib/avatar";

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
  const skin = skinHex(skinTone);
  const hair = hairHex(hairColor);
  const shirt = shirtColorForId(seed ?? hairStyle + hairColor + skinTone);

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Figuur">
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <circle cx="50" cy="50" r="50" fill="#EEF3EF" />

        {/* shoulders */}
        <path d="M10 102 Q50 62 90 102 Z" fill={shirt} />

        {/* neck */}
        <rect x="42" y="55" width="16" height="14" fill={skin} />

        {/* ears */}
        <circle cx="28" cy="42" r="4" fill={skin} />
        <circle cx="72" cy="42" r="4" fill={skin} />

        {/* head */}
        <circle cx="50" cy="40" r="22" fill={skin} />

        {hairStyle === "receding" && (
          <g fill={hair}>
            <path d="M27 27 Q23 30 23 40 Q23 49 28 50 Q25 43 26 35 Q26 30 29 27 Q28 26 27 27 Z" />
            <path d="M73 27 Q77 30 77 40 Q77 49 72 50 Q75 43 74 35 Q74 30 71 27 Q72 26 73 27 Z" />
          </g>
        )}

        {hairStyle === "short" && (
          <path d="M27 33 Q27 16 50 16 Q73 16 73 33 Q73 24 50 24 Q27 24 27 33 Z" fill={hair} />
        )}

        {hairStyle === "long" && (
          <>
            <path d="M27 33 Q27 16 50 16 Q73 16 73 33 Q73 24 50 24 Q27 24 27 33 Z" fill={hair} />
            <path d="M26 34 Q21 56 25 82 Q29 89 36 85 Q32 62 33 40 Z" fill={hair} />
            <path d="M74 34 Q79 56 75 82 Q71 89 64 85 Q68 62 67 40 Z" fill={hair} />
          </>
        )}

        {hairStyle === "bun" && (
          <>
            <path d="M27 32 Q27 18 50 18 Q73 18 73 32 Q73 25 50 25 Q27 25 27 32 Z" fill={hair} />
            <circle cx="50" cy="10" r="7" fill={hair} />
          </>
        )}

        {hairStyle === "curly" && (
          <g fill={hair}>
            <circle cx="28" cy="31" r="7" />
            <circle cx="34" cy="20" r="8" />
            <circle cx="44" cy="14" r="8" />
            <circle cx="56" cy="14" r="8" />
            <circle cx="66" cy="20" r="8" />
            <circle cx="72" cy="31" r="7" />
            <circle cx="50" cy="15" r="8" />
          </g>
        )}

        {/* face */}
        <circle cx="43" cy="42" r="2" fill="#3a3a3a" />
        <circle cx="57" cy="42" r="2" fill="#3a3a3a" />
        <path d="M43 50 Q50 55 57 50" stroke="#3a3a3a" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
