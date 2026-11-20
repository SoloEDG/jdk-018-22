import type { Grid } from "../../../shared/document";
import { gridText } from "../../../shared/grid";

/** Copy and .TXT export share one string, including trailing whitespace. */
export function textContent(grid: Grid): string {
  return gridText(grid);
}
