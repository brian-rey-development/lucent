import { readFile, stat } from "node:fs/promises";

import type { FileAccess } from "../../src/model/index.ts";

const EXAMPLE = new URL("../../../../examples/halden-ep01/", import.meta.url);
const MISSING = { ok: false, reason: "no such file" } as const;

export const EXAMPLE_FILES: FileAccess = {
  readFile: async (path) => ({ ok: true, text: await readFile(new URL(path, EXAMPLE), "utf8") }),
  findFile: async (path) => {
    const found = await stat(new URL(path, EXAMPLE)).catch(() => undefined);
    return found?.isFile() === true ? { ok: true } : MISSING;
  },
};

export async function readExample(): Promise<string> {
  return readFile(new URL("ep01.lucent.md", EXAMPLE), "utf8");
}
