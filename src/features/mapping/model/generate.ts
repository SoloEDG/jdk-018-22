import type { Cell, Grid, Replacement, StudioDocument } from "../../../shared/document";
import {
  checkEnvironment,
  findEnvironment,
  nextMeasurement,
  WidthMeasurer,
} from "../../typesetting";
import { planGlyphs, type GlyphPlan } from "../lib/layout";
import { glyphs } from "../lib/charsets";
import { gridSize } from "../lib/gridSize";
import { sample } from "../lib/sample";
import { tone, luminance } from "../lib/tone";

export interface GenerateResult {
  grid: Grid | null;
  error?: string;
}

/** Nearest one-column plan to a tonal index, so overflow keeps the ramp. */
function nearestNarrow(plans: GlyphPlan[], index: number): GlyphPlan | null {
  for (let distance = 1; distance < plans.length; distance++) {
    const before = plans[index - distance];
    if (before && before.span === 1) return before;
    const after = plans[index + distance];
    if (after && after.span === 1) return after;
  }
  return plans.find((plan) => plan.span === 1) ?? null;
}

/**
 * A measurement session is created per generation from the settings snapshot.
 * If the environment flips while a generation is pending, the pending result
 * carries its own measurement id and is discarded by the workspace.
 */
export function generate(doc: StudioDocument): GenerateResult {
  if (!doc.asset) return { grid: null };
  const s = doc.settings;
  const env = findEnvironment(s.environment);
  if (!env) return { grid: null, error: "未知的显示环境，已保留上一次结果" };

  const support = checkEnvironment(s);
  if (!support.ok) return { grid: null, error: support.reason };

  const size = gridSize(
    doc.asset.width * doc.crop.width,
    doc.asset.height * doc.crop.height,
    s.columns,
  );
  const pixels = sample(
    doc.asset,
    doc.crop,
    size.columns,
    size.rows,
    s.background,
  );

  const measurement = nextMeasurement(s, s.widthMode);
  let measurer: WidthMeasurer;
  try {
    measurer = new WidthMeasurer(measurement, s);
  } catch (e) {
    return {
      grid: null,
      error: e instanceof Error ? e.message : "字体测量失败，已保留上一次结果",
    };
  }

  const chars = glyphs(s.charset, s.custom);
  const plans = planGlyphs(chars, env, s.widthMode, measurer);
  const cells: Cell[] = [];
  /** Only report replacements that the final image actually used. */
  const usage = new Map<GlyphPlan, number>();
  const overflowBySource = new Map<string, Replacement>();

  for (let y = 0; y < size.rows; y++) {
    let used = 0;
    for (let x = 0; x < size.columns; x++) {
      const i = (y * size.columns + x) * 4;
      const r = pixels[i]!,
        g = pixels[i + 1]!,
        b = pixels[i + 2]!;
      const t = tone(luminance(r, g, b), s.contrast, s.gamma, s.invert);

      const index = Math.round(t * (plans.length - 1));
      let plan = plans[index]!;
      let usedOverflow = false;

      // A double-width cluster may not straddle the row edge. Replace it so
      // the following row's first column is never overwritten.
      if (plan.span === 2 && used + 2 > size.columns) {
        // Row-end overflow must never spill into the next row. Use the nearest
        // one-column glyph so the row keeps its tonal value, and record it.
        const fallback = nearestNarrow(plans, index);
        if (fallback) {
          const entry = overflowBySource.get(plan.source);
          if (entry) entry.occurrences++;
          else
            overflowBySource.set(plan.source, {
              from: plan.source,
              to: fallback.text,
              width: 2,
              reason: "overflow",
              occurrences: 1,
            });
          plan = fallback;
        } else {
          // No one-column glyph exists: a blank guarantees the empty column.
          const entry = overflowBySource.get(plan.source);
          if (entry) entry.occurrences++;
          else
            overflowBySource.set(plan.source, {
              from: plan.source,
              to: " ",
              width: 2,
              reason: "overflow",
              occurrences: 1,
            });
          plan = { source: plan.source, text: " ", span: 1 };
        }
        usedOverflow = true;
      }

      if (!usedOverflow) usage.set(plan, (usage.get(plan) ?? 0) + 1);

      const color =
        "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
      cells.push({ glyph: plan.text, color, span: plan.span });
      if (plan.span === 2) {
        // The continuation cell holds the second screen column of the glyph.
        // It is never written to, but it keeps the row's column arithmetic
        // and the text export aligned.
        cells.push({ glyph: "", color, span: 0 });
        used += 2;
        x++;
      } else {
        used += 1;
      }
    }
  }

  const replacements: Replacement[] = [];
  for (const [plan, count] of usage) {
    if (!plan.replacement) continue;
    const { to, reason, width } = plan.replacement;
    const existing = replacements.find(
      (item) => item.from === plan.source && item.to === to && item.reason === reason,
    );
    if (existing) existing.occurrences += count;
    else
      replacements.push({
        from: plan.source,
        to,
        width,
        reason,
        occurrences: count,
      });
  }
  replacements.push(...overflowBySource.values());

  return {
    grid: {
      ...size,
      cells,
      revision: doc.revision,
      widthMode: s.widthMode,
      environment: env.id,
      environmentName: env.name,
      fontFamily: s.fontFamily,
      widthSource: "measured",
      replacements,
      measurementRevision: measurement.revision,
    },
  };
}
