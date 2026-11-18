/** Only allow redirects to paths on this site ("/jobs"), never to other sites ("//evil.com"). */
export function safeNext(next: string | null | undefined, fallback = "/onboarding"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next === "/" || next.startsWith("/auth/")) return fallback;
  return next;
}
