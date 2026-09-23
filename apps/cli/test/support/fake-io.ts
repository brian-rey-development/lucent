import type { Io } from "../../src/shared/index.ts";

export interface FakeIo extends Io {
  readonly out: string[];
  readonly err: string[];
}

const OUTSIDE = { ok: false, reason: "is outside the video folder" } as const;
const MISSING = { ok: false, reason: "no such file" } as const;

export function fakeIo(files: Readonly<Record<string, string>> = {}): FakeIo {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    readFile: async (path, root) => {
      if (root !== undefined && !path.startsWith(`${root}/`)) return OUTSIDE;
      const text = files[path];
      return text === undefined ? MISSING : { ok: true, text };
    },
    findFile: async (path, root) => {
      if (!path.startsWith(`${root}/`)) return OUTSIDE;
      return files[path] === undefined ? MISSING : { ok: true };
    },
    stdout: (text) => out.push(text),
    stderr: (text) => err.push(text),
    cwd: "/work",
    version: "1.2.3",
  };
}
