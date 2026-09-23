import type { Element } from "./types.ts";

export function descendantsOf(elements: ReadonlyMap<string, Element>, id: string): readonly string[] {
  const children = Map.groupBy(elements.values(), ({ parent }) => parent);
  const found: string[] = [];
  const pending = [id];
  for (let current = pending.pop(); current !== undefined; current = pending.pop()) {
    found.push(current);
    pending.push(...(children.get(current) ?? []).map((child) => child.id));
  }
  return found;
}
