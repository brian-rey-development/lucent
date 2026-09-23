import { quote } from "../diagnostics/index.ts";

export function describeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "string") return quote(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.length === 0 ? "an empty list" : "a list";
  return "a mapping";
}
