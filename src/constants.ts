/**
 * Well-known ids for the locally developed shadcn widget vocabulary.
 * Mirrors `schemas/rusl/surface.shadcn.schema.json` (`$id` + `#/$defs`).
 */

/** Document `$id` for the shadcn kit vocabulary. */
export const SHADCN_KIT_ID =
  "https://resources.rusl.com/resources/rusl/schemas/surface.shadcn";

/** Multiline string widget: local shadcn Textarea. */
export const SHADCN_TEXTAREA_ID = `${SHADCN_KIT_ID}#/$defs/textarea`;
