import type { Screen } from "./types.ts";

export function createScreen(partial: boolean): Screen {
  return { elements: new Map(), gone: new Map(), ambiguous: new Set(), partial };
}
