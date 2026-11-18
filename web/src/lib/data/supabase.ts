// Reads the jobs database (written by the Python poller) through the read-only
// `job_listings` view: open New York City jobs with their classification.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Facet, JobPage, JobQuery, DataSource, JobDetail, JobSummary, PostingSection, WorkMode } from "../types";
import { cardDetails, choosePicks, type Candidate, type PickCard } from "./picks";

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).");
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
}

const LIST_COLS =
  "id, board_key, company_name, title, workplace_type, first_seen_at, industry, role_family, seniority, " +
  "work_mode, salary_min_annual, salary_max_annual, interview_process, summary";

interface Row {
  id: number; board_key: string; company_name: string; title: string; workplace_type: string | null;
  first_seen_at: string; industry: string | null; role_family: string | null; seniority: string | null;
  work_mode: string | null; salary_min_annual: number | null; salary_max_annual: number | null;
  interview_process: string | null; summary: string | null;
  // detail only
  url?: string | null; description_text?: string | null; skills?: string | null;
  years_experience_min?: number | null; degree_required?: string | null; locations?: string | null;
}

const LEVEL: Record<string, string> = {
  intern: "Internship", entry: "Entry level", mid: "Mid-level", senior: "Senior", staff_principal: "Staff+",
  manager: "Manager", director: "Director", executive: "Executive", unknown: "Level not stated",
};
const MODE: Record<WorkMode, string> = { onsite: "Onsite", hybrid: "Hybrid", remote: "Remote" };

function initials(name: string) {
  const words = name.split(/[\s\-_.]+/).filter((w) => /[A-Za-z0-9]/.test(w));
  if (!words.length) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}
const parse = <T,>(s: string | null | undefined): T | null => {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
};
const k = (n: number | null) => (n == null ? null : Math.round(n / 1000));

function mode(r: Row): WorkMode {
  const m = (r.work_mode || r.workplace_type || "").toLowerCase();
  return m.includes("remote") ? "remote" : m.includes("hybrid") ? "hybrid" : "onsite";
}

type Process = { stages: { stage: string; detail: string }[]; timeline: string | null };

export const LEVEL_LABELS = LEVEL;

interface SearchRow extends Row { mode: WorkMode; has_process: boolean }

/** Characters that would break PostgREST's or=() filter syntax. */
const cleanQuery = (q: string) => q.replace(/[,()*%\\:."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

export async function searchJobs(q: JobQuery): Promise<JobPage> {
  const size = Math.min(Math.max(q.pageSize ?? 20, 1), 50);
  const page = Math.max(q.page ?? 0, 0);
  let query = db()
    .from("jobs_search")
    .select("id, board_key, company_name, title, first_seen_at, industry, role_family, seniority, mode, " +
            "salary_min_annual, salary_max_annual, has_process, interview_process, summary", { count: "exact" });
  if (q.ids?.length) query = query.in("id", q.ids.map(Number));
  if (q.role?.length) query = query.in("role_family", q.role);
  if (q.ind?.length) query = query.in("industry", q.ind);
  if (q.mode?.length) query = query.in("mode", q.mode);
  if (q.lvl?.length) query = query.in("seniority", q.lvl);
  if (q.process) query = query.eq("has_process", true);
  const text = cleanQuery(q.q ?? "");
  if (text) query = query.or(`title.ilike.*${text}*,company_name.ilike.*${text}*,summary.ilike.*${text}*`);
  query = q.sort === "pay"
    ? query.order("salary_max_annual", { ascending: false, nullsFirst: false }).order("salary_min_annual", { ascending: false, nullsFirst: false })
    : query.order("first_seen_at", { ascending: false }).order("id", { ascending: false });
  const [{ data, error, count }, facetRes] = await Promise.all([
    query.range(page * size, page * size + size - 1),
    db().from("job_facets").select("facet, value, n"),
  ]);
  if (error) throw new Error("Couldn't load jobs: " + error.message);
  if (facetRes.error) throw new Error("Couldn't load filters: " + facetRes.error.message);
  const facets: JobPage["facets"] = { role: [], ind: [], mode: [], lvl: [] };
  for (const f of (facetRes.data ?? []) as { facet: keyof JobPage["facets"]; value: string; n: number }[]) {
    if (facets[f.facet]) facets[f.facet].push({ value: f.value, n: f.n } as Facet);
  }
  Object.values(facets).forEach((list) => list.sort((a, b) => b.n - a.n));
  const jobs = ((data ?? []) as unknown as SearchRow[]).map((r) => ({ ...toSummary({ ...r, work_mode: r.mode }), process: r.has_process }));
  return { jobs, total: count ?? 0, facets };
}

export function toSummary(r: Row): JobSummary {
  const l = mode(r);
  const proc = parse<Process>(r.interview_process);
  const lvl = r.seniority || "unknown";
  return {
    id: String(r.id),
    mono: initials(r.company_name),
    title: r.title,
    company: r.company_name,
    companyId: r.board_key,
    loc: "New York · " + MODE[l],
    stage: "",
    lo: k(r.salary_min_annual),
    hi: k(r.salary_max_annual),
    role: r.role_family || "Not classified yet",
    roleLabel: r.role_family || "Not classified yet",
    ind: r.industry || "Not classified yet",
    indLabel: r.industry || "Not classified yet",
    l,
    lvl,
    lvlLabel: LEVEL[lvl] ?? lvl,
    process: !!proc?.stages?.length,
    steps: proc?.stages?.length ?? 0,
    contacts: 0,
    days: Math.max(0, (Date.now() - Date.parse(r.first_seen_at)) / 86_400_000),
    why: r.summary || "",
    possible: false,
  };
}

/** Turn plain posting text into sections: short lines without a final period read as headings. */
export function sections(text: string): PostingSection[] {
  const lines = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const out: PostingSection[] = [];
  let cur: PostingSection | null = null;
  const isHeading = (s: string) => s.length <= 60 && !/[.!?,;]$/.test(s) && /^[A-Z0-9]/.test(s) && s.split(" ").length <= 8;
  for (const line of lines) {
    if (isHeading(line)) {
      cur = { h: line.replace(/:$/, "") };
      out.push(cur);
      continue;
    }
    if (!cur) { cur = { h: "" }; out.push(cur); }
    if (cur.text && !cur.items) { cur.items = [cur.text, line]; delete cur.text; }
    else if (cur.items) cur.items.push(line);
    else cur.text = line;
  }
  return out.filter((s) => s.text || s.items?.length);
}

function ago(days: number) {
  if (days < 1) return "today";
  if (days < 2) return "1 day ago";
  if (days < 7) return Math.floor(days) + " days ago";
  const w = Math.floor(days / 7);
  return w === 1 ? "1 week ago" : w + " weeks ago";
}

export const supabaseSource: DataSource = {
  name: "supabase",

  async listJobs(q) {
    const { data, error } = await db()
      .from("job_listings")
      .select(LIST_COLS)
      // Only labeled jobs: until a job is labeled it has no company name, pay,
      // role or industry. New jobs are labeled within a day of being found.
      .not("processed_at", "is", null)
      .order("first_seen_at", { ascending: false })
      .limit(q?.limit ?? 1000);
    if (error) throw new Error("Couldn't load jobs: " + error.message);
    return (data as unknown as Row[]).map(toSummary);
  },

  searchJobs,

  async countJobs() {
    const { count, error } = await db().from("job_listings").select("id", { count: "exact", head: true });
    if (error) throw new Error("Couldn't count jobs: " + error.message);
    return count ?? 0;
  },

  async getJob(id) {
    if (!/^\d+$/.test(id)) return null;
    const { data, error } = await db()
      .from("job_listings")
      .select(LIST_COLS + ", url, description_text, skills, years_experience_min, degree_required, locations")
      .eq("id", Number(id))
      .maybeSingle();
    if (error) throw new Error("Couldn't load the job: " + error.message);
    if (!data) return null;
    const r = data as unknown as Row;
    const s = toSummary(r);
    const proc = parse<Process>(r.interview_process);
    const skills = parse<string[]>(r.skills) ?? [];
    const bullets = [
      r.years_experience_min != null ? `${r.years_experience_min}+ years of experience` : "",
      r.degree_required && r.degree_required !== "none" && r.degree_required !== "unknown" ? `Degree: ${r.degree_required.replace(/_/g, " ")}` : "",
      skills.length ? "Skills: " + skills.join(", ") : "",
    ].filter(Boolean);
    const detail: JobDetail = {
      ...s,
      url: r.url || "",
      postedLabel: "Posted " + ago(s.days),
      payLabel: s.lo != null ? (s.lo === s.hi ? `$${s.lo}k` : `$${s.lo}k–${s.hi}k`) : "",
      levelLabel: s.lvlLabel,
      companyLine: "",
      whyParas: [],
      aboutText: r.summary || "",
      aboutBullets: bullets,
      posting: sections(r.description_text || ""),
      timeline: proc?.timeline || "",
      timelineSource: proc ? "from the posting" : "",
      steps_: (proc?.stages ?? []).map((st) => ({ name: st.stage.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), meta: st.detail })),
    };
    return detail;
  },

  async marketStats() {
    const { data, error } = await db().from("market_stats").select("*").limit(2000);
    if (error) throw new Error("Couldn't load market numbers: " + error.message);
    return ((data ?? []) as { role_family: string | null; industry: string | null; all_roles: boolean; all_industries: boolean;
      openings: number; with_pay: number; pay_lo: number | null; pay_hi: number | null }[]).map((r) => ({
      role: r.role_family, industry: r.industry, allRoles: r.all_roles, allIndustries: r.all_industries,
      openings: r.openings, withPay: r.with_pay, payLo: r.pay_lo, payHi: r.pay_hi,
    }));
  },

  async roleFamiliesOf(ids) {
    const nums = ids.filter((x) => /^\d+$/.test(x)).map(Number);
    if (!nums.length) return [];
    const { data, error } = await db().from("job_listings").select("role_family").in("id", nums);
    if (error) throw new Error("Couldn't load your picks: " + error.message);
    const counts = new Map<string, number>();
    for (const r of (data ?? []) as { role_family: string | null }[]) if (r.role_family) counts.set(r.role_family, (counts.get(r.role_family) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  },

  async quickPicks(profile, seed) {
    const { data, error } = await db()
      .from("job_listings")
      .select("id, board_key, company_name, title, workplace_type, first_seen_at, industry, role_family, seniority, work_mode, " +
              "salary_min_annual, salary_max_annual, interview_process, summary, skills")
      .not("processed_at", "is", null)
      .order("first_seen_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error("Couldn't load jobs: " + error.message);
    const rows = (data ?? []) as unknown as Row[];
    const cands: Candidate[] = rows.map((r) => {
      const s = toSummary(r);
      return { id: s.id, mono: s.mono, title: s.title, company: s.company, loc: s.loc, lo: s.lo, hi: s.hi,
        role: s.roleLabel, ind: s.indLabel, skills: parse<string[]>(r.skills) ?? [], summary: r.summary || "" };
    });
    const chosen = choosePicks(cands, profile, seed);
    if (!chosen.length) return [];
    const { data: det, error: e2 } = await db()
      .from("job_listings")
      .select("id, description_text, years_experience_min, degree_required")
      .in("id", chosen.map((x) => Number(x.c.id)));
    if (e2) throw new Error("Couldn't load jobs: " + e2.message);
    const byId = new Map(((det ?? []) as unknown as Row[]).map((r) => [String(r.id), r]));
    return chosen.map(({ c, wild }): PickCard => {
      const d = byId.get(c.id);
      const wants = [
        d?.years_experience_min != null ? `${d.years_experience_min}+ years of experience` : "",
        ...c.skills.slice(0, 3),
      ].filter(Boolean);
      const { does, wants: w } = cardDetails(sections(d?.description_text || ""), { summary: c.summary, wants });
      return {
        id: c.id, mono: c.mono, title: c.title, company: c.company, loc: c.loc,
        pay: c.lo != null ? (c.lo === c.hi ? `$${c.lo}k` : `$${c.lo}–${c.hi}k`) : "Pay not listed",
        stage: c.ind, lane: c.role, wild, about: c.summary, does, wants: w,
      };
    });
  },

};
