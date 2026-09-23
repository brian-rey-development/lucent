import type { YamlPath } from "../yaml/index.ts";
import { isRecord } from "./is-record.ts";

export function valueAt(value: unknown, path: YamlPath): unknown {
  return path.reduce<unknown>((current, segment) => {
    if (Array.isArray(current) && typeof segment === "number") return current[segment];
    return isRecord(current) && Object.hasOwn(current, segment) ? current[segment] : undefined;
  }, value);
}
