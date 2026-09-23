import { quote, type Problem } from "../diagnostics/index.ts";
import type { YamlError } from "../yaml/index.ts";

type Text = Omit<Problem, "code">;

const COMMENT = /^#\s/;
const FLOW_END = /[\s,\]}]/;

const SYNTAX: Readonly<Record<string, Text>> = {
  BLOCK_AS_IMPLICIT_KEY: { message: '": " inside a value', fix: "quote the value" },
  MULTILINE_IMPLICIT_KEY: {
    message: "key spans two lines",
    fix: "put the key and its : on one line",
  },
  TAB_AS_INDENT: { message: "tab used for indentation", fix: "indent with spaces" },
  UNEXPECTED_TOKEN: { message: "unexpected text after a value", fix: "quote the value" },
  BAD_DQ_ESCAPE: { message: "bad escape in double quotes", fix: "use single quotes" },
  BAD_INDENT: { message: "bad indentation", fix: "align it with the keys above" },
};

const TOKEN_TEXT: Readonly<
  Record<"alias" | "anchor" | "tag" | "directive" | "duplicate", (token: string) => Text>
> = {
  alias: (token) => ({ message: `${quote(token)} reads as a YAML alias`, fix: "quote the value" }),
  anchor: (token) => ({
    message: `${quote(token)} reads as a YAML anchor`,
    fix: "quote the value",
  }),
  tag: (token) => ({ message: `${quote(token)} reads as a YAML tag`, fix: "quote the value" }),
  directive: (token) => ({ message: `${quote(token)} directive`, fix: "remove the line" }),
  duplicate: (token) => ({ message: `duplicate key ${token}`, fix: "remove one" }),
};

const BY_MESSAGE: readonly (readonly [RegExp, Text])[] = [
  [/end with a \]$/, { message: "unclosed [", fix: "add ]" }],
  [/end with a \}$/, { message: "unclosed {", fix: "add }" }],
  [
    /without - indicator$/,
    { message: "list item without -", fix: "add - or indent it under the item above" },
  ],
];

export function yamlProblem(error: YamlError): Problem {
  if (error.kind === "syntax") return { code: "E102", ...syntaxText(error.code, error.message) };
  if (error.kind === "comment") return { code: "E103", ...commentText(error.token) };
  return { code: "E102", ...TOKEN_TEXT[error.kind](error.token) };
}

function commentText(token: string): Text {
  if (COMMENT.test(token)) return { message: "inline # comment", fix: "move it to its own line" };
  const [value = token] = token.split(FLOW_END);
  return { message: `${quote(value)} starts a comment`, fix: "quote it" };
}

function syntaxText(code: string, message: string): Text {
  const known = BY_MESSAGE.find(([pattern]) => pattern.test(message));
  return (
    known?.[1] ??
    SYNTAX[code] ?? { message: "invalid YAML", fix: "quote the value or fix the indentation" }
  );
}

export function unknownKey(key: string, closest: string | undefined): Problem {
  return {
    code: "E104",
    message: `unknown key ${key}`,
    fix: closest === undefined ? "remove it" : `use ${closest}`,
  };
}

export function invalidKey(key: string, fix: string): Problem {
  return { code: "E105", message: `key ${key} is invalid`, fix };
}

export function missingKey(key: string): Problem {
  return { code: "E106", message: `missing key ${key}`, fix: `add ${key}:` };
}

export function invalidValue(found: string, fix: string): Problem {
  return { code: "E105", message: `is ${found}`, fix };
}
