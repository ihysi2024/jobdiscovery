"use client";
// Profile and plan: everything the person told us in onboarding, with a link to change each part.
import React from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { loadProfile } from "@/lib/profile";
import { loadPlan, loadPreferences } from "@/lib/answers";
import { listTracked } from "@/lib/tracker";

const C = { plum: "#7A3E6E", plumDeep: "#4A2141", ink: "#2A2028", muted: "#665D63", body: "#4D444B", line: "#EFE9D8", chip: "#F7F2E4", cream: "#FFFDF5", banana: "#FCEFA8", plumSoft: "#F3E6EF" };
const serif = "'Instrument Serif', serif";
const PRIORITY = { mission: "Mission", work: "The work itself", wlb: "Work-life balance", comp: "Compensation", status: "Status & prestige", culture: "Culture & people", growth: "Learning & growth", stability: "Stability", flex: "Flexibility" };
const TRADE = { mission: "Some salary for a mission-driven industry", title: "A lower title for a bigger, more established company", commute: "A longer commute for higher pay", stability: "Stability for equity upside at an early-stage startup", office: "More days in the office for a more senior title", tenure: "Some salary for a company where people stay longer", promo: "Some salary for faster promotions", field: "Work further from my background for higher pay" };
const MODES = { office: "In the office", hybrid: "Hybrid", remote: "Remote, from NYC" };
const AREAS = { manhattan: "Manhattan", brooklyn: "Brooklyn", queens: "Queens", bronx: "The Bronx", si: "Staten Island", any: "Anywhere in NYC" };
const DAYS = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const TIMES = { "07:30": "7:30 am", "08:30": "8:30 am", "12:00": "12:00 pm", "18:00": "6:00 pm" };
const HORIZON = { y1: "In 1 year", y3: "In 3 years", y5: "In 5 years", y10: "In 10 years" };

const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const label = (map, id) => (id.startsWith("own:") ? id.slice(4) : map[id] || id);

function Card({ title, edit, children }) {
  return (
    <section style={{ background: "#FFFFFF", borderRadius: "20px", padding: "24px 28px", boxShadow: "0 1px 2px rgba(42,32,40,0.06), 0 8px 24px rgba(42,32,40,0.05)", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>{title}</h2>
        {edit ? <Link href={edit} style={{ fontSize: "14px", fontWeight: 500, color: C.plum }}>Edit</Link> : null}
      </div>
      {children}
    </section>
  );
}

function Row({ name, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "16px", alignItems: "baseline" }}>
      <div style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted }}>{name}</div>
      <div style={{ color: C.ink, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

const Chips = ({ items }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
    {items.map((x, i) => <span key={i} style={{ padding: "5px 12px", borderRadius: "999px", background: C.chip, fontSize: "13px" }}>{x}</span>)}
  </div>
);
const Missing = ({ children }) => <span style={{ color: C.muted }}>{children}</span>;

export default function Profile() {
  const [state, setState] = React.useState({ loading: true });

  React.useEffect(() => {
    Promise.all([loadProfile(), loadPreferences(), loadPlan(), listTracked()])
      .then(([p, pref, plan, tracked]) => setState({ loading: false, user: p.user, profile: p.profile, pref: pref.row, plan: plan.row, tracked }))
      .catch((e) => setState({ loading: false, error: e.message }));
  }, []);

  const { loading, error, user, profile, pref, plan, tracked = [] } = state;
  const meta = (user && user.user_metadata) || {};
  const name = (profile && profile.name) || meta.full_name || meta.name || "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] || "").slice(0, 2);

  // Plan numbers, same pace as the plan step.
  const target = plan && plan.offer_by ? new Date(plan.offer_by + "T00:00:00") : null;
  const weeks = target ? Math.max(1, Math.ceil((target - new Date()) / (7 * 864e5))) : null;
  const appsWeek = weeks ? Math.min(15, Math.max(3, Math.round(90 / weeks))) : null;
  const monday = new Date(); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const appliedThisWeek = tracked.filter((t) => t.applied_at && new Date(t.applied_at) >= monday).length;
  const focus = tracked.find((t) => t.focus && t.status !== "closed");
  const toApply = tracked.filter((t) => t.status === "liked" && !t.focus).slice(0, 3);

  const trades = pref && pref.tradeoffs ? Object.entries(pref.tradeoffs) : [];
  const fut = (pref && pref.future) || null;

  return (
    <div style={{ minHeight: "100vh", background: C.cream, color: C.ink, fontFamily: "Inter, system-ui, sans-serif", fontSize: "15px" }}>
      <AppHeader active="" />
      <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "32px 40px 72px", display: "flex", flexDirection: "column", gap: "20px" }} aria-busy={loading}>
        {error ? <p role="alert" style={{ margin: 0, padding: "12px 16px", borderRadius: "12px", background: "#FBEAEA", color: "#8A2A2A" }}>{error}</p> : null}

        <section style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "20px", padding: "8px 0 12px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "36px", background: C.plum, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: serif, fontSize: "30px", overflow: "hidden" }}>
            {meta.avatar_url ? <img src={meta.avatar_url} alt="" width={72} height={72} referrerPolicy="no-referrer" /> : initials.toUpperCase()}
          </div>
          <div style={{ flex: "1 1 300px" }}>
            <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: "44px", lineHeight: 1.05 }}>{loading ? " " : name || "Your profile"}</h1>
            <div style={{ color: C.muted, marginTop: "4px" }}>{profile && profile.headline ? profile.headline : user ? user.email : ""}</div>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" style={{ height: "40px", padding: "0 16px", borderRadius: "20px", border: `1.5px solid ${C.line}`, background: "#FFFFFF", font: "500 14px Inter, sans-serif", color: C.ink }}>Sign out</button>
          </form>
        </section>

        {!loading && !profile && !pref && !plan ? (
          <div style={{ padding: "20px 24px", borderRadius: "16px", background: "#FFF8D6", color: C.plumDeep, lineHeight: 1.6 }}>
            You haven't set up your profile yet. <Link href="/onboarding" style={{ fontWeight: 600, color: C.plum }}>Start with your resume →</Link>
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: "20px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Card title="Resume and background" edit="/onboarding">
              <Row name="Resume">{profile && profile.resumeName ? profile.resumeName : <Missing>No resume uploaded</Missing>}</Row>
              <Row name="Experience">
                {profile && profile.exp.length ? profile.exp.slice(0, 4).map((e, i) => (
                  <div key={i}><strong style={{ fontWeight: 500 }}>{e.role || "Role"}</strong>{e.org ? " · " + e.org : ""}{e.dates ? <span style={{ color: C.muted }}>{" · " + e.dates}</span> : null}</div>
                )) : <Missing>Not added</Missing>}
              </Row>
              <Row name="Education">
                {profile && profile.edu.length ? profile.edu.map((e, i) => (
                  <div key={i}>{[e.degree, e.school].filter(Boolean).join(" · ")}{e.dates ? <span style={{ color: C.muted }}>{" · " + e.dates}</span> : null}</div>
                )) : <Missing>Not added</Missing>}
              </Row>
              <Row name="Skills">{profile && profile.skills.length ? <Chips items={profile.skills.slice(0, 20)} /> : <Missing>Not added</Missing>}</Row>
            </Card>

            <Card title="What you're looking for" edit="/onboarding/priorities">
              <Row name="Priorities">
                {pref && pref.priorities && pref.priorities.length
                  ? <Chips items={pref.priorities.map((p, i) => `${i + 1}. ${label(PRIORITY, p)}`)} />
                  : <Missing>{pref && pref.priorities === null ? "Skipped" : "Not answered"}</Missing>}
              </Row>
              <Row name="Would trade">
                {trades.filter(([, v]) => v === "Yes").length
                  ? trades.filter(([, v]) => v === "Yes").map(([k]) => <div key={k}>{TRADE[k] || k}</div>)
                  : <Missing>{pref && pref.tradeoffs === null ? "Skipped" : trades.length ? "No firm yeses" : "Not answered"}</Missing>}
              </Row>
              <Row name="Minimum match">
                {pref && typeof pref.min_fit === "number" ? `${pref.min_fit}% or better` : <Missing>Any</Missing>}
                <div style={{ fontSize: "13px", color: C.muted }}>Change it from the Show menu on <Link href="/jobs" style={{ color: C.plum }}>Jobs</Link>.</div>
              </Row>
              <Row name="Where">
                {pref && ((pref.work_modes || []).length || (pref.nyc_areas || []).length)
                  ? [...(pref.work_modes || []).map((m) => MODES[m] || m), ...(pref.nyc_areas || []).map((a) => AREAS[a] || a)].join(" · ")
                  : <Missing>Anywhere in New York</Missing>}
              </Row>
            </Card>

            <Card title="Directions" edit="/onboarding/market">
              {pref && pref.lanes && pref.lanes.length
                ? <ol style={{ margin: 0, paddingLeft: "20px", lineHeight: 1.8 }}>{pref.lanes.map((l) => <li key={l}>{l}</li>)}</ol>
                : <Missing>No directions picked yet.</Missing>}
            </Card>

            {fut && (fut.horizons || fut.dreams) ? (
              <Card title="Looking ahead" edit="/onboarding/future">
                {fut.horizons && Object.keys(fut.horizons).length ? Object.entries(HORIZON).filter(([k]) => fut.horizons[k]).map(([k, v]) => <Row key={k} name={v}>{fut.horizons[k]}</Row>) : null}
                {fut.own ? <Row name="If I didn't work">{fut.own}</Row> : null}
              </Card>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Card title="Your plan" edit="/onboarding/plan">
              {plan && plan.offer_by ? (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                    <span style={{ fontFamily: serif, fontSize: "40px", lineHeight: 1 }}>{weeks} weeks</span>
                    <span style={{ color: C.muted }}>to an offer by {fmtDate(target)}{plan.date_flexible ? " (flexible)" : ""}</span>
                  </div>
                  <Row name="This week">{appliedThisWeek} of {appsWeek} applications</Row>
                  <Row name="Time">{plan.hours_per_week ? `${plan.hours_per_week}${plan.hours_per_week >= 30 ? "+" : ""} hours a week` : <Missing>Not set</Missing>}</Row>
                </>
              ) : <Missing>No target date yet.</Missing>}
              <Row name="To-do email">
                {plan && (plan.email_days || []).length
                  ? `${plan.email_days.map((d) => DAYS[d] || d).join(", ")}${plan.email_time ? " at " + (TIMES[plan.email_time.slice(0, 5)] || plan.email_time.slice(0, 5)) : ""}`
                  : <Missing>Not set</Missing>}
                <div style={{ fontSize: "13px", color: C.muted }}>The daily email isn't sending yet; your schedule is saved for when it starts.</div>
              </Row>
            </Card>

            <Card title="Up next" edit={null}>
              {focus ? (
                <div style={{ padding: "14px 16px", borderRadius: "14px", background: C.banana, color: "#4A3B00" }}>
                  <strong>Focus:</strong> {focus.title}{focus.company ? " at " + focus.company : ""}
                </div>
              ) : null}
              {toApply.length ? (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {toApply.map((t) => (
                    <li key={t.id}>
                      <Link href={t.posting_id != null ? `/jobs/${t.posting_id}` : t.url || "/my-jobs"} style={{ color: C.ink, fontWeight: 500 }}>Apply: {t.title}</Link>
                      {t.company ? <span style={{ color: C.muted }}> · {t.company}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : !focus ? <Missing>Like a few jobs and they'll show up here to apply to.</Missing> : null}
              <Link href="/my-jobs" style={{ fontSize: "14px", fontWeight: 500, color: C.plum }}>Open My jobs →</Link>
            </Card>

            <Card title="Account" edit={null}>
              <Row name="Signed in as">{user ? user.email : ""}</Row>
              <Row name="Your data">
                <span style={{ color: C.body }}>Only you can see your answers and resume. </span>
                <Link href="/privacy" style={{ color: C.plum }}>Privacy</Link>
              </Row>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
