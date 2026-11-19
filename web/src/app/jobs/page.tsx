import Jobs from "@/screens/Jobs";
import { data } from "@/lib/data";
import { matchJobs } from "@/lib/data/match";
import { currentUser, ownMinFit, ownSavedIds } from "@/lib/supabase/server";
import type { JobPage, JobQuery } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean).slice(0, 40);

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const signedIn = Boolean(await currentUser());
  // Start the small per-person lookups together instead of one after another.
  const [savedIds, minFit] = signedIn
    ? await Promise.all([ownSavedIds().catch(() => [] as string[]), ownMinFit().catch(() => null)])
    : [[] as string[], null];
  const sort = sp.sort === "pay" ? "pay" : sp.sort === "new" ? "new" : signedIn ? "match" : "new";
  const query: JobQuery = {
    q: typeof sp.q === "string" ? sp.q.slice(0, 80) : "",
    role: list(sp.role), ind: list(sp.ind), mode: list(sp.mode), lvl: list(sp.lvl),
    process: sp.process === "1",
    sort,
    page: Math.max(0, (Number(sp.page) || 1) - 1),
    pageSize: 20,
    // Saved jobs live in My jobs, so the list only shows new ones.
    excludeIds: savedIds,
  };
  let page: JobPage | null = null;
  let error: string | null = null;
  try {
    page = (sort === "match" ? await matchJobs(query) : null) ?? (await data().searchJobs({ ...query, sort: sort === "match" ? "new" : sort }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    error = /timeout|canceling statement/i.test(msg)
      ? "Best match took too long this time, so these are the newest jobs. Try Best match again in a minute."
      : msg || "Couldn't load jobs.";
    // If ranking fails, still show the newest jobs.
    if (sort === "match") page = await data().searchJobs({ ...query, sort: "new" }).catch(() => null);
  }
  return <Jobs page={page} query={query} error={error} signedIn={signedIn} minFit={minFit} />;
}
