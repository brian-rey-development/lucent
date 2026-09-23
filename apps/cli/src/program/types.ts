import type { CatalogArgs } from "../commands/catalog/index.ts";
import type { CheckArgs } from "../commands/check/index.ts";

export type Topic = "check" | "catalog" | undefined;

export type Command =
  | ({ readonly name: "check" } & CheckArgs)
  | ({ readonly name: "catalog" } & CatalogArgs)
  | { readonly name: "help"; readonly topic: Topic }
  | { readonly name: "version" };
