import type { Problem } from "../diagnostics/index.ts";

export function unreadable(path: string, reason: string): Problem {
  return {
    code: "E141",
    message: `cannot read ${path}: ${reason}`,
    fix: "check the path; it is relative to the video file",
  };
}
