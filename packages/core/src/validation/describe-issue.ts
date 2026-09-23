import type { z } from "zod";

import { closestMatch, toId } from "../text/index.ts";
import type { YamlPath } from "../yaml/index.ts";
import { describeValue } from "./describe-value.ts";
import { fixFor } from "./fix-for.ts";
import { keysAt } from "./keys-at.ts";
import { invalidKey, invalidValue, missingKey, unknownKey } from "./problems.ts";
import type { Issue } from "./types.ts";
import { valueAt } from "./value-at.ts";

export function describeIssue(
  issue: z.core.$ZodIssue,
  schema: z.ZodType,
  input: unknown,
): readonly Issue[] {
  const path = issue.path.map((segment) =>
    typeof segment === "number" ? segment : String(segment),
  );
  if (issue.code === "unrecognized_keys") return unknownKeys(issue.keys, path, schema);
  if (issue.code === "invalid_key") return [keyIssue(issue, path)];
  const value = valueAt(input, path);
  const key = path.at(-1);
  if (value === undefined && typeof key === "string") {
    return [{ problem: missingKey(key), path: path.slice(0, -1), at: "value", key: keyOf(path) }];
  }
  return [{ problem: invalidValue(describeValue(value), fixFor(issue, value)), path, at: "value" }];
}

function unknownKeys(keys: readonly string[], path: YamlPath, schema: z.ZodType): readonly Issue[] {
  const allowed = keysAt(schema, path);
  return keys.map((key) => {
    const closest = closestMatch(key, allowed);
    const renames = closest === undefined ? undefined : keyOf([...path, closest]);
    return { problem: unknownKey(key, closest), path: [...path, key], at: "key", renames };
  });
}

function keyIssue(issue: z.core.$ZodIssueInvalidKey, path: YamlPath): Issue {
  const key = String(path.at(-1));
  const id = toId(key);
  const fix =
    id === undefined
      ? `rename it to ${issue.issues[0]?.message ?? "a valid key"}`
      : `rename it to ${id}`;
  return { problem: invalidKey(key, fix), path, at: "key" };
}

function keyOf(path: YamlPath): string {
  return path.join(".");
}
