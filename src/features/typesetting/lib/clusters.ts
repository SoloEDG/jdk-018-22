import {
  isAmbiguousCodePoint,
  isControlCodePoint,
  isRegionalIndicator,
  isWideCodePoint,
  isZeroWidthCodePoint,
} from "./unicodeWidth";

export interface Environment {
  id: string;
  name: string;
  /** Shown in the environment picker. */
  detail: string;
  /** Font stack the target environment actually renders with. */
  fontFamily: string;
  /** How the environment treats East Asian Ambiguous characters. */
  ambiguousWidth: 1 | 2;
  /** Whether the environment can render double-width clusters in two cells. */
  supportsWide: boolean;
}

export const environments: Environment[] = [
  {
    id: "terminal",
    name: "等宽终端（拉丁）",
    detail: "East Asian Ambiguous 按窄字符计，支持双宽字符",
    fontFamily: "monospace",
    ambiguousWidth: 1,
    supportsWide: true,
  },
  {
    id: "cjk-terminal",
    name: "中日韩等宽终端",
    detail: "East Asian Ambiguous 按双宽计，支持双宽字符",
    fontFamily: "monospace",
    ambiguousWidth: 2,
    supportsWide: true,
  },
  {
    id: "browser-pre",
    name: "网页 <pre>",
    detail: "浏览器等宽渲染，宽度以字体测量为准",
    fontFamily: "ui-monospace, monospace",
    ambiguousWidth: 1,
    supportsWide: true,
  },
  {
    id: "single-column",
    name: "严格单列等宽",
    detail: "只接受一列字符，不支持双宽占位",
    fontFamily: "monospace",
    ambiguousWidth: 1,
    supportsWide: false,
  },
];

export function findEnvironment(id: string): Environment | undefined {
  return environments.find((e) => e.id === id);
}

const segmenter: {
  segment(input: string): Iterable<{ segment: string }>;
} | null = (() => {
  const IntlWithSegmenter = Intl as typeof Intl & {
    Segmenter?: new (
      locale?: string,
      options?: { granularity: "grapheme" },
    ) => { segment(input: string): Iterable<{ segment: string }> };
  };
  if (!IntlWithSegmenter.Segmenter) return null;
  try {
    return new IntlWithSegmenter.Segmenter("zh", { granularity: "grapheme" });
  } catch {
    return null;
  }
})();

const MARK = /\p{M}/u;
const EMOJI_PRESENTATION = /\p{Emoji_Presentation}/u;
const EXTENDED_PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

/** Split text into user-perceived clusters (combining marks, ZWJ, tags...). */
export function graphemes(text: string): string[] {
  if (!text) return [];
  if (segmenter) return [...segmenter.segment(text)].map((s) => s.segment);
  return fallbackGraphemes(text);
}

function fallbackGraphemes(text: string): string[] {
  const cps = Array.from(text, (ch) => ch.codePointAt(0)!);
  const out: string[] = [];
  let current = "";
  let regionalRun = 0;
  let joinNext = false;
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i]!;
    const ch = String.fromCodePoint(cp);
    const regional = isRegionalIndicator(cp);
    const extendsPrevious =
      (MARK.test(ch) ||
        cp === 0x200d ||
        (cp >= 0xfe00 && cp <= 0xfe0f) ||
        (cp >= 0xe0100 && cp <= 0xe01ef) ||
        (cp >= 0x1f3fb && cp <= 0x1f3ff) ||
        (cp >= 0xe0020 && cp <= 0xe007f)) &&
      current !== "";
    if (current && (extendsPrevious || joinNext || (regional && regionalRun === 1))) {
      current += ch;
    } else {
      if (current) out.push(current);
      current = ch;
      regionalRun = 0;
    }
    if (regional) regionalRun = regionalRun === 1 ? 0 : 1;
    joinNext = cp === 0x200d;
  }
  if (current) out.push(current);
  return out;
}

export interface ClusterTraits {
  /** All code points in the cluster are zero-advance. */
  zeroWidth: boolean;
  /** Emoji / ZWJ / variation-selector / regional-indicator sequence. */
  emoji: boolean;
  wide: boolean;
  ambiguous: boolean;
  control: boolean;
}

export function traits(cluster: string): ClusterTraits {
  const cps = Array.from(cluster, (ch) => ch.codePointAt(0)!);
  let zeroWidth = true;
  let wide = false;
  let ambiguous = false;
  let control = false;
  let hasExtPict = false;
  let hasRegional = false;
  let hasEmojiPresentation = false;
  let hasVS16 = false;
  let hasSkinTone = false;
  let hasKeycap = false;
  for (const cp of cps) {
    if (!isZeroWidthCodePoint(cp)) zeroWidth = false;
    if (isWideCodePoint(cp)) wide = true;
    if (isAmbiguousCodePoint(cp)) ambiguous = true;
    if (isControlCodePoint(cp)) control = true;
    if (isRegionalIndicator(cp)) hasRegional = true;
    if (cp === 0xfe0f) hasVS16 = true;
    const ch = String.fromCodePoint(cp);
    if (EMOJI_PRESENTATION.test(ch)) hasEmojiPresentation = true;
    if (EXTENDED_PICTOGRAPHIC.test(ch)) hasExtPict = true;
    if (cp >= 0x1f3fb && cp <= 0x1f3ff) hasSkinTone = true;
    if (cp === 0x20e3) hasKeycap = true;
  }
  const hasZWJ = cluster.includes("‍");
  // A bare © or ™ is text-width; only emoji presentation, VS16, ZWJ or
  // regional-indicator sequences make the cluster occupy two columns.
  const emoji =
    hasRegional ||
    hasEmojiPresentation ||
    hasSkinTone ||
    hasKeycap ||
    hasZWJ ||
    (hasExtPict && hasVS16);
  return { zeroWidth, emoji, wide, ambiguous, control };
}

/** Unicode-derived width, before any font measurement. */
export function unicodeWidth(cluster: string, env: Environment): number {
  const t = traits(cluster);
  if (t.zeroWidth || t.control) return 0;
  if (t.emoji) return 2;
  if (t.wide) return 2;
  if (t.ambiguous && env.ambiguousWidth === 2) return 2;
  return 1;
}
