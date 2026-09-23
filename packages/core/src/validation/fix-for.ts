import type { z } from "zod";

import { oneOf } from "../diagnostics/index.ts";
import { closestMatch } from "../text/index.ts";
import { DEFAULT_MESSAGE, NUMERIC, TYPE_NAMES, UNITS } from "./constants.ts";

export function fixFor(issue: z.core.$ZodIssue, value: unknown): string {
  if (issue.message !== DEFAULT_MESSAGE) return `write ${issue.message}`;
  if (issue.code === "invalid_type") return typeFix(issue.expected, value);
  if (issue.code === "invalid_value") return optionsFix(issue.values.map(String), value);
  if (issue.code === "too_small") return boundFix("at least", issue.minimum, issue.origin);
  if (issue.code === "too_big") return boundFix("at most", issue.maximum, issue.origin);
  return "fix the value";
}

function typeFix(expected: string, value: unknown): string {
  if (expected === "number" && typeof value === "string" && NUMERIC.test(value)) return "remove the quotes";
  return `write ${TYPE_NAMES[expected] ?? expected}`;
}

function optionsFix(options: readonly string[], value: unknown): string {
  const [only] = options;
  if (options.length === 1 && only !== undefined) return `use ${only}`;
  const closest = typeof value === "string" ? closestMatch(value, options) : undefined;
  return closest === undefined ? `use ${oneOf(options)}` : `use ${closest}`;
}

function boundFix(relation: string, limit: number | bigint, origin: string): string {
  const unit = UNITS[origin];
  if (unit === undefined) return `use ${relation} ${limit}`;
  if (relation === "at least" && limit === 1) return origin === "array" ? "add an item" : "write text";
  return `use ${relation} ${limit} ${unit}`;
}
