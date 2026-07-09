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
  { key: "short", label: "Kort" },
  { key: "long", label: "Lang" },
  { key: "bun", label: "Knot" },
  { key: "curly", label: "Krullen" },
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

// A small fixed palette of shirt colors, auto-assigned per patient so avatars
// have some visual variety without adding another decision for the patient to make.
const SHIRT_COLORS = ["#2F6F62", "#C07F1F", "#5C7FA6", "#7A5C8E", "#B3452F", "#4C7A3F"];

export function shirtColorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return SHIRT_COLORS[hash % SHIRT_COLORS.length];
}
