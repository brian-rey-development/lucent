import { isScalar, visit, type Document } from "yaml";

import type { TokenError } from "./types.ts";

export function findDuplicateKeys(document: Document.Parsed): readonly TokenError[] {
  const errors: TokenError[] = [];
  visit(document, {
    Map: (_, map) => {
      const seen = new Set<unknown>();
      for (const { key } of map.items) {
        if (!isScalar(key)) continue;
        if (seen.has(key.value))
          errors.push({ kind: "duplicate", offset: key.range?.[0] ?? 0, token: String(key.value) });
        seen.add(key.value);
      }
    },
  });
  return errors;
}
