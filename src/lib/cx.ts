/** Concatène des classes Tailwind conditionnelles sans dépendance externe. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
