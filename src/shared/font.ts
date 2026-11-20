export const GENERIC_FONTS = new Set([
  "monospace",
  "ui-monospace",
  "sans-serif",
  "ui-sans-serif",
  "serif",
  "ui-serif",
  "system-ui",
  "cursive",
  "fantasy",
  "math",
  "emoji",
]);

export function fontFamilies(stack: string): string[] {
  return stack
    .split(",")
    .map((part) => part.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

/** Canvas `font` shorthand needs names with spaces quoted. */
export function canvasFont(stack: string, size: number): string {
  const families = fontFamilies(stack).map((family) =>
    GENERIC_FONTS.has(family.toLowerCase()) ? family : `"${family}"`,
  );
  return `${size}px ${families.length ? families.join(", ") : "monospace"}`;
}

/** A declared target font is usable when the first named family exists. */
export function firstNamedFamily(stack: string): string | null {
  const family = fontFamilies(stack)[0];
  if (!family || GENERIC_FONTS.has(family.toLowerCase())) return null;
  return family;
}
