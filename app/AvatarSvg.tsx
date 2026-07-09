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

        {hairStyle === "long" && (
          <path
            d="M20 46 Q20 96 30 102 L30 60 Q30 40 50 38 Q70 40 70 60 L70 102 Q80 96 80 46 Z"
            fill={hair}
          />
        )}

        {/* shoulders */}
        <path d="M10 102 Q50 62 90 102 Z" fill={shirt} />

        {/* neck */}
        <rect x="42" y="55" width="16" height="14" fill={skin} />

        {/* ears */}
        <circle cx="28" cy="42" r="4" fill={skin} />
        <circle cx="72" cy="42" r="4" fill={skin} />

        {/* head */}
        <circle cx="50" cy="40" r="22" fill={skin} />

        {hairStyle === "short" && (
          <path d="M27 34 Q27 15 50 15 Q73 15 73 34 Q73 23 50 23 Q27 23 27 34 Z" fill={hair} />
        )}

        {hairStyle === "bun" && (
          <>
            <path d="M27 34 Q27 16 50 16 Q73 16 73 34 Q73 24 50 24 Q27 24 27 34 Z" fill={hair} />
            <circle cx="50" cy="11" r="7" fill={hair} />
          </>
        )}

        {hairStyle === "curly" && (
          <g fill={hair}>
            <circle cx="30" cy="25" r="8" />
            <circle cx="42" cy="16" r="9" />
            <circle cx="58" cy="16" r="9" />
            <circle cx="70" cy="25" r="8" />
            <circle cx="50" cy="14" r="9" />
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
