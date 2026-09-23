import type { Problem } from "../diagnostics/index.ts";

export const MISSING: Problem = {
  code: "E101",
  message: "the file does not start with ---",
  fix: "start with ---, the frontmatter, then ---",
};

export const UNCLOSED: Problem = {
  code: "E101",
  message: "the frontmatter is never closed",
  fix: "add a --- line after the frontmatter",
};
