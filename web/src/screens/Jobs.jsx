"use client";
/* Ported from the mockup (Jobs.dc.html). Layout and behavior match the design. */
import React from "react";
import UserMenu from "@/components/UserMenu";
import Link from "next/link";
import { getUser, setUser } from "@/lib/user-store";

export default class Jobs extends React.Component {
  constructor(props) {
    super(props);
    // An empty filter group means "any".
    this.state = { role: [], ind: [], loc: [], level: [], onlyProcess: false, onlyContacts: false, liked: [], q: '', sort: 'match', page: 0, more: false };
  }
  componentDidMount() {
    this.setState({ liked: getUser('liked', []) });
  }
  componentDidUpdate(_, prev) {
    if (prev.liked !== this.state.liked) setUser('liked', this.state.liked);
  }
  renderVals() {
    const s = this.state;
    const PER = 5;
    const all = (this.props.jobs || []).filter((j) => !j.possible);
    const extra = (this.props.jobs || []).filter((j) => j.possible);
    const reset = (patch) => this.setState(Object.assign({ page: 0 }, patch));
    const q = s.q.trim().toLowerCase();
    let jobs = all.concat(extra).map((j, i) => Object.assign({ rank: i }, j)).filter((j) =>
      (!s.role.length || s.role.indexOf(j.role) >= 0) && (!s.ind.length || s.ind.indexOf(j.ind) >= 0) &&
      (!s.loc.length || s.loc.indexOf(j.l) >= 0) && (!s.level.length || s.level.indexOf(j.lvl) >= 0) &&
      (!s.onlyProcess || j.process) && (!s.onlyContacts || j.contacts > 0) &&
      (!q || (j.title + ' ' + j.company + ' ' + j.loc + ' ' + j.why).toLowerCase().indexOf(q) >= 0)
    );
    const strongCount = jobs.filter((j) => !j.possible).length;
    const possibleCount = jobs.length - strongCount;
    if (!s.more) jobs = jobs.filter((j) => !j.possible);
    if (s.sort === 'date') jobs.sort((a, b) => a.days - b.days);
    else if (s.sort === 'salary') jobs.sort((a, b) => (b.hi ?? -1) - (a.hi ?? -1) || (b.lo ?? -1) - (a.lo ?? -1));
    else jobs.sort((a, b) => a.rank - b.rank);
    const total = jobs.length;
    const pages = Math.max(1, Math.ceil(total / PER));
    const page = Math.min(s.page, pages - 1);
    const ageOf = (d) => d < 1 ? Math.round(d * 24) + ' hours ago' : d < 2 ? '1 day ago' : d < 7 ? Math.floor(d) + ' days ago' : Math.floor(d / 7) === 1 ? '1 week ago' : Math.floor(d / 7) + ' weeks ago';
    const fp = jobs.find((j) => j.possible);
    const firstPossibleRank = fp ? fp.rank : -1;
    const shown = jobs.slice(page * PER, page * PER + PER).map((j) => {
      const on = s.liked.indexOf(j.id) >= 0;
      return Object.assign({}, j, {
        pay: j.lo == null ? '' : j.lo === j.hi ? '$' + j.lo + 'k' : '$' + j.lo + 'k–' + j.hi + 'k', age: ageOf(j.days), href: '/jobs/' + encodeURIComponent(j.id),
        possible: !!j.possible, firstPossible: s.sort === 'match' && !!j.possible && j.rank === firstPossibleRank,
        hasContacts: j.contacts > 0, liked: on, unliked: !on,
        toggle: () => this.setState({ liked: on ? s.liked.filter((x) => x !== j.id) : s.liked.concat(j.id) })
      });
    });
    // Filter options come from the jobs themselves, most common first.
    const MAX_OPTS = 8;
    const mk = (key, field, labelField, name) => {
      const counts = new Map();
      all.forEach((j) => {
        const label = typeof labelField === 'function' ? labelField(j) : j[labelField];
        const c = counts.get(j[field]) || { id: j[field], label, count: 0 };
        c.count += 1;
        counts.set(j[field], c);
      });
      const opts = [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
      const keep = opts.slice(0, MAX_OPTS).concat(opts.slice(MAX_OPTS).filter((o) => s[key].indexOf(o.id) >= 0));
      return {
        name,
        opts: keep.map(({ id, label, count }) => {
          const on = s[key].indexOf(id) >= 0;
          return { label, count, on, toggle: () => reset({ [key]: on ? s[key].filter((x) => x !== id) : s[key].concat(id) }) };
        })
      };
    };
    const MODE_LABEL = { onsite: 'Onsite', hybrid: 'Hybrid', remote: 'Remote' };
    const groups = [
      mk('role', 'role', 'roleLabel', 'Role type'),
      mk('ind', 'ind', 'indLabel', 'Industry'),
      mk('loc', 'l', (j) => MODE_LABEL[j.l] || j.l, 'Work mode'),
      mk('level', 'lvl', 'lvlLabel', 'Seniority')
    ];
    const from = total ? page * PER + 1 : 0;
    const to = Math.min(total, page * PER + PER);
    return {
      groups, jobs: shown, empty: total === 0,
      countLabel: strongCount + (strongCount === 1 ? ' strong match' : ' strong matches') + (s.more && possibleCount ? ' + ' + possibleCount + ' possible fits' : '') + (q ? ' for “' + s.q.trim() + '”' : ''),
      strongCount, possibleCount,
      offerMore: !s.more && possibleCount > 0 && page >= pages - 1,
      showMore: () => this.setState({ more: true, page: s.sort === 'match' ? Math.floor(strongCount / PER) : page }),
      likedLabel: s.liked.length + ' liked',
      q: s.q, hasQ: s.q.length > 0,
      setQ: (ev) => reset({ q: ev.target.value }), clearQ: () => reset({ q: '' }),
      sort: s.sort, setSort: (ev) => reset({ sort: ev.target.value }),
      hasPages: total > PER,
      rangeLabel: from + '–' + to + ' of ' + total,
      pageLabel: (page + 1) + ' of ' + pages,
      atStart: page === 0, atEnd: page >= pages - 1,
      prevOp: page === 0 ? '0.4' : '1', nextOp: page >= pages - 1 ? '0.4' : '1',
      prev: () => { if (page > 0) this.setState({ page: page - 1 }); },
      next: () => { if (page < pages - 1) this.setState({ page: page + 1 }); },
      onlyProcess: s.onlyProcess, onlyContacts: s.onlyContacts,
      toggleProcess: () => reset({ onlyProcess: !s.onlyProcess }),
      toggleContacts: () => reset({ onlyContacts: !s.onlyContacts })
    };
  }

  render() {
    const vm = this.renderVals();
    return (<>
<style>{"\nbody{margin:0}\na{color:#2A2028}a:hover{color:#7A3E6E}\ninput::placeholder{color:#7A7078}\nbutton:disabled{cursor:default}\n"}</style>
<div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif", fontSize: "14px" }}>
<header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "32px", padding: "16px 40px", borderBottom: "1px solid #EFE9D8" }}>
<div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "26px", letterSpacing: "-0.5px" }}>
{"aligned"}
</div>
{" "}
<nav style={{ display: "flex", gap: "24px", fontWeight: "500" }} aria-label="Main">
<Link href="/jobs" style={{ textDecoration: "none", color: "#2A2028", borderBottom: "2px solid #7A3E6E", padding: "6px 0" }}>
{"Jobs"}
</Link>
{" "}
<Link href="/my-jobs" style={{ textDecoration: "none", color: "#665D63", padding: "6px 0" }}>
{"My jobs"}
</Link>
</nav>
{" "}
<div style={{ flex: "1 1 320px", display: "flex", alignItems: "center", gap: "10px", height: "44px", padding: "0 16px", border: "1px solid #E6DED0", borderRadius: "10px", background: "#FFFFFF" }}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#665D63" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
<circle cx="11" cy="11" r="7" />
<path d="m20 20-3.5-3.5" />
</svg>
{" "}
<label htmlFor="q" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden" }}>
{"Search your matched jobs"}
</label>
{" "}
<input id="q" type="search" value={vm.q} onChange={vm.setQ} placeholder="Search your matches by title, company or keyword" style={{ flex: "1", border: "none", background: "transparent", font: "400 14px Inter, sans-serif", outline: "none", color: "#2A2028" }} />
{" "}
{(vm.hasQ) ? (<>
<button type="button" onClick={vm.clearQ} aria-label="Clear search" style={{ width: "28px", height: "28px", border: "none", borderRadius: "14px", background: "#EFE9D8", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4D444B" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
<path d="M6 6l12 12M18 6 6 18" />
</svg>
</button>
</>) : null}
</div>
{" "}
<UserMenu />
</header>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "48px", maxWidth: "1280px", margin: "0 auto", padding: "32px 40px 64px", boxSizing: "border-box" }}>
<aside style={{ flex: "1 1 220px", maxWidth: "240px", display: "flex", flexDirection: "column", gap: "28px" }} aria-label="Filters">
{(vm.groups || []).map((g, g$i0) => (<React.Fragment key={g$i0}>
<fieldset style={{ border: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: "2px" }}>
<legend style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase", color: "#665D63", marginBottom: "8px", padding: "0" }}>
{g.name}
</legend>
{" "}
{(g.opts || []).map((o, o$i1) => (<React.Fragment key={o$i1}>
<label style={{ display: "flex", alignItems: "center", gap: "10px", minHeight: "32px", cursor: "pointer" }}>
<input type="checkbox" checked={o.on} onChange={o.toggle} style={{ width: "16px", height: "16px", accentColor: "#7A3E6E", margin: "0" }} />
{" "}
<span style={{ flex: "1" }}>
{o.label}
</span>
{" "}
<span style={{ color: "#7A7078", fontSize: "13px" }}>
{o.count}
</span>
</label>
</React.Fragment>))}
</fieldset>
</React.Fragment>))}
{" "}
<fieldset style={{ border: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: "2px" }}>
<legend style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase", color: "#665D63", marginBottom: "8px", padding: "0" }}>
{"Only show"}
</legend>
{" "}
<label style={{ display: "flex", alignItems: "center", gap: "10px", minHeight: "32px", cursor: "pointer" }}>
<input type="checkbox" checked={vm.onlyProcess} onChange={vm.toggleProcess} style={{ width: "16px", height: "16px", accentColor: "#7A3E6E", margin: "0" }} />
{"Interview process known"}
</label>
{" "}
<label style={{ display: "flex", alignItems: "center", gap: "10px", minHeight: "32px", cursor: "pointer" }}>
<input type="checkbox" checked={vm.onlyContacts} onChange={vm.toggleContacts} style={{ width: "16px", height: "16px", accentColor: "#7A3E6E", margin: "0" }} />
{"Has contacts"}
</label>
</fieldset>
</aside>
{" "}
<main style={{ flex: "999 1 560px", minWidth: "0", display: "flex", flexDirection: "column", gap: "20px" }}>
<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
<div>
<h1 style={{ margin: "0", fontSize: "22px", fontWeight: "600", letterSpacing: "-0.3px" }}>
{vm.countLabel}
</h1>
{" "}
<p style={{ margin: "6px 0 0", color: "#665D63" }}>
{"Ranked for "}
<strong style={{ color: "#2A2028", fontWeight: "500" }}>
{"Mission · The work itself · Work-life balance"}
</strong>
{" · "}
<Link href="/onboarding/priorities" style={{ color: "#7A3E6E" }}>
{"Edit"}
</Link>
</p>
</div>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px" }}>
<Link href="/my-jobs" style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "40px", padding: "0 16px", borderRadius: "20px", background: "#7A3E6E", color: "#FFFFFF", fontWeight: "600", textDecoration: "none" }}>
{vm.likedLabel}{" · Review & apply →"}
</Link>
{" "}
<label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#665D63" }}>
{"Sort "}
<select value={vm.sort} onChange={vm.setSort} style={{ height: "36px", padding: "0 10px", border: "1px solid #E6DED0", borderRadius: "8px", background: "#FFFFFF", font: "500 14px Inter, sans-serif", color: "#2A2028" }}>
<option value="match">
{"Best match"}
</option>
<option value="date">
{"Newest first"}
</option>
<option value="salary">
{"Highest salary"}
</option>
</select>
</label>
</div>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid #EFE9D8" }}>
{(vm.jobs || []).map((j, j$i2) => (<React.Fragment key={j$i2}>
{(j.firstPossible) ? (<>
<div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", padding: "28px 4px 12px", borderBottom: "1px solid #EFE9D8" }}>
<h2 style={{ margin: "0", fontSize: "16px", fontWeight: "600" }}>
{"Possible fits"}
</h2>
{" "}
<span style={{ color: "#665D63" }}>
{"Roles that could work with a stretch somewhere"}
</span>
</div>
</>) : null}
{" "}
<div className="job-row" style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "22px 12px", margin: "0 -8px", borderRadius: "14px", borderBottom: "1px solid #EFE9D8" }}>
<Link href={j.href} style={{ flex: "1", minWidth: "0", display: "flex", gap: "20px", textDecoration: "none", color: "#2A2028" }}>
<div className="job-mono" style={{ width: "44px", height: "44px", flex: "none", borderRadius: "10px", background: "#F7F2E4", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", color: "#4D444B" }}>
{j.mono}
</div>
{" "}
<div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "6px" }}>
<div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px 16px" }}>
<div className="job-title" style={{ fontSize: "16px", fontWeight: "600" }}>
{j.title}
</div>
{" "}
<div style={{ fontWeight: "500" }}>
{j.pay}
</div>
</div>
{" "}
<div style={{ color: "#665D63" }}>
{j.company}{" · "}{j.loc}{" · "}{j.stage}
</div>
{" "}
<p style={{ margin: "4px 0 0", fontSize: "14px", lineHeight: "1.5", color: "#4D444B" }}>
{j.why}
</p>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px", fontSize: "12px", fontWeight: "500" }}>
{(j.possible) ? (<>
<span style={{ padding: "4px 10px", borderRadius: "6px", background: "#FCEFA8", color: "#4A3B00" }}>
{"Possible fit"}
</span>
</>) : null}
{" "}
{(j.process) ? (<>
<span style={{ padding: "4px 10px", borderRadius: "6px", background: "#F3E6EF", color: "#5E2A54" }}>
{"Interview process · "}{j.steps}{" steps"}
</span>
</>) : null}
{" "}
{(j.hasContacts) ? (<>
<span style={{ padding: "4px 10px", borderRadius: "6px", background: "#F0EADB", color: "#4D444B" }}>
{j.contacts}{" contacts"}
</span>
</>) : null}
{" "}
<span style={{ padding: "4px 10px", borderRadius: "6px", background: "#F0EADB", color: "#4D444B" }}>
{j.age}
</span>
</div>
</div>
</Link>
{" "}
{(j.liked) ? (<>
<button type="button" onClick={j.toggle} aria-pressed="true" aria-label={`Unlike ${j.title}`} style={{ width: "44px", height: "44px", flex: "none", borderRadius: "22px", border: "1px solid #7A3E6E", background: "#F3E6EF", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="#7A3E6E" stroke="#7A3E6E" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
</svg>
</button>
</>) : null}
{" "}
{(j.unliked) ? (<>
<button type="button" onClick={j.toggle} aria-pressed="false" aria-label={`Like ${j.title}`} style={{ width: "44px", height: "44px", flex: "none", borderRadius: "22px", border: "1px solid #E6DED0", background: "#FFFFFF", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#665D63" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
</svg>
</button>
</>) : null}
</div>
</React.Fragment>))}
{" "}
{(vm.empty) ? (<>
<div style={{ padding: "48px 16px", textAlign: "center", color: "#665D63" }}>
{"No matches. Try a different search or clear a filter."}
</div>
</>) : null}
</div>
{" "}
{(vm.offerMore) ? (<>
<section style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "24px", borderRadius: "14px", background: "#FBF5FA", border: "1px solid #F3E6EF" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 360px" }}>
<div style={{ fontSize: "16px", fontWeight: "600" }}>
{"That's all "}{vm.strongCount}{" of your strong matches"}
</div>
{" "}
<div style={{ color: "#4D444B", lineHeight: "1.5" }}>
{vm.possibleCount}{" more roles could fit you with a stretch, like a bit less pay, more office days or a gap in one skill."}
</div>
</div>
{" "}
<button type="button" onClick={vm.showMore} style={{ height: "44px", padding: "0 20px", borderRadius: "10px", border: "none", background: "#7A3E6E", font: "600 14px Inter, sans-serif", color: "#FFFFFF", cursor: "pointer" }}>
{"See "}{vm.possibleCount}{" possible fits"}
</button>
</section>
</>) : null}
{" "}
{(vm.hasPages) ? (<>
<nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }} aria-label="Pages">
<span style={{ color: "#665D63" }}>
{"Showing "}{vm.rangeLabel}
</span>
{" "}
<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
<button type="button" onClick={vm.prev} disabled={vm.atStart} aria-label="Previous 5 jobs" style={{ width: "44px", height: "44px", borderRadius: "22px", border: "1px solid #E6DED0", background: "#FFFFFF", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: vm.prevOp }}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A2028" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
<path d="m15 18-6-6 6-6" />
</svg>
</button>
{" "}
<span style={{ minWidth: "72px", textAlign: "center", fontWeight: "500" }}>
{vm.pageLabel}
</span>
{" "}
<button type="button" onClick={vm.next} disabled={vm.atEnd} aria-label="Next 5 jobs" style={{ width: "44px", height: "44px", borderRadius: "22px", border: "1px solid #E6DED0", background: "#FFFFFF", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: vm.nextOp }}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A2028" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
<path d="m9 18 6-6-6-6" />
</svg>
</button>
</div>
</nav>
</>) : null}
</main>
</div>
</div>
</>);
  }
}
