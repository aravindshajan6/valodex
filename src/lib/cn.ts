/** Tiny className joiner; keeps us off clsx/tailwind-merge for now. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
