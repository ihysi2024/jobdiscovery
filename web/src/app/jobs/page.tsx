import Jobs from "@/screens/Jobs";
import { data } from "@/lib/data";
import type { JobPage, JobQuery } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean).slice(0, 40);

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const query: JobQuery = {
    q: typeof sp.q === "string" ? sp.q.slice(0, 80) : "",
    role: list(sp.role), ind: list(sp.ind), mode: list(sp.mode), lvl: list(sp.lvl),
    process: sp.process === "1",
    sort: sp.sort === "pay" ? "pay" : "new",
    page: Math.max(0, (Number(sp.page) || 1) - 1),
    pageSize: 20,
  };
  let page: JobPage | null = null;
  let error: string | null = null;
  try {
    page = await data().searchJobs(query);
  } catch (e) {
    error = e instanceof Error ? e.message : "Couldn't load jobs.";
  }
  return <Jobs page={page} query={query} error={error} />;
}
