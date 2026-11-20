import type { Grid } from "../../../shared/document";
import { canvasFont } from "../../../shared/font";
import { CELL_HEIGHT, CELL_WIDTH } from "../../../shared/metrics";

/**
 * Draw the same occupancy grid that the text export uses: a one-column glyph
 * stays within its cell, a two-column cluster is drawn across exactly two
 * cells, and its continuation cell is skipped. The `maxWidth` argument makes
 * the glyph shrink to its slot instead of bleeding into the next column.
 */
export function drawGrid(
  canvas: HTMLCanvasElement,
  grid: Grid,
  color: boolean,
  background: string,
) {
  canvas.width = grid.columns * CELL_WIDTH;
  canvas.height = grid.rows * CELL_HEIGHT;
  const g = canvas.getContext("2d")!;
  g.fillStyle = background;
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.font = canvasFont(grid.fontFamily, 14);
  g.textBaseline = "middle";
  g.textAlign = "center";

  for (let i = 0; i < grid.cells.length; i++) {
    const cell = grid.cells[i]!;
    if (cell.span === 0) continue;
    const column = i % grid.columns;
    const row = Math.floor(i / grid.columns);
    const slot = cell.span * CELL_WIDTH;
    g.fillStyle = color ? cell.color : "#e9eceb";
    g.fillText(
      cell.glyph,
      column * CELL_WIDTH + slot / 2,
      row * CELL_HEIGHT + CELL_HEIGHT / 2,
      slot,
    );
  }
}
