// "Best match" for the signed-in person: the database ranks jobs with
// match_jobs() (supabase/migrations/0006_matching.sql), acting as that person,
// then we load those jobs' details in the ranked order.
import { loadOwnProfile, supabaseServer } from "../supabase/server";
import { whyBlurb } from "../why.mjs";
import { AUTH_ENABLED } from "../supabase/env";
import { searchJobs } from "./supabase";
import type { JobPage, JobQuery } from "../types";

const cleanQuery = (q: string) => q.replace(/[,()*%\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

/** Turn ranking reasons into the one-line "why you might be interested"; a stretch warning goes last. */
export function whyLine(reasons: string[]): string {
  const caveat = reasons.find((r) => r.startsWith("A stretch") || r.startsWith("Likely out of reach"));
  const good = reasons.filter((r) => r !== caveat);
  // The level reason is useful but less interesting than the others; keep it if there's room.
  const ordered = [...good.filter((r) => r !== "Right level for your experience"), ...good.filter((r) => r === "Right level for your experience")];
  return [...ordered.slice(0, caveat ? 2 : 3), ...(caveat ? [caveat] : [])].join(" · ");
}

interface Ranked { id: number; score: number; fit: number | null; reasons: string[]; detail: Record<string, unknown>; total: number }

/** Why this one job might interest the signed-in person, and how well it fits (for the job page). */
export async function explainJob(id: string, job: { title: string; summary?: string; skills?: string[] }): Promise<{ why: string; fit: number | null } | null> {
  if (!AUTH_ENABLED || !/^\d+$/.test(id)) return null;
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const [profile, { data, error }] = await Promise.all([loadOwnProfile(), sb.rpc("match_jobs", { p_ids: [Number(id)], p_limit: 1 })]);
  if (error || !data || !(data as Ranked[]).length) return null;
  const r = (data as Ranked[])[0];
  return { why: whyBlurb(r.detail, job, profile) || whyLine(r.reasons), fit: r.fit == null ? null : Math.round(r.fit * 100) };
}

export async function matchJobs(q: JobQuery): Promise<JobPage | null> {
  if (!AUTH_ENABLED) return null;
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const size = Math.min(Math.max(q.pageSize ?? 20, 1), 50);
  const page = Math.max(q.page ?? 0, 0);
  const text = cleanQuery(q.q ?? "");
  const [profile, rpc] = await Promise.all([loadOwnProfile(), sb.rpc("match_jobs", {
    p_q: text || null,
    p_role: q.role?.length ? q.role : null,
    p_ind: q.ind?.length ? q.ind : null,
    p_mode: q.mode?.length ? q.mode : null,
    p_lvl: q.lvl?.length ? q.lvl : null,
    p_process: !!q.process,
    p_limit: size,
    p_offset: page * size,
  })]);
  const { data, error } = rpc;
  if (error) throw new Error("Couldn't rank jobs: " + error.message);
  const ranked = (data ?? []) as Ranked[];
  // Reuse the regular search for job details and filter counts, then keep the ranked order.
  const ids = ranked.map((r) => String(r.id));
  const details = ids.length ? await searchJobs({ ids, pageSize: ids.length }) : await searchJobs({ pageSize: 1 });
  const byId = new Map(details.jobs.map((j) => [j.id, j]));
  const jobs = ranked
    .map((r) => {
      const j = byId.get(String(r.id));
      if (!j) return null;
      const blurb = whyBlurb(r.detail, { title: j.title, summary: j.why, skills: j.skills }, profile);
      return { ...j, why: blurb || whyLine(r.reasons), summary: j.why, fit: r.fit == null ? null : Math.round(r.fit * 100) };
    })
    .filter((j): j is NonNullable<typeof j> => j !== null);
  return { jobs, total: ranked.length ? Number(ranked[0].total) : 0, facets: details.facets };
}
