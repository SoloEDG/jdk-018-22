/**
 * The preview, PNG export and row-count math all use the same cell frame.
 * A cell is CELL_WIDTH × CELL_HEIGHT virtual pixels, so one screen column is
 * exactly half as wide as it is tall. Density is always screen columns.
 */
export const CELL_WIDTH = 8;
export const CELL_HEIGHT = 16;
export const CELL_ASPECT = CELL_HEIGHT / CELL_WIDTH;
