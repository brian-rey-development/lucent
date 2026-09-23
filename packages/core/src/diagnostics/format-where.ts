export function formatWhere(base: string, path: readonly (string | number)[]): string {
  return path.reduce<string>((where, segment) => {
    if (typeof segment === "number") return `${where}[${segment}]`;
    return where === "" ? segment : `${where}.${segment}`;
  }, base);
}
