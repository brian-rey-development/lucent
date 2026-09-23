import type { TextBlock } from "../text/index.ts";

export type FrontmatterSplit =
  | { readonly kind: "found"; readonly block: TextBlock; readonly bodyStart: number }
  | { readonly kind: "missing"; readonly line: number; readonly bodyStart: number }
  | { readonly kind: "unclosed"; readonly line: number; readonly bodyStart: number };
