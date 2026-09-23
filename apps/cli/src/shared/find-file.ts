import { realpath, stat } from "node:fs/promises";

import type { FileFound } from "@lucent/core";

import { OUTSIDE_ROOT } from "./constants.ts";
import { isInside } from "./is-inside.ts";
import { reasonOf } from "./reason-of.ts";

export async function findFile(path: string, root: string): Promise<FileFound> {
  try {
    const real = await realpath(path);
    if (!isInside(await realpath(root), real)) return { ok: false, reason: OUTSIDE_ROOT };
    const stats = await stat(real);
    if (stats.isFile()) return { ok: true };
    return { ok: false, reason: stats.isDirectory() ? "is a directory" : "is not a regular file" };
  } catch (error) {
    return { ok: false, reason: reasonOf(error) };
  }
}
