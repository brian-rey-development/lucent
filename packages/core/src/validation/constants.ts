export const DEFAULT_MESSAGE = "\u0000default";

export const TYPE_NAMES: Readonly<Record<string, string>> = {
  string: "text",
  number: "a number",
  boolean: "true or false",
  object: "a mapping",
  record: "a mapping",
  array: "a list",
  tuple: "a list",
};

export const UNITS: Readonly<Record<string, string>> = { string: "characters", array: "items" };

export const NUMERIC = /^-?\d+(?:\.\d+)?$/;
