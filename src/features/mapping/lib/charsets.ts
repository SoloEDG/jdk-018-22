import { graphemes } from "../../typesetting";

export const charsets = [
  { id: "standard", name: "经典 ASCII", value: " .:-=+*#%@" },
  { id: "blocks", name: "块状字符", value: " ░▒▓█" },
  { id: "binary", name: "二进制", value: " 01" },
  {
    id: "detail",
    name: "精细阶梯",
    value: " .`^,:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  },
];

/** Charset entries are grapheme clusters, never individual code units. */
export function glyphs(id: string, custom: string): string[] {
  const value =
    id === "custom"
      ? custom
      : (charsets.find((c) => c.id === id)?.value ?? charsets[0]!.value);
  const seen = new Set<string>();
  const chars: string[] = [];
  for (const cluster of graphemes(value)) {
    if (/^[\n\r\t]+$/.test(cluster)) continue;
    if (seen.has(cluster)) continue;
    seen.add(cluster);
    chars.push(cluster);
  }
  return chars.length ? chars : [" "];
}
