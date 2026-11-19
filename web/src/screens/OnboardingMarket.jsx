"use client";
// Onboarding step 5: what's hiring in New York, from the jobs database, and which
// directions ("lanes") the person wants to see first. Nothing is pre-selected; the
// suggested directions are the role types of jobs they liked in quick picks.
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadPreferences, savePreferences } from "@/lib/answers";

const KEYS = ["rank", "added"];  // answers that autosave

const C = { plum: "#7A3E6E", plumDeep: "#4A2141", ink: "#2A2028", muted: "#665D63", body: "#4D444B", line: "#EFE9D8", cream: "#FFFDF5", banana: "#FCEFA8", bananaLine: "#D9C24E", bananaInk: "#4A3B00" };
const serif = "'Instrument Serif', serif";
const RANKS = ["1st", "2nd", "3rd", "Skip"];
const MIN_PAY_SAMPLE = 5;

const k = (n) => Math.round(n / 5000) * 5;
function payText(r) {
  if (!r || r.withPay < MIN_PAY_SAMPLE || r.payLo == null || r.payHi == null) return "Not enough pay data yet";
  const lo = k(r.payLo), hi = k(r.payHi);
  return lo === hi ? `$${lo}k` : `$${lo}–${hi}k`;
}
const num = (n) => (n || 0).toLocaleString("en-US");

function Chip({ on, onClick, children, label }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={label} style={{
      flex: "1", height: "44px", borderRadius: "22px", cursor: "pointer", font: "500 14px Inter, sans-serif",
      border: on ? `1.5px solid ${C.bananaLine}` : `1.5px solid ${C.line}`, background: on ? C.banana : "#FFFFFF", color: on ? C.bananaInk : C.ink,
    }}>{children}</button>
  );
}

class OnboardingMarket extends React.Component {
  constructor(props) {
    super(props);
    this.state = { rank: {}, added: [], ind: null, saving: false, saveError: "" };
  }

  async componentDidMount() {
    try {
      const { user, row } = await loadPreferences();
      this.loaded = !!user;
      const saved = (row && row.lanes) || [];
      if (!saved.length) return;
      const liked = this.props.likedLanes || [];
      const rank = {};
      saved.filter((l) => liked.includes(l)).slice(0, 3).forEach((l, i) => { rank[l] = RANKS[i]; });
      liked.forEach((l) => { if (!saved.includes(l)) rank[l] = "Skip"; });
      this.setState({ rank, added: saved.filter((l) => !liked.includes(l)) });
    } catch (e) {
      this.setState({ saveError: e.message });
    }
  }

  pickRank(lane, label) {
    const next = { ...this.state.rank };
    if (next[lane] === label) delete next[lane];
    else {
      if (label !== "Skip") Object.keys(next).forEach((x) => { if (next[x] === label) delete next[x]; });
      next[lane] = label;
    }
    this.setState({ rank: next });
  }

  lanes() {
    const { rank, added } = this.state;
    const liked = this.props.likedLanes || [];
    const ranked = liked.filter((l) => rank[l] && rank[l] !== "Skip").sort((a, b) => RANKS.indexOf(rank[a]) - RANKS.indexOf(rank[b]));
    // Only what they ranked or added: a role type they liked once isn't a direction until they say so.
    return [...ranked, ...added.filter((l) => !liked.includes(l))];
  }

  async next() {
    this.setState({ saving: true, saveError: "" });
    try {
      clearTimeout(this.saveTimer); this.saveTimer = null;
      await this.persist();
      this.props.router.push("/onboarding/plan");
    } catch (e) {
      this.setState({ saving: false, saveError: e.message });
    }
  }

  persist() {
    return savePreferences({ lanes: this.lanes() });
  }
  componentDidUpdate(_, prev) {
    if (!this.loaded || !KEYS.some((k) => prev[k] !== this.state[k])) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.persist().catch((e) => this.setState({ saveError: e.message }));
    }, 800);
  }
  componentWillUnmount() {
    // Leaving the page (Back, or a link) saves anything not yet saved.
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.persist().catch(() => {}); }
  }

  render() {
    const rows = this.props.rows || [];
    const liked = this.props.likedLanes || [];
    const { rank, added, ind, saving, saveError } = this.state;
    const roleRow = (role) => rows.find((r) => r.role === role && r.allIndustries && !r.allRoles);
    const topIndustries = (role) => rows.filter((r) => r.role === role && !r.allIndustries).sort((a, b) => b.openings - a.openings).slice(0, 3).map((r) => r.industry);
    const total = rows.find((r) => r.allRoles && r.allIndustries);
    const industries = rows.filter((r) => r.allRoles && !r.allIndustries).sort((a, b) => b.openings - a.openings);
    const maxInd = Math.max(1, ...industries.map((r) => r.openings));
    const table = rows.filter((r) => !r.allRoles && (ind ? r.industry === ind : r.allIndustries)).sort((a, b) => b.openings - a.openings);
    const lanes = this.lanes();

    return (
      <div style={{ minHeight: "100vh", background: C.cream, color: C.ink, fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 56px" }}>
          <div style={{ fontFamily: serif, fontSize: "30px", letterSpacing: "-0.5px" }}>aligned</div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", color: C.muted }}>
            <span>Step 5 of 6</span>
            <div style={{ display: "flex", gap: "6px" }} aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ width: "28px", height: "4px", borderRadius: "2px", background: i < 5 ? C.plum : C.line }} />)}
            </div>
          </div>
        </header>

        <main style={{ flex: "1", width: "100%", maxWidth: "1240px", margin: "0 auto", padding: "8px 24px 40px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
            <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: "56px", lineHeight: 1.02, letterSpacing: "-1px" }}>Here's what's hiring in New York right now.</h1>
            <p style={{ margin: 0, fontSize: "18px", lineHeight: 1.55, color: C.body }}>
              {total ? `${num(total.openings)} open jobs across ${num(rows.filter((r) => !r.allRoles && r.allIndustries).length)} kinds of work, straight from employers' career pages. ` : ""}
              Pick the directions you want to see first. You can change them any time.
            </p>
          </div>

          <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted }}>
              {liked.length ? "From the roles you liked" : "Your directions"}
            </div>
            {liked.length ? (
              <>
                <p style={{ margin: 0, fontSize: "16px", lineHeight: 1.55, color: C.body, maxWidth: "760px" }}>
                  These are the kinds of work behind the roles you liked. Rank the ones you want as directions; anything you don't rank is left out.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                  {liked.map((lane) => {
                    const r = roleRow(lane);
                    const inds = topIndustries(lane);
                    return (
                      <article key={lane} className="lift" style={{ background: "#FFFFFF", borderRadius: "28px", padding: "28px", boxShadow: "0 1px 2px rgba(42,32,40,0.06), 0 12px 32px rgba(42,32,40,0.07)", display: "flex", flexDirection: "column", gap: "18px" }}>
                        <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: "32px", lineHeight: 1.08 }}>{lane}</h2>
                        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                          <div><dt style={{ fontSize: "13px", color: C.muted }}>NYC openings</dt><dd style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: 600 }}>{num(r && r.openings)}</dd></div>
                          <div><dt style={{ fontSize: "13px", color: C.muted }}>Typical posted pay</dt><dd style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: 600 }}>{payText(r)}</dd></div>
                        </dl>
                        {inds.length ? <div style={{ fontSize: "14px", color: C.body, lineHeight: 1.5 }}>Most openings in {inds.join(", ")}</div> : null}
                        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingTop: "16px", borderTop: "1px solid #F3EFE2" }}>
                          <div style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted }}>Your ranking</div>
                          <div style={{ display: "flex", gap: "6px" }} role="group" aria-label={`Rank ${lane}`}>
                            {RANKS.map((label) => <Chip key={label} on={rank[lane] === label} onClick={() => this.pickRank(lane, label)}>{label}</Chip>)}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <p style={{ margin: 0, padding: "20px 24px", borderRadius: "20px", background: "#F3E6EF", color: "#2D242B", fontSize: "16px", lineHeight: 1.6, maxWidth: "760px" }}>
                You didn't like any roles in the last step, which is fine. Add the kinds of work you're interested in from the list below.
              </p>
            )}
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: "20px", paddingTop: "24px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "720px" }}>
                <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: "44px", lineHeight: 1.05 }}>The wider market</h2>
                <p style={{ margin: 0, fontSize: "16px", lineHeight: 1.55, color: C.body }}>Every kind of work hiring in New York, by industry. Add any to your directions.</p>
              </div>
              <div style={{ fontSize: "14px", color: C.body }}>Your directions: <strong style={{ color: C.ink }}>{lanes.length || "none yet"}</strong></div>
            </div>

            {!rows.length ? (
              <p style={{ margin: 0, color: C.muted }}>Market numbers aren't available right now. You can continue and set your directions later from your profile.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 280px) 1fr", gap: "24px", alignItems: "start" }}>
                <nav aria-label="Industries" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, marginBottom: "6px" }}>Openings by industry</div>
                  {[{ industry: null, openings: total ? total.openings : 0 }, ...industries].map((r) => {
                    const on = ind === r.industry;
                    return (
                      <button key={r.industry || "all"} className="nav-item" type="button" onClick={() => this.setState({ ind: r.industry })} aria-pressed={on} style={{
                        display: "flex", flexDirection: "column", gap: "6px", padding: "10px 12px", borderRadius: "12px", textAlign: "left", cursor: "pointer",
                        border: "none", background: on ? "#F3E6EF" : "transparent", color: C.ink, font: "inherit",
                      }}>
                        <span style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "14px", fontWeight: on ? 600 : 500 }}>
                          <span>{r.industry || "All industries"}</span><span style={{ color: C.muted }}>{num(r.openings)}</span>
                        </span>
                        {r.industry ? <span aria-hidden="true" style={{ height: "4px", borderRadius: "2px", background: C.line }}><span style={{ display: "block", height: "4px", borderRadius: "2px", width: Math.max(3, Math.round(r.openings / maxInd * 100)) + "%", background: on ? C.plum : "#B47FA6" }} /></span> : null}
                      </button>
                    );
                  })}
                </nav>
                <div style={{ background: "#FFFFFF", borderRadius: "20px", padding: "8px 20px", boxShadow: "0 1px 2px rgba(42,32,40,0.06)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px" }}>
                    <caption style={{ textAlign: "left", padding: "12px 0", fontWeight: 600 }}>{(ind || "All industries") + " · " + table.length + " kinds of work"}</caption>
                    <thead>
                      <tr style={{ color: C.muted, fontSize: "13px", textAlign: "left" }}>
                        <th style={{ padding: "8px 8px 8px 0", fontWeight: 500 }}>Kind of work</th>
                        <th style={{ padding: "8px", fontWeight: 500, textAlign: "right" }}>NYC openings</th>
                        <th style={{ padding: "8px", fontWeight: 500 }}>Typical posted pay</th>
                        <th style={{ padding: "8px 0 8px 8px", fontWeight: 500, textAlign: "right" }}>Direction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.map((r) => {
                        const fromPicks = liked.includes(r.role);
                        const on = added.includes(r.role);
                        return (
                          <tr key={r.role} className="row-hover" style={{ borderTop: "1px solid #F3EFE2" }}>
                            <td style={{ padding: "12px 8px 12px 0", fontWeight: 500 }}>{r.role}</td>
                            <td style={{ padding: "12px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{num(r.openings)}</td>
                            <td style={{ padding: "12px 8px", color: r.withPay >= MIN_PAY_SAMPLE ? C.ink : C.muted }}>{payText(r)}</td>
                            <td style={{ padding: "8px 0 8px 8px", textAlign: "right" }}>
                              {fromPicks ? <span style={{ fontSize: "13px", color: C.muted }}>From your picks</span> : (
                                <button type="button" aria-pressed={on} onClick={() => this.setState({ added: on ? added.filter((x) => x !== r.role) : added.concat(r.role) })} style={{
                                  height: "36px", padding: "0 14px", borderRadius: "18px", cursor: "pointer", font: "500 13px Inter, sans-serif",
                                  border: on ? `1.5px solid ${C.bananaLine}` : `1.5px solid ${C.line}`, background: on ? C.banana : "#FFFFFF", color: on ? C.bananaInk : C.ink,
                                }}>{on ? "Added ✓" : "+ Add"}</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p style={{ margin: "8px 0 12px", fontSize: "13px", color: C.muted }}>
                    Counts cover jobs we've categorized so far; new ones are added every day. Pay is the middle of the ranges employers post.
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>

        <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "24px", padding: "24px 56px 40px" }}>
          <Link href="/onboarding/picks" style={{ fontSize: "15px", fontWeight: 500, color: C.plum }}>Back</Link>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {saveError ? <span role="alert" style={{ color: "#8A2A2A", fontSize: "14px" }}>{saveError}</span> : null}
            <button type="button" onClick={() => this.next()} disabled={saving} style={{
              display: "inline-flex", alignItems: "center", height: "52px", padding: "0 32px", borderRadius: "26px", border: "none",
              background: C.plum, color: "#FFFFFF", font: "600 16px Inter, sans-serif", cursor: saving ? "progress" : "pointer", opacity: saving ? 0.7 : 1,
            }}>{saving ? "Saving…" : "Continue"}</button>
          </div>
        </footer>
      </div>
    );
  }
}

export default function OnboardingMarketPage(props) {
  const router = useRouter();
  return <OnboardingMarket {...props} router={router} />;
}
