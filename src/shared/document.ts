export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Asset {
  name: string;
  url: string;
  width: number;
  height: number;
  image: HTMLImageElement;
}

/** How a single cell participates in the screen-column grid. */
export interface Cell {
  /** Text content. Continuation cells carry an empty string. */
  glyph: string;
  color: string;
  /** Screen columns occupied by this glyph; 0 marks a continuation cell. */
  span: number;
}

export type WidthMode = "safe" | "preserve";

export type ReplacementReason = "width" | "zero-width" | "overflow";

export interface Replacement {
  from: string;
  to: string;
  /** Measured width of the original cluster in screen columns. */
  width: number;
  occurrences: number;
  reason: ReplacementReason;
}

export interface Settings {
  /** Density is expressed in screen columns, not logical characters. */
  columns: number;
  charset: string;
  custom: string;
  contrast: number;
  gamma: number;
  invert: boolean;
  color: boolean;
  background: string;
  /** Declared target display environment. */
  environment: string;
  /** Monospace single-column safety vs. preserving the original clusters. */
  widthMode: WidthMode;
  /** Font stack declared for the target environment. */
  fontFamily: string;
}

export interface Grid {
  /** Screen columns per row. */
  columns: number;
  rows: number;
  cells: Cell[];
  revision: number;
  widthMode: WidthMode;
  environment: string;
  environmentName: string;
  fontFamily: string;
  widthSource: "unicode" | "measured";
  replacements: Replacement[];
  /** Revision of the measurement session that produced this layout. */
  measurementRevision: number;
}

export interface StudioDocument {
  asset: Asset | null;
  crop: Crop;
  settings: Settings;
  grid: Grid | null;
  revision: number;
}
