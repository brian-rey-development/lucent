import type { FileRead } from "@lucent/core";

import type { EXIT_CODES } from "./constants.ts";

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

export interface Io {
  readonly readFile: (path: string, root?: string) => Promise<FileRead>;
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
  readonly cwd: string;
  readonly version: string;
}
