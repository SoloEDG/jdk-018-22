import type { Grid, StudioDocument } from "./document";

/** Rows of glyph content. Continuation cells are empty strings. */
export function gridRows(grid: Grid): string[] {
  return Array.from({ length: grid.rows }, (_, y) =>
    grid.cells
      .slice(y * grid.columns, (y + 1) * grid.columns)
      .map((c) => c.glyph)
      .join(""),
  );
}

/** Text export and copy use exactly this string, including trailing spaces. */
export function gridText(grid: Grid): string {
  return gridRows(grid).join("\n");
}

/** Density and status counts refer to visible logical characters. */
export function logicalGlyphCount(grid: Grid): number {
  return grid.cells.reduce((n, cell) => n + (cell.span > 0 ? 1 : 0), 0);
}

/**
 * A grid is usable only when it was produced by the current revision with the
 * same declared environment, font and width mode. This prevents a stale
 * measurement from being paired with a newer character layout.
 */
export function isGridCurrent(doc: StudioDocument): doc is StudioDocument & { grid: Grid } {
  const grid = doc.grid;
  if (!grid) return false;
  return (
    grid.revision === doc.revision &&
    grid.environment === doc.settings.environment &&
    grid.widthMode === doc.settings.widthMode &&
    grid.fontFamily === doc.settings.fontFamily
  );
}
