import type { VerbDefinition } from "./types.ts";
import { bar } from "./verbs/bar.ts";
import { bases } from "./verbs/bases.ts";
import { clip } from "./verbs/clip.ts";
import { focus } from "./verbs/focus.ts";
import { helix } from "./verbs/helix.ts";
import { hide } from "./verbs/hide.ts";
import { image } from "./verbs/image.ts";
import { measure } from "./verbs/measure.ts";
import { note } from "./verbs/note.ts";
import { number } from "./verbs/number.ts";
import { photo } from "./verbs/photo.ts";
import { ring } from "./verbs/ring.ts";
import { sheet } from "./verbs/sheet.ts";
import { table } from "./verbs/table.ts";
import { text } from "./verbs/text.ts";
import { timeline } from "./verbs/timeline.ts";
import { title } from "./verbs/title.ts";
import { zoom } from "./verbs/zoom.ts";

export const VERBS: readonly VerbDefinition[] = [
  photo,
  image,
  clip,
  title,
  text,
  note,
  ring,
  measure,
  sheet,
  bar,
  number,
  helix,
  bases,
  table,
  timeline,
  zoom,
  hide,
  focus,
];

export const VERB_NAMES: readonly string[] = VERBS.map(({ name }) => name);

export const CHANGEABLE_VERBS: readonly string[] = VERBS.filter(({ change }) => change !== undefined).map(
  ({ name }) => name,
);

export const PROP_NAMES: ReadonlySet<string> = new Set(
  VERBS.flatMap(({ name, props }) => Object.keys(props.shape).filter((key) => key !== name)),
);

export const WITH_PREVIOUS = "with";

export const SIGNATURE_WIDTH = Math.max(...VERBS.map(({ signature }) => signature.length));
