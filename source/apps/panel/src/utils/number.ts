export function isNumber(x: unknown): boolean {
  return !isNaN(Number(x));
}
