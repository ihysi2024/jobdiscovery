"use client";
// The job list: every labeled open NYC job, searched, filtered, sorted and paged
// in the database. Filters live in the URL, so a filtered list can be shared or reloaded.
import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { likeJob, trackedPostingIds, unlikeJob } from "@/lib/tracker";

const C = { plum: "#7A3E6E", ink: "#2A2028", muted: "#665D63", soft: "#7A7078", line: "#EFE9D8", chip: "#F7F2E4", plumSoft: "#F3E6EF" };
const MODE = { onsite: "Onsite", hybrid: "Hybrid", remote: "Remote" };
const LEVEL = { intern: "Internship", entry: "Entry level", mid: "Mid-level", senior: "Senior", staff_principal: "Staff+", staff: "Staff+",
  manager: "Manager", director: "Director", executive: "Executive", unknown: "Level not stated" };
const GROUPS = [
  ["role", "Kind of work", (v) => v],
  ["ind", "Industry", (v) => v],
  ["mode", "Work mode", (v) => MODE[v] || v],
  ["lvl", "Seniority", (v) => LEVEL[v] || v],
];
const SHOW = 8;

function ageOf(days) {
  if (days < 1) return "today";
  if (days < 2) return "1 day ago";
  if (days < 7) return Math.floor(days) + " days ago";
  const w = Math.floor(days / 7);
  return w === 1 ? "1 week ago" : w + " weeks ago";
}
const payOf = (j) => (j.lo == null ? "" : j.lo === j.hi ? `$${j.lo}k` : `$${j.lo}k–${j.hi}k`);

function toParams(q) {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  for (const k of ["role", "ind", "mode", "lvl"]) (q[k] || []).forEach((v) => p.append(k, v));
  if (q.process) p.set("process", "1");
  if (q.sort && q.sort !== "new") p.set("sort", q.sort);
  if (q.page) p.set("page", String(q.page + 1));
  return p.toString();
}

function Heart({ on }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? C.plum : "none"} stroke={on ? C.plum : "#4D444B"} strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

export default function Jobs({ page, query, error }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = React.useTransition();
  const [text, setText] = React.useState(query.q || "");
  const [liked, setLiked] = React.useState(new Set());
  const [open, setOpen] = React.useState({});
  const [likeError, setLikeError] = React.useState("");

  React.useEffect(() => { setText(query.q || ""); }, [query.q]);
  React.useEffect(() => { trackedPostingIds().then(setLiked).catch(() => {}); }, []);

  const go = (patch) => {
    const next = { ...query, page: 0, ...patch };
    start(() => router.push(path + (toParams(next) ? "?" + toParams(next) : ""), { scroll: "page" in patch }));
  };
  const toggle = (key, value) => {
    const cur = query[key] || [];
    go({ [key]: cur.includes(value) ? cur.filter((x) => x !== value) : cur.concat(value) });
  };
  const toggleLike = async (j) => {
    const on = liked.has(j.id);
    const next = new Set(liked);
    on ? next.delete(j.id) : next.add(j.id);
    setLiked(next);
    try {
      if (on) await unlikeJob(j.id); else await likeJob({ postingId: j.id, title: j.title, company: j.company });
      setLikeError("");
    } catch (e) {
      setLiked(liked);
      setLikeError(e.message);
    }
  };

  const { jobs = [], total = 0, facets = { role: [], ind: [], mode: [], lvl: [] } } = page || {};
  const size = query.pageSize || 20;
  const p = query.page || 0;
  const from = total ? p * size + 1 : 0;
  const to = Math.min(total, (p + 1) * size);
  const filtered = !!(query.q || query.process || GROUPS.some(([k]) => (query[k] || []).length));

  const search = (
    <form role="search" onSubmit={(e) => { e.preventDefault(); go({ q: text.trim() }); }} style={{ flex: "1", maxWidth: "640px", display: "flex", alignItems: "center", gap: "10px", height: "44px", padding: "0 6px 0 16px", border: "1px solid #E6DED0", borderRadius: "10px", background: "#FFFFFF" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <label htmlFor="q" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden" }}>Search jobs</label>
      <input id="q" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by title, company or keyword"
        style={{ flex: "1", border: "none", background: "transparent", font: "400 14px Inter, sans-serif", outline: "none", color: C.ink, boxShadow: "none" }} />
      {query.q ? <button type="button" onClick={() => { setText(""); go({ q: "" }); }} aria-label="Clear search" style={{ width: "28px", height: "28px", border: "none", borderRadius: "14px", background: C.line, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4D444B" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button> : null}
      <button type="submit" style={{ height: "32px", padding: "0 14px", border: "none", borderRadius: "8px", background: C.plum, color: "#FFFFFF", font: "500 13px Inter, sans-serif" }}>Search</button>
    </form>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: C.ink, fontFamily: "Inter, system-ui, sans-serif", fontSize: "14px" }}>
      <AppHeader active="jobs" search={search} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "48px", maxWidth: "1280px", margin: "0 auto", padding: "32px 40px 64px", boxSizing: "border-box" }}>
        <aside style={{ flex: "1 1 220px", maxWidth: "260px", display: "flex", flexDirection: "column", gap: "28px" }} aria-label="Filters">
          {GROUPS.map(([key, name, label]) => {
            const opts = facets[key] || [];
            const chosen = query[key] || [];
            const shown = open[key] ? opts : opts.slice(0, SHOW).concat(opts.slice(SHOW).filter((o) => chosen.includes(o.value)));
            return (
              <fieldset key={key} style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                <legend style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, marginBottom: "8px", padding: 0 }}>{name}</legend>
                {shown.map((o) => (
                  <label key={o.value} style={{ display: "flex", alignItems: "center", gap: "10px", minHeight: "32px" }}>
                    <input type="checkbox" checked={chosen.includes(o.value)} onChange={() => toggle(key, o.value)} style={{ width: "16px", height: "16px", accentColor: C.plum, margin: 0 }} />
                    <span style={{ flex: 1 }}>{label(o.value)}</span>
                    <span style={{ color: C.soft, fontSize: "13px" }}>{o.n.toLocaleString("en-US")}</span>
                  </label>
                ))}
                {opts.length > SHOW ? (
                  <button type="button" onClick={() => setOpen({ ...open, [key]: !open[key] })} style={{ alignSelf: "flex-start", marginTop: "4px", padding: "4px 0", border: "none", background: "transparent", color: C.plum, font: "500 13px Inter, sans-serif" }}>
                    {open[key] ? "Show fewer" : `Show all ${opts.length}`}
                  </button>
                ) : null}
              </fieldset>
            );
          })}
          <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
            <legend style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, marginBottom: "8px", padding: 0 }}>Only show</legend>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", minHeight: "32px" }}>
              <input type="checkbox" checked={!!query.process} onChange={() => go({ process: !query.process })} style={{ width: "16px", height: "16px", accentColor: C.plum, margin: 0 }} />
              <span>Interview process described</span>
            </label>
          </fieldset>
          {filtered ? <button type="button" onClick={() => { setText(""); go({ q: "", role: [], ind: [], mode: [], lvl: [], process: false }); }} style={{ alignSelf: "flex-start", height: "36px", padding: "0 14px", borderRadius: "18px", border: `1.5px solid ${C.line}`, background: "#FFFFFF", font: "500 13px Inter, sans-serif", color: C.ink }}>Clear all filters</button> : null}
        </aside>

        <main style={{ flex: "999 1 600px", minWidth: 0, display: "flex", flexDirection: "column" }} aria-busy={pending}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", paddingBottom: "16px", borderBottom: `1px solid ${C.line}` }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 600, letterSpacing: "-0.2px" }}>
                {total.toLocaleString("en-US")} open {total === 1 ? "job" : "jobs"} in New York{query.q ? ` for “${query.q}”` : ""}
              </h1>
              <div style={{ marginTop: "4px", color: C.muted }}>
                Straight from employers' career pages, checked daily.{" "}
                {liked.size ? <Link href="/my-jobs">{liked.size} in My jobs →</Link> : null}
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", color: C.muted }}>
              Sort
              <select value={query.sort || "new"} onChange={(e) => go({ sort: e.target.value })} style={{ height: "36px", padding: "0 10px", border: "1px solid #E6DED0", borderRadius: "8px", background: "#FFFFFF", font: "400 14px Inter, sans-serif", color: C.ink }}>
                <option value="new">Newest first</option>
                <option value="pay">Highest pay</option>
              </select>
            </label>
          </div>
          {likeError ? <p role="alert" style={{ margin: "12px 0 0", color: "#8A2A2A" }}>{likeError}</p> : null}
          {error ? <p role="alert" style={{ margin: "24px 0", color: "#8A2A2A" }}>{error}</p> : null}

          <div style={{ opacity: pending ? 0.55 : 1, transition: "opacity 120ms ease" }}>
            {jobs.map((j) => {
              const on = liked.has(j.id);
              const pay = payOf(j);
              return (
                <div key={j.id} className="job-row" style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "22px 12px", margin: "0 -8px", borderRadius: "14px", borderBottom: `1px solid ${C.line}` }}>
                  <Link href={"/jobs/" + encodeURIComponent(j.id)} style={{ flex: 1, minWidth: 0, display: "flex", gap: "20px", textDecoration: "none", color: C.ink }}>
                    <div className="job-mono" style={{ width: "44px", height: "44px", flex: "none", borderRadius: "10px", background: C.chip, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, color: "#4D444B" }}>{j.mono}</div>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px 16px" }}>
                        <div className="job-title" style={{ fontSize: "16px", fontWeight: 600 }}>{j.title}</div>
                        {pay ? <div style={{ fontWeight: 500 }}>{pay}</div> : <div style={{ color: C.soft }}>Pay not listed</div>}
                      </div>
                      <div style={{ color: C.muted }}>{j.company} · {j.loc}</div>
                      {j.why ? <div style={{ color: "#4D444B", lineHeight: 1.55 }}>{j.why}</div> : null}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "2px" }}>
                        <span style={{ padding: "4px 10px", borderRadius: "6px", background: C.chip, fontSize: "12px" }}>{j.roleLabel}</span>
                        {j.lvl && j.lvl !== "unknown" ? <span style={{ padding: "4px 10px", borderRadius: "6px", background: C.chip, fontSize: "12px" }}>{LEVEL[j.lvl] || j.lvl}</span> : null}
                        {j.process ? <span style={{ padding: "4px 10px", borderRadius: "6px", background: C.plumSoft, color: "#5E2A54", fontSize: "12px" }}>Interview process · {j.steps} steps</span> : null}
                        <span style={{ padding: "4px 10px", borderRadius: "6px", background: C.chip, fontSize: "12px" }}>{ageOf(j.days)}</span>
                      </div>
                    </div>
                  </Link>
                  <button type="button" onClick={() => toggleLike(j)} aria-pressed={on} aria-label={on ? `Remove ${j.title} from My jobs` : `Like ${j.title}`} title={on ? "In My jobs" : "Like: save to My jobs"} style={{ width: "44px", height: "44px", flex: "none", borderRadius: "22px", border: `1.5px solid ${on ? "#D9B8CF" : C.line}`, background: on ? C.plumSoft : "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Heart on={on} />
                  </button>
                </div>
              );
            })}
          </div>

          {!jobs.length && !error ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: C.muted }}>
              {filtered ? "No jobs match. Try a different search or clear a filter." : "No jobs yet. New ones are added every day."}
            </div>
          ) : null}

          {total > size ? (
            <nav aria-label="Pages" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", paddingTop: "24px" }}>
              <span style={{ color: C.muted }}>Showing {from.toLocaleString("en-US")}–{to.toLocaleString("en-US")} of {total.toLocaleString("en-US")}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" disabled={p === 0} onClick={() => go({ page: p - 1 })} style={{ height: "40px", padding: "0 16px", borderRadius: "20px", border: `1.5px solid ${C.line}`, background: "#FFFFFF", font: "500 14px Inter, sans-serif", color: C.ink, opacity: p === 0 ? 0.4 : 1 }}>← Previous</button>
                <button type="button" disabled={to >= total} onClick={() => go({ page: p + 1 })} style={{ height: "40px", padding: "0 16px", borderRadius: "20px", border: `1.5px solid ${C.line}`, background: "#FFFFFF", font: "500 14px Inter, sans-serif", color: C.ink, opacity: to >= total ? 0.4 : 1 }}>Next →</button>
              </div>
            </nav>
          ) : null}
        </main>
      </div>
    </div>
  );
}
