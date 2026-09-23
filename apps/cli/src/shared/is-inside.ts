import { isAbsolute, relative } from "node:path";

export function isInside(root: string, path: string): boolean {
  const inner = relative(root, path);
  return inner !== "" && !inner.startsWith("..") && !isAbsolute(inner);
}
