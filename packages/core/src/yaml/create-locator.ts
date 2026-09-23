import {
  isMap,
  isNode,
  isScalar,
  isSeq,
  type Document,
  type Node,
  type Pair,
  type YAMLMap,
} from "yaml";

import type { Position } from "../text/index.ts";
import type { Locator, YamlPath } from "./types.ts";

interface Found {
  readonly node: Node | null;
  readonly pair: Pair | undefined;
}

type PairIndex = WeakMap<YAMLMap, ReadonlyMap<string, Pair>>;

export function createLocator(
  document: Document.Parsed,
  toPosition: (offset: number) => Position,
): Locator {
  const index: PairIndex = new WeakMap();
  return {
    value: (path) => toPosition(offsetOf(walk(document.contents, path, index).node)),
    key: (path) => {
      const { node, pair } = walk(document.contents, path, index);
      return toPosition(offsetOf(pair?.key ?? node));
    },
  };
}

function offsetOf(node: unknown): number {
  return isNode(node) ? (node.range?.[0] ?? 0) : 0;
}

function walk(root: Node | null, path: YamlPath, index: PairIndex): Found {
  let found: Found = { node: root, pair: undefined };
  for (const segment of path) {
    const next = step(found.node, segment, index);
    if (next === undefined) return found;
    found = next;
  }
  return found;
}

function step(node: Node | null, segment: string | number, index: PairIndex): Found | undefined {
  if (isMap(node)) {
    const pair = pairsOf(node, index).get(String(segment));
    return pair && { node: isNode(pair.value) ? pair.value : null, pair };
  }
  if (isSeq(node) && typeof segment === "number") {
    const item = node.items[segment];
    return isNode(item) ? { node: item, pair: undefined } : undefined;
  }
  return undefined;
}

function pairsOf(map: YAMLMap, index: PairIndex): ReadonlyMap<string, Pair> {
  const cached = index.get(map);
  if (cached !== undefined) return cached;
  const pairs = new Map(
    map.items.flatMap((pair) =>
      isScalar(pair.key) ? [[String(pair.key.value), pair] as const] : [],
    ),
  );
  index.set(map, pairs);
  return pairs;
}
