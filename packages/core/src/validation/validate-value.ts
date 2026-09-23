import type { z } from "zod";

import {
  createDiagnostic,
  formatWhere,
  type Diagnostic,
  type Result,
} from "../diagnostics/index.ts";
import { DEFAULT_MESSAGE } from "./constants.ts";
import { describeIssue } from "./describe-issue.ts";
import type { Issue, Site } from "./types.ts";

export function validateValue<T>(
  schema: z.ZodType<T>,
  value: unknown,
  site: Site,
): Result<T | undefined> {
  const result = schema.safeParse(value, { error: () => DEFAULT_MESSAGE });
  if (result.success) return { value: result.data, diagnostics: [] };
  const issues = result.error.issues.flatMap((issue) => describeIssue(issue, schema, value));
  const renamed = new Set(issues.map(({ renames }) => renames));
  const kept = issues.filter(({ key }) => key === undefined || !renamed.has(key));
  return { value: undefined, diagnostics: kept.map((issue) => toDiagnostic(issue, site)) };
}

function toDiagnostic(
  { problem, path, at }: Issue,
  { locate, path: base, place }: Site,
): Diagnostic {
  const absolute = [...base, ...path];
  const where = formatWhere(place.where, at === "key" ? absolute.slice(0, -1) : absolute);
  return createDiagnostic(problem, { ...place, where, position: locate[at](absolute) });
}
