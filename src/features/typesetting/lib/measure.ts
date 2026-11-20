import type { Settings, WidthMode } from "../../../shared/document";
import {
  canvasFont,
  firstNamedFamily,
  fontFamilies,
} from "../../../shared/font";
import { findEnvironment, type Environment } from "./clusters";

export interface Measurement {
  environment: Environment;
  fontFamily: string;
  mode: WidthMode;
  /** Prefix for canvas measurement keys; new per session. */
  revision: number;
}

const FALLBACK_WIDTH = 16;
const SAMPLE = "MMMMMMMMMM";

let counter = 0;

function probeFont(settings: Settings): string {
  return canvasFont(settings.fontFamily, FALLBACK_WIDTH);
}

/** True when the declared first family actually resolved. */
export function fontIsAvailable(settings: Settings): boolean {
  const family = firstNamedFamily(settings.fontFamily);
  if (!family) return true;

  // The FontFaceSet check is authoritative for locally installed fonts and
  // avoids a false "missing" verdict when a fallback has identical metrics.
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (fonts && typeof fonts.check === "function") {
    try {
      if (fonts.check(`12px "${family}"`)) return true;
    } catch {
      // Check can throw for malformed family names; fall through to metrics.
    }
  }

  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return false;
  ctx.font = "72px monospace";
  const base = ctx.measureText(SAMPLE).width;
  ctx.font = `72px "${family}", monospace`;
  const candidate = ctx.measureText(SAMPLE).width;
  return Math.abs(base - candidate) > 0.01;
}

/** A monospace target must give every ASCII glyph the same advance. */
export function isMonospace(settings: Settings): boolean {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return false;
  ctx.font = probeFont(settings);
  const widths = Array.from(
    "MWim.@#0 ",
    (ch) => Math.round(ctx.measureText(ch).width * 100) / 100,
  );
  return widths.every((w) => Math.abs(w - widths[0]!) < 0.01);
}

export interface EnvironmentSupport {
  ok: boolean;
  reason?: string;
}

/**
 * Verify the declared environment can be honoured before any layout uses it.
 * Not a monospace-safe target, missing font, or unsupported wide rules all
 * fail here; callers then keep the previous grid and surface the message.
 */
export function checkEnvironment(settings: Settings): EnvironmentSupport {
  const env = findEnvironment(settings.environment);
  if (!env) return { ok: false, reason: "未知的显示环境，已保留上一次结果" };
  if (!fontFamilies(settings.fontFamily).length)
    return { ok: false, reason: "显示环境未声明字体，已保留上一次结果" };
  if (!fontIsAvailable(settings))
    return { ok: false, reason: "目标字体在本机不可用，已保留上一次结果" };
  if (!isMonospace(settings))
    return {
      ok: false,
      reason: "目标环境不是等宽字体，无法保证单列宽度，已保留上一次结果",
    };
  if (settings.widthMode === "preserve" && !env.supportsWide)
    return {
      ok: false,
      reason: "该环境的宽度规则不支持双宽占位，请改用单列安全模式；已保留上一次结果",
    };
  return { ok: true };
}

export function nextMeasurement(
  settings: Settings,
  mode: WidthMode,
): Measurement {
  return {
    environment: findEnvironment(settings.environment)!,
    fontFamily: settings.fontFamily,
    mode,
    revision: ++counter,
  };
}

/**
 * Measurement memo is keyed by measurement session, so switching environments
 * cannot mix old widths with a new character layout.
 */
export class WidthMeasurer {
  private ctx: CanvasRenderingContext2D;
  private cache = new Map<string, number>();
  private unit = FALLBACK_WIDTH;
  readonly measurement: Measurement;

  constructor(measurement: Measurement, settings: Settings) {
    this.measurement = measurement;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) throw new Error("无法创建字体测量画布");
    ctx.font = canvasFont(settings.fontFamily, FALLBACK_WIDTH);
    const probe = ctx.measureText("M").width;
    this.unit = probe > 0 ? probe : FALLBACK_WIDTH;
    this.ctx = ctx;
  }

  /** Width in screen columns, measured and rounded to whole columns. */
  columns(cluster: string): number {
    const key = `${this.measurement.revision}:${cluster}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    const measured = this.ctx.measureText(cluster).width;
    // Clusters that render as a single cell advance ~unit; anything visibly
    // wider is counted as the matching number of whole columns.
    const columns =
      measured <= this.unit * 1.1
        ? 1
        : Math.max(1, Math.round(measured / this.unit));
    this.cache.set(key, columns);
    return columns;
  }

  get unitWidth() {
    return this.unit;
  }
}
