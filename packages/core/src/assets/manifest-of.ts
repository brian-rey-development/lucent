import type { Assets, Asset, Point } from "../model/index.ts";
import { isId } from "../text/index.ts";
import { isRecord } from "../validation/index.ts";
import { pointSchema } from "./schema.ts";

export function manifestOf(values: Readonly<Record<string, unknown>>): Assets {
  const keys = Object.keys(values);
  const valid = keys.filter(isId);
  const manifest = new Map(valid.map((key) => [key, assetOf(values[key])]));
  return { status: "loaded", manifest, complete: valid.length === keys.length };
}

function assetOf(entry: unknown): Asset | undefined {
  if (!isRecord(entry)) return undefined;
  const points = entry["points"];
  if (points === undefined) return { points: new Map() };
  if (!isRecord(points) || !Object.keys(points).every(isId)) return { points: undefined };
  return { points: new Map(Object.entries(points).map(([name, point]) => [name, pointOf(point)])) };
}

function pointOf(point: unknown): Point | undefined {
  const parsed = pointSchema.safeParse(point);
  return parsed.success ? parsed.data : undefined;
}
