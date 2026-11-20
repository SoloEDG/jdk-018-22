import type { ReplacementReason } from "../../../shared/document";
import { unicodeWidth, type Environment } from "../../typesetting";
import type { WidthMeasurer } from "../../typesetting";

export interface GlyphPlan {
  /** Original cluster as declared by the charset. */
  source: string;
  /** What is actually written into the cell (may carry a base guard). */
  text: string;
  /** Screen columns occupied: 1 or 2. A continuation cell uses span 0. */
  span: number;
  replacement?: { to: string; reason: ReplacementReason; width: number };
}

const DENSE = "#";

function isBlank(cluster: string): boolean {
  return !/\S/u.test(cluster);
}

/** A one-column stand-in that keeps the tone order meaningful. */
export function singleColumnFallback(cluster: string): string {
  return isBlank(cluster) ? " " : DENSE;
}

/**
 * Resolve the screen width of a cluster in the declared environment.
 * Zero-advance clusters return 0; everything else is 1 or 2 columns, with the
 * environment declaring whether it can honour a double-width glyph at all.
 */
export function resolvedWidth(
  cluster: string,
  env: Environment,
  measurer?: WidthMeasurer,
): number {
  const unicode = unicodeWidth(cluster, env);
  if (unicode === 0) return 0;
  const measured = measurer ? measurer.columns(cluster) : unicode;
  if (measured === 0) return 1;
  return Math.min(2, Math.max(1, Math.max(unicode, measured)));
}

/**
 * Build the per-glyph plan for a mode.
 *
 * - `safe`: every glyph must occupy exactly one column; anything else is
 *   replaced by a one-column stand-in chosen at the same tonal position, and
 *   the change is reported in `replacements`.
 * - `preserve`: original clusters are kept, wide clusters take a real two-cell
 *   span, and zero-advance clusters receive a base guard so they cannot attach
 *   to a neighbouring cell.
 */
export function planGlyphs(
  chars: string[],
  env: Environment,
  mode: "safe" | "preserve",
  measurer?: WidthMeasurer,
): GlyphPlan[] {
  // First pass: classify every declared cluster.
  const widths = chars.map((cluster) => resolvedWidth(cluster, env, measurer));
  if (mode === "preserve") {
    return chars.map((cluster, i) => {
      const width = widths[i]!;
      if (width === 0) {
        // A lone mark has no base to attach to, so anchor it to a one-column
        // base; its zero advance can then never erase the next cell's glyph.
        // The original cluster is preserved after the guard.
        return { source: cluster, text: " " + cluster, span: 1 };
      }
      if (width >= 2 && env.supportsWide)
        return { source: cluster, text: cluster, span: 2 };
      return { source: cluster, text: cluster, span: 1 };
    });
  }

  // Safe mode: one-column candidates, in charset (tonal) order, so a
  // replacement keeps its position in the brightness ramp.
  const candidates = chars.filter((_, i) => widths[i] === 1);
  return chars.map((cluster, i) => {
    const width = widths[i]!;
    if (width === 1) return { source: cluster, text: cluster, span: 1 };

    // A zero-advance cluster carries no ink of its own, so a blank keeps the
    // image closest to the original; a too-wide cluster gets the dense mark.
    const ratio = chars.length > 1 ? i / (chars.length - 1) : 0;
    const to =
      width === 0
        ? " "
        : candidates.length
          ? candidates[Math.round(ratio * (candidates.length - 1))]!
          : singleColumnFallback(cluster);
    // Zero-advance clusters have no width to report; wide clusters report the
    // measured screen-column count they could not keep.
    const reason: ReplacementReason = width === 0 ? "zero-width" : "width";
    return {
      source: cluster,
      text: to,
      span: 1,
      replacement: { to, reason, width },
    };
  });
}
