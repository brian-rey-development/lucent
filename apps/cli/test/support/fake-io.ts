import type { Io } from "../../src/shared/index.ts";

export interface FakeIo extends Io {
  readonly out: string[];
  readonly err: string[];
}

export function fakeIo(files: Readonly<Record<string, string>> = {}): FakeIo {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    readFile: async (path, root) => {
      if (root !== undefined && !path.startsWith(`${root}/`))
        return { ok: false, reason: "is outside the video folder" };
      const text = files[path];
      return text === undefined ? { ok: false, reason: "no such file" } : { ok: true, text };
    },
    stdout: (text) => out.push(text),
    stderr: (text) => err.push(text),
    cwd: "/work",
    version: "1.2.3",
  };
}
