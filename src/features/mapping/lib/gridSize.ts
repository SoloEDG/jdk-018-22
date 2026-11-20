import { CELL_ASPECT } from "../../../shared/metrics";

/**
 * Density is screen columns, so the visible aspect ratio stays the same no
 * matter whether the charset is Latin, CJK or emoji.
 */
export function gridSize(width: number, height: number, columns: number) {
  const n = Math.round(Math.max(30, Math.min(220, columns)));
  const rows = Math.max(1, Math.round((height / width) * n / CELL_ASPECT));
  if (!Number.isFinite(rows) || rows > 1200) {
    throw new Error("裁剪区域过于狭长，请缩小范围或降低字符密度");
  }
  return { columns: n, rows };
}
