export const SKIN_TONES = [
  { key: "light", hex: "#F3D2B8", label: "Licht" },
  { key: "fair", hex: "#E8B896", label: "Blank" },
  { key: "medium", hex: "#C68863", label: "Gemiddeld" },
  { key: "tan", hex: "#9C6238", label: "Getint" },
  { key: "dark", hex: "#6B4226", label: "Donker" },
] as const;

export const HAIR_COLORS = [
  { key: "black", hex: "#2B2320", label: "Zwart" },
  { key: "brown", hex: "#5B3A29", label: "Bruin" },
  { key: "blonde", hex: "#D8B26B", label: "Blond" },
  { key: "gray", hex: "#9B9B93", label: "Grijs" },
  { key: "white", hex: "#EDEDE8", label: "Wit" },
] as const;

export const HAIR_STYLES = [
  { key: "bald", label: "Kaal" },
  { key: "receding", label: "Terugwijkend" },
  { key: "short", label: "Kort" },
  { key: "long", label: "Golvend" },
  { key: "bun", label: "Knot" },
  { key: "curly", label: "Permanent" },
] as const;

export type SkinToneKey = (typeof SKIN_TONES)[number]["key"];
export type HairColorKey = (typeof HAIR_COLORS)[number]["key"];
export type HairStyleKey = (typeof HAIR_STYLES)[number]["key"];

export function skinHex(key: string): string {
  return SKIN_TONES.find((s) => s.key === key)?.hex ?? SKIN_TONES[2].hex;
}

export function hairHex(key: string): string {
  return HAIR_COLORS.find((h) => h.key === key)?.hex ?? HAIR_COLORS[1].hex;
}

// Lightens (positive pct) or darkens (negative pct) a hex color — used to
// build the light-to-dark gradient that gives hair some volume instead of
// a single flat fill.
export function shade(hex: string, pct: number): string {
  const f = parseInt(hex.slice(1), 16);
  const t = pct < 0 ? 0 : 255;
  const p = Math.abs(pct);
  const R = f >> 16, G = (f >> 8) & 0x00ff, B = f & 0x0000ff;
  const nr = Math.round((t - R) * p) + R;
  const ng = Math.round((t - G) * p) + G;
  const nb = Math.round((t - B) * p) + B;
  return "#" + (0x1000000 + nr * 0x10000 + ng * 0x100 + nb).toString(16).slice(1);
}

// A small fixed palette of shirt colors, auto-assigned per patient so avatars
// have some visual variety without adding another decision for the patient to make.
const SHIRT_COLORS = ["#2F6F62", "#C07F1F", "#5C7FA6", "#7A5C8E", "#B3452F", "#4C7A3F"];

export function shirtColorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return SHIRT_COLORS[hash % SHIRT_COLORS.length];
}
