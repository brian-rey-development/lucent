import type { Raw } from "./types.ts";

export function omitKeys(raw: Raw, keys: readonly string[]): Raw {
  return Object.fromEntries(Object.entries(raw).filter(([key]) => !keys.includes(key)));
}
