"use client";
/* Ported from the mockup (MyJobs.dc.html). Layout and behavior match the design. */
import React from "react";
import AppHeader from "@/components/AppHeader";
import { addByLink, findJobByUrl, listTracked, moveJob, setFocus } from "@/lib/tracker";
import { loadPlan } from "@/lib/answers";

function weekStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
}

function guessCompany(url) {
  const host = (url || '').replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
  const parts = host.split('.');
  // boards.greenhouse.io/acme, jobs.lever.co/acme: the company is in the path
  if (/greenhouse|lever|ashbyhq|smartrecruiters|workable|myworkdayjobs/.test(host)) {
    const seg = (url.split('/')[3] || parts[0] || '').replace(/[-_]/g, ' ');
    return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : '';
  }
  const name = (parts[0] === 'jobs' || parts[0] === 'careers' || parts[0] === 'boards') ? parts[1] : parts[0];
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
}
import Link from "next/link";

const fmtDay = (iso) => { try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch (e) { return ''; } };
const STATUS_WORD = { liked: 'Liked', applied: 'Applied', interviewing: 'Interviewing', offer: 'Offer', closed: 'Closed' };

function toCard(t) {
  const when = t.status === 'applied' && t.applied_at ? t.applied_at : t.updated_at || t.created_at;
  return {
    id: t.id, col: t.status, title: t.title || 'Untitled role', company: t.company || '',
    postingId: t.posting_id != null ? String(t.posting_id) : null, url: t.url || '',
    status: (t.posting_id == null && t.status === 'liked' ? 'Added from a link' : STATUS_WORD[t.status]) + ' · ' + fmtDay(when),
    appliedAt: t.applied_at, focus: !!t.focus, backup: !!t.backup,
  };
}

/** Applications per week the plan asks for (same pace as the plan step), or null without a plan date. */
function weeklyTarget(plan) {
  if (!plan || !plan.offer_by) return null;
  const weeks = Math.max(1, Math.ceil((new Date(plan.offer_by + 'T00:00:00') - new Date()) / (7 * 864e5)));
  return Math.min(15, Math.max(3, Math.round(90 / weeks)));
}

class MyJobs extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      focus: null, backup: null, over: null, addOpen: false, url: '', addTitle: '', addCompany: '', addCol: 'liked',
      cards: [], loading: true, error: '', adding: false, target: null
    };
  }
  async componentDidMount() {
    try {
      const [rows, plan] = await Promise.all([listTracked(), loadPlan().then((r) => r.row).catch(() => null)]);
      const cards = rows.map(toCard);
      const f = cards.find((c) => c.focus);
      const b = cards.find((c) => c.backup);
      this.setState({ cards, focus: f ? f.id : null, backup: b ? b.id : null, loading: false, target: weeklyTarget(plan) });
    } catch (e) {
      this.setState({ loading: false, error: e.message });
    }
  }
  move(id, col) {
    const before = this.state.cards;
    const now = new Date().toISOString();
    const cards = before.map((c) => c.id === id && c.col !== col
      ? Object.assign({}, c, { col, status: STATUS_WORD[col] + ' · ' + fmtDay(now), appliedAt: col === 'applied' ? now : c.appliedAt })
      : c);
    const patch = { cards, over: null };
    if (col === 'closed' && this.state.focus === id) { patch.focus = null; patch.backup = null; }
    this.setState(patch);
    if (before.find((c) => c.id === id && c.col !== col)) {
      moveJob(id, col).catch((e) => this.setState({ cards: before, error: e.message }));
    }
  }
  focusOn(id) {
    const prev = { focus: this.state.focus, backup: this.state.backup };
    this.setState({ focus: id, backup: null });
    setFocus(id, null).catch((e) => this.setState({ ...prev, error: e.message }));
  }
  renderVals() {
    const s = this.state;
    const COLS = [['liked', 'Liked'], ['applied', 'Applied'], ['interviewing', 'Interviewing'], ['offer', 'Offer'], ['closed', 'Closed']];
    const focusCard = s.cards.find((c) => c.id === s.focus);
    const backupCard = s.cards.find((c) => c.id === s.backup);
    const cols = COLS.map(([key, name]) => {
      const cards = s.cards.filter((c) => c.col === key).map((c) => Object.assign({}, c, {
        isFocus: c.id === s.focus, isBackup: !!s.focus && c.id === s.backup,
        inLiked: c.col === 'liked', canFocus: c.id !== s.focus && c.col !== 'closed',
        href: c.postingId ? '/jobs/' + c.postingId : (c.url || '#'), external: !c.postingId && !!c.url,
        applyHref: c.url || (c.postingId ? '/jobs/' + c.postingId : '#'), applyLabel: c.url ? 'Apply on company site ↗' : 'View the posting',
        dragStart: (ev) => { this.dragId = c.id; try { ev.dataTransfer.setData('text/plain', c.id); ev.dataTransfer.effectAllowed = 'move'; } catch (e) {} },
        dragEnd: () => { this.dragId = null; if (this.state.over) this.setState({ over: null }); },
        moveTo: (ev) => this.move(c.id, ev.target.value),
        markApplied: () => this.move(c.id, 'applied'),
        setFocus: () => this.focusOn(c.id)
      }));
      const isOver = s.over === key;
      return {
        name, cards, count: cards.length, empty: cards.length === 0,
        bg: isOver ? '#F3E6EF' : 'transparent',
        outline: isOver ? '2px dashed #D9C24E' : '2px dashed transparent',
        over: (ev) => { ev.preventDefault(); if (this.state.over !== key) this.setState({ over: key }); },
        leave: () => { if (this.state.over === key) this.setState({ over: null }); },
        drop: (ev) => { ev.preventDefault(); const id = this.dragId || (ev.dataTransfer && ev.dataTransfer.getData('text/plain')); this.dragId = null; if (id) this.move(id, key); else this.setState({ over: null }); }
      };
    });
    const url = s.url.trim();
    const urlOk = /^https?:\/\/[^\s.]+\.[^\s]+/.test(url);
    return {
      cols,
      appliedCount: s.cards.filter((c) => c.appliedAt && new Date(c.appliedAt) >= weekStart()).length,
      target: s.target, hasTarget: !!s.target, loading: s.loading, error: s.error, adding: s.adding,
      emptyBoard: !s.loading && !s.cards.length,
      hasFocus: !!focusCard,
      focusCompany: focusCard ? focusCard.company : '',
      focusText: focusCard
        ? 'Put your effort here this week: tailor your application and apply. ' + (backupCard ? backupCard.company + ' is your backup.' : 'End focus whenever you want to spread out again.')
        : '',
      endFocus: () => {
        const prev = { focus: s.focus, backup: s.backup };
        this.setState({ focus: null, backup: null });
        setFocus(null, null).catch((e) => this.setState({ ...prev, error: e.message }));
      },
      addOpen: s.addOpen,
      openAdd: () => this.setState({ addOpen: true, url: '', addTitle: '', addCompany: '', addCol: 'liked' }),
      closeAdd: () => this.setState({ addOpen: false }),
      url: s.url, setUrl: (ev) => this.setState({ url: ev.target.value }),
      addTitle: s.addTitle, setAddTitle: (ev) => this.setState({ addTitle: ev.target.value }),
      addCompany: s.addCompany, setAddCompany: (ev) => this.setState({ addCompany: ev.target.value }),
      companyGuess: guessCompany(url),
      urlOk, urlNotOk: !urlOk, urlBad: url.length > 8 && !urlOk,
      addCol: s.addCol, setAddCol: (ev) => this.setState({ addCol: ev.target.value }),
      addJob: async () => {
        if (!urlOk || s.adding) return;
        this.setState({ adding: true, error: '' });
        try {
          const found = await findJobByUrl(url).catch(() => null);
          const company = s.addCompany.trim() || (found && found.company) || guessCompany(url);
          const title = s.addTitle.trim() || (found && found.title) || ('Role at ' + company);
          const row = await addByLink({ url, title, company, status: s.addCol, postingId: found && found.postingId });
          this.setState({ cards: this.state.cards.concat(toCard(row)), addOpen: false, url: '', adding: false });
        } catch (e) {
          this.setState({ adding: false, error: e.message });
        }
      }
    };
  }

  render() {
    const vm = this.renderVals();
    return (<>
<style>{"\nbody{margin:0}\na{color:#7A3E6E}a:hover{color:#5E2A54}\ninput::placeholder{color:#7A7078}\nbutton:disabled{cursor:default}\n"}</style>
<div style={{ position: "relative", minHeight: "100vh", background: "#F3E8F0", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif", fontSize: "14px" }}>
<AppHeader active="my-jobs" />
{" "}
<div style={{ maxWidth: "1600px", margin: "0 auto", padding: "32px 24px 64px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "24px" }}>
<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
<div>
<h1 style={{ margin: "0", fontSize: "24px", fontWeight: "600", letterSpacing: "-0.3px" }}>
{"My jobs"}
</h1>
{" "}
<p style={{ margin: "6px 0 0", color: "#665D63" }}>
{(vm.hasTarget) ? (<>{"This week: "}
<strong style={{ color: "#2A2028", fontWeight: "500" }}>
{vm.appliedCount}{" of " + vm.target}
</strong>
{" applications in your plan · "}</>) : null}
{"Drag cards between columns to update them"}
</p>
</div>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>

{" "}
<button type="button" onClick={vm.openAdd} style={{ height: "40px", padding: "0 16px", borderRadius: "10px", border: "1px solid #E6DED0", background: "#FFFFFF", font: "500 14px Inter, sans-serif", color: "#2A2028", cursor: "pointer" }}>
{"+ Add a job from elsewhere"}
</button>
</div>
</div>
{" "}
{(vm.hasFocus) ? (<>
<section style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px 24px", padding: "20px 24px", borderRadius: "16px", background: "#4A2141", color: "#FFFFFF" }} aria-label="Focus">
<div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "600" }}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
<circle cx="12" cy="12" r="9" />
<circle cx="12" cy="12" r="5" />
<circle cx="12" cy="12" r="1" />
</svg>
{" Focused on "}{vm.focusCompany}{" "}
</div>
{" "}
<p style={{ margin: "0", flex: "1 1 420px", color: "#EBD8E6", lineHeight: "1.5" }}>
{vm.focusText}
</p>
{" "}
<button type="button" onClick={vm.endFocus} style={{ height: "40px", padding: "0 16px", borderRadius: "10px", border: "1px solid #D9C24E", background: "transparent", font: "500 14px Inter, sans-serif", color: "#FFFFFF", cursor: "pointer" }}>
{"End focus"}
</button>
</section>
</>) : null}
{" "}
{(vm.error) ? (<p role="alert" style={{ margin: "0 0 12px", padding: "10px 14px", borderRadius: "10px", background: "#FBEAEA", color: "#8A2A2A" }}>{vm.error}</p>) : null}
{(vm.emptyBoard) ? (<div style={{ margin: "0 0 16px", padding: "20px 24px", borderRadius: "16px", background: "#FFF8D6", color: "#4A2141", lineHeight: 1.6 }}>
{"Nothing here yet. Tap the heart on any job to save it to Liked, or add a job you found somewhere else."}{" "}<Link href="/jobs" style={{ fontWeight: 600 }}>{"Browse jobs →"}</Link>
</div>) : null}
<div style={{ overflowX: "auto", opacity: vm.loading ? 0.5 : 1 }}>
<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(300px, 1.25fr)) repeat(2, minmax(220px, 0.75fr))", gap: "12px", alignItems: "stretch" }}>
{(vm.cols || []).map((c, c$i0) => (<React.Fragment key={c$i0}>
<section onDragOver={c.over} onDragLeave={c.leave} onDrop={c.drop} aria-label={c.name} style={{ display: "flex", flexDirection: "column", gap: "10px", minHeight: "480px", padding: "8px", borderRadius: "14px", background: c.bg, outline: c.outline }}>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 4px 6px" }}>
<h2 style={{ margin: "0", fontSize: "13px", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase", color: "#4D444B" }}>
{c.name}
</h2>
{" "}
<span style={{ fontSize: "13px", color: "#665D63" }}>
{c.count}
</span>
</div>
{" "}
{(c.cards || []).map((k, k$i1) => (<React.Fragment key={k$i1}>
<article className="lift grab" draggable="true" onDragStart={k.dragStart} onDragEnd={k.dragEnd} style={{ background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px", cursor: "grab" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
{(k.isFocus) ? (<>
<span style={{ padding: "3px 8px", borderRadius: "6px", background: "#4A2141", color: "#FFFFFF", fontSize: "11px", fontWeight: "600", letterSpacing: "0.04em", textTransform: "uppercase" }}>
{"Focus"}
</span>
</>) : null}
{" "}
{(k.isBackup) ? (<>
<span style={{ padding: "3px 8px", borderRadius: "6px", background: "#F3E6EF", color: "#5E2A54", fontSize: "11px", fontWeight: "600", letterSpacing: "0.04em", textTransform: "uppercase" }}>
{"Backup"}
</span>
</>) : null}
</div>
{" "}
<svg width="14" height="14" viewBox="0 0 24 24" fill="#A89EA6" aria-hidden="true" style={{ flex: "none" }}>
<circle cx="9" cy="6" r="1.6" />
<circle cx="15" cy="6" r="1.6" />
<circle cx="9" cy="12" r="1.6" />
<circle cx="15" cy="12" r="1.6" />
<circle cx="9" cy="18" r="1.6" />
<circle cx="15" cy="18" r="1.6" />
</svg>
</div>
{" "}
<div>
{(k.external) ? (<a href={k.href} target="_blank" rel="noopener noreferrer" style={{ color: "#2A2028", fontWeight: "600", textDecoration: "none", lineHeight: "1.35" }}>
{k.title}
</a>) : (<Link href={k.href} style={{ color: "#2A2028", fontWeight: "600", textDecoration: "none", lineHeight: "1.35" }}>
{k.title}
</Link>)}
{" "}
<div style={{ marginTop: "2px", color: "#665D63" }}>
{k.company}
</div>
</div>
{" "}
{(k.status) ? (<>
<div style={{ display: "flex", gap: "6px", alignItems: "flex-start", fontSize: "13px", color: "#4D444B", lineHeight: "1.4" }}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#665D63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginTop: "2px", flex: "none" }}>
<circle cx="12" cy="12" r="9" />
<path d="M12 7v5l3 2" />
</svg>
{" "}
<span>
{k.status}
</span>
</div>
</>) : null}
{" "}
{(k.inLiked) ? (<>
<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
<a href={k.applyHref} target={k.url ? "_blank" : undefined} rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40px", borderRadius: "10px", background: "#7A3E6E", color: "#FFFFFF", fontWeight: "600", textDecoration: "none" }}>
{k.applyLabel}
</a>
{" "}
<div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
<button type="button" onClick={k.markApplied} style={{ height: "32px", padding: "0", border: "none", background: "transparent", font: "400 13px Inter, sans-serif", color: "#665D63", textDecoration: "underline", cursor: "pointer" }}>
{"I already applied"}
</button>
{" "}
{(k.canFocus) ? (<>
<button type="button" onClick={k.setFocus} style={{ height: "32px", padding: "0", border: "none", background: "transparent", font: "500 13px Inter, sans-serif", color: "#7A3E6E", cursor: "pointer" }}>
{"Focus on this"}
</button>
</>) : null}
</div>
</div>
</>) : null}
{" "}
<label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#665D63" }}>
{"Move to "}
<select value={k.col} onChange={k.moveTo} style={{ flex: "1", height: "32px", padding: "0 8px", border: "1px solid #E6DED0", borderRadius: "8px", background: "#FFFFFF", font: "400 13px Inter, sans-serif", color: "#2A2028" }}>
<option value="liked">
{"Liked"}
</option>
<option value="applied">
{"Applied"}
</option>
<option value="interviewing">
{"Interviewing"}
</option>
<option value="offer">
{"Offer"}
</option>
<option value="closed">
{"Closed"}
</option>
</select>
</label>
</article>
</React.Fragment>))}
{" "}
{(c.empty) ? (<>
<div style={{ padding: "24px 16px", border: "1px dashed #E6DED0", borderRadius: "12px", textAlign: "center", color: "#665D63" }}>
{"Drop a job here"}
</div>
</>) : null}
</section>
</React.Fragment>))}
</div>
</div>
</div>
{" "}
{(vm.addOpen) ? (<>
<div style={{ position: "absolute", inset: "0", background: "rgba(17,17,17,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "120px 24px", boxSizing: "border-box" }}>
<div role="dialog" aria-modal="true" aria-labelledby="add-title" style={{ width: "100%", maxWidth: "520px", background: "#FFFFFF", borderRadius: "16px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", padding: "28px", display: "flex", flexDirection: "column", gap: "18px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
<h2 id="add-title" style={{ margin: "0", fontSize: "20px", fontWeight: "600" }}>
{"Add a job from elsewhere"}
</h2>
{" "}
<button type="button" onClick={vm.closeAdd} aria-label="Close" style={{ width: "36px", height: "36px", border: "none", borderRadius: "18px", background: "#F7F2E4", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4D444B" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
<path d="M6 6l12 12M18 6 6 18" />
</svg>
</button>
</div>
{" "}
<p style={{ margin: "0", color: "#665D63", lineHeight: "1.5" }}>
{"Paste the link to the posting. If it's a job we already have, we'll fill in the details; otherwise add the title and company yourself."}
</p>
{" "}
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "500" }}>
{"Job link "}
<input type="url" value={vm.url} onChange={vm.setUrl} placeholder="https://jobs.example.com/ml-engineer" style={{ height: "44px", padding: "0 14px", border: "1px solid #E6DED0", borderRadius: "10px", font: "400 14px Inter, sans-serif", color: "#2A2028" }} />
</label>
{" "}
{(vm.urlBad) ? (<>
<div style={{ marginTop: "-10px", fontSize: "13px", color: "#8A2D2D" }}>
{"That doesn't look like a link. It should start with https://"}
</div>
</>) : null}
{" "}
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "500" }}>
{"Job title (optional)"}
<input type="text" value={vm.addTitle} onChange={vm.setAddTitle} placeholder="e.g. Office Manager" style={{ height: "44px", padding: "0 14px", border: "1px solid #E6DED0", borderRadius: "10px", font: "400 15px Inter, sans-serif", color: "#2A2028" }} />
</label>
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "500" }}>
{"Company (optional)"}
<input type="text" value={vm.addCompany} onChange={vm.setAddCompany} placeholder={vm.companyGuess || "e.g. Acme"} style={{ height: "44px", padding: "0 14px", border: "1px solid #E6DED0", borderRadius: "10px", font: "400 15px Inter, sans-serif", color: "#2A2028" }} />
</label>
</div>
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "500" }}>
{"Where is it at? "}
<select value={vm.addCol} onChange={vm.setAddCol} style={{ height: "44px", padding: "0 12px", border: "1px solid #E6DED0", borderRadius: "10px", background: "#FFFFFF", font: "400 14px Inter, sans-serif", color: "#2A2028" }}>
<option value="liked">
{"Interested, haven't applied"}
</option>
<option value="applied">
{"Applied"}
</option>
<option value="interviewing">
{"Interviewing"}
</option>
<option value="offer">
{"Offer"}
</option>
</select>
</label>
{" "}
<div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "4px" }}>
<button type="button" onClick={vm.closeAdd} style={{ height: "44px", padding: "0 18px", borderRadius: "10px", border: "1px solid #E6DED0", background: "#FFFFFF", font: "500 14px Inter, sans-serif", color: "#2A2028", cursor: "pointer" }}>
{"Cancel"}
</button>
{" "}
{(vm.urlOk) ? (<>
<button type="button" onClick={vm.addJob} style={{ height: "44px", padding: "0 20px", borderRadius: "10px", border: "none", background: "#7A3E6E", font: "600 14px Inter, sans-serif", color: "#FFFFFF", cursor: "pointer" }}>
{vm.adding ? "Adding…" : "Add job"}
</button>
</>) : null}
{" "}
{(vm.urlNotOk) ? (<>
<button type="button" disabled={true} style={{ height: "44px", padding: "0 20px", borderRadius: "10px", border: "none", background: "#E6DED0", font: "600 14px Inter, sans-serif", color: "#7A7078" }}>
{"Add job"}
</button>
</>) : null}
</div>
</div>
</div>
</>) : null}
</div>
</>);
  }
}

export default function MyJobsPage(props) {
  return <MyJobs {...props} />;
}
