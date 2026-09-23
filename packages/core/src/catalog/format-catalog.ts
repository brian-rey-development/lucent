import { SIGNATURE_WIDTH, VERBS } from "./constants.ts";
import { formatVerb } from "./format-verb.ts";
import { durationSchema, entranceSchema, layoutSchema } from "./schema.ts";

const DUR = durationSchema.options.join("|");
const ENTER = entranceSchema.options.join("|");
const UNNAMED = VERBS.filter(({ element }) => element === "none").map(({ name }) => name);

const HEADER = [
  "Notation: [x] optional, a|b choice, X.. one or a list, A,B a two-item list. TARGET: $ID or $ID/POINT.",
  `Block: [keep $ID..] [enter ${ENTER}] [layout ${layoutSchema.options.join("|")}] do: STEP..`,
  `STEP: one verb + [at CUE|with] [id ID] [dur ${DUR}] [enter ${ENTER}]; ${UNNAMED.join(", ")} take only at and dur.`,
  "Nested steps (sheet, into) take only id.",
];
const FOOTER = `${"$ID: {PROPS}".padEnd(SIGNATURE_WIDTH)} change an element whose verb lists change; takes at and dur`;

export function formatCatalog(): string {
  return [...HEADER, ...VERBS.map((verb) => formatVerb(verb, SIGNATURE_WIDTH)), FOOTER].join("\n");
}
