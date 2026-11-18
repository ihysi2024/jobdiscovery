"use client";
/* Ported from the mockup (MyJobs.dc.html). Layout and behavior match the design. */
import React from "react";
import UserMenu from "@/components/UserMenu";
import Link from "next/link";

export default class MyJobs extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      focus: 'pb', backup: 'ng', over: null, addOpen: false, url: '', addCol: 'liked', nextId: 1,
      cards: [
        { id: 'pb', col: 'liked', title: 'Machine Learning Engineer, Imaging', company: 'Parallax Bio' },
        { id: 'ng', col: 'liked', title: 'ML Engineer, Sequencing', company: 'Northlight Genomics' },
        { id: 'cv', col: 'liked', title: 'Software Engineer, Data Platform', company: 'Cellvue' },
        { id: 'th', col: 'applied', title: 'Applied Scientist, Clinical NLP', company: 'Tessellate Health', status: 'Confirmation found in inbox · Nov 10' },
        { id: 'ac', col: 'applied', title: 'Senior Software Engineer, Care Tools', company: 'Ardent Care', status: 'Confirmation found in inbox · Nov 12' },
        { id: 'ld', col: 'applied', title: 'ML Engineer, Radiology', company: 'Lumen Diagnostics', status: 'Found in inbox · applied outside aligned' },
        { id: 'qh', col: 'interviewing', title: 'Computer Vision Engineer', company: 'Quarry Health', status: 'Technical screen Thu, Nov 20 · from scheduling email' },
        { id: 'wl', col: 'closed', title: 'ML Engineer', company: 'Ward Labs', status: 'Not moving forward · Nov 8' }
      ]
    };
  }
  move(id, col, status) {
    const cards = this.state.cards.map((c) => c.id === id ? Object.assign({}, c, { col, status: status !== undefined ? status : (c.col === col ? c.status : 'Moved by you · today') }) : c);
    const patch = { cards, over: null };
    if (col === 'closed' && this.state.focus === id) { patch.focus = null; patch.backup = null; }
    this.setState(patch);
  }
  renderVals() {
    const s = this.state;
    const COLS = [['liked', 'Liked'], ['applied', 'Applied'], ['interviewing', 'Interviewing'], ['offer', 'Offer'], ['closed', 'Closed']];
    const focusCard = s.cards.find((c) => c.id === s.focus);
    const backupCard = s.cards.find((c) => c.id === s.backup);
    const cols = COLS.map(([key, name]) => {
      const cards = s.cards.filter((c) => c.col === key).map((c) => Object.assign({}, c, {
        isFocus: c.id === s.focus, isBackup: !!s.focus && c.id === s.backup,
        inLiked: c.col === 'liked', canFocus: c.id !== s.focus,
        dragStart: (ev) => { this.dragId = c.id; try { ev.dataTransfer.setData('text/plain', c.id); ev.dataTransfer.effectAllowed = 'move'; } catch (e) {} },
        dragEnd: () => { this.dragId = null; if (this.state.over) this.setState({ over: null }); },
        moveTo: (ev) => this.move(c.id, ev.target.value),
        markApplied: () => this.move(c.id, 'applied', 'Marked as applied by you · today'),
        setFocus: () => this.setState({ focus: c.id, backup: null })
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
      appliedCount: s.cards.filter((c) => c.col === 'applied').length,
      hasFocus: !!focusCard,
      focusCompany: focusCard ? focusCard.company : '',
      focusText: focusCard
        ? 'Your plan now centers on this role: reach out to its contacts and apply this week.' + (backupCard ? ' ' + backupCard.company + ' is kept as a backup and other new applications are paused.' : ' Other new applications are paused.')
        : '',
      endFocus: () => this.setState({ focus: null, backup: null }),
      addOpen: s.addOpen,
      openAdd: () => this.setState({ addOpen: true, url: '', addCol: 'liked' }),
      closeAdd: () => this.setState({ addOpen: false }),
      url: s.url, setUrl: (ev) => this.setState({ url: ev.target.value }),
      urlOk, urlNotOk: !urlOk, urlBad: url.length > 8 && !urlOk,
      addCol: s.addCol, setAddCol: (ev) => this.setState({ addCol: ev.target.value }),
      addJob: () => {
        if (!urlOk) return;
        let host = url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '').replace(/^(jobs|careers|boards)\./, '');
        const company = host.split('.')[0];
        const nice = company.charAt(0).toUpperCase() + company.slice(1);
        const card = { id: 'x' + s.nextId, col: s.addCol, title: 'Role from ' + nice, company: nice, status: 'Added from link · pulling details' };
        this.setState({ cards: s.cards.concat(card), nextId: s.nextId + 1, addOpen: false, url: '' });
      }
    };
  }

  render() {
    const vm = this.renderVals();
    return (<>
<style>{"\nbody{margin:0}\na{color:#7A3E6E}a:hover{color:#5E2A54}\ninput::placeholder{color:#7A7078}\nbutton:disabled{cursor:default}\n"}</style>
<div style={{ position: "relative", minHeight: "100vh", background: "#F3E8F0", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif", fontSize: "14px" }}>
<header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "32px", padding: "16px 40px", borderBottom: "1px solid #EFE9D8" }}>
<div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "26px", letterSpacing: "-0.5px" }}>
{"aligned"}
</div>
{" "}
<nav style={{ display: "flex", gap: "24px", fontWeight: "500", flex: "1" }} aria-label="Main">
<Link href="/jobs" style={{ textDecoration: "none", color: "#665D63", padding: "6px 0" }}>
{"Jobs"}
</Link>
{" "}
<Link href="/my-jobs" style={{ textDecoration: "none", color: "#2A2028", borderBottom: "2px solid #7A3E6E", padding: "6px 0" }}>
{"My jobs"}
</Link>
</nav>
{" "}
<UserMenu />
</header>
{" "}
<div style={{ maxWidth: "1600px", margin: "0 auto", padding: "32px 24px 64px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "24px" }}>
<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
<div>
<h1 style={{ margin: "0", fontSize: "24px", fontWeight: "600", letterSpacing: "-0.3px" }}>
{"My jobs"}
</h1>
{" "}
<p style={{ margin: "6px 0 0", color: "#665D63" }}>
{"This week: "}
<strong style={{ color: "#2A2028", fontWeight: "500" }}>
{vm.appliedCount}{" of 6"}
</strong>
{" applications in your plan · drag cards between columns to update them"}
</p>
</div>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
<span style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "36px", padding: "0 14px", borderRadius: "18px", background: "#F3E6EF", color: "#5E2A54", fontSize: "13px", fontWeight: "500" }}>
<span style={{ width: "8px", height: "8px", borderRadius: "4px", background: "#1E6B45" }} aria-hidden="true" />
{"Gmail connected · reading hiring emails only "}
</span>
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
<div style={{ overflowX: "auto" }}>
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
<Link href="/jobs/sample" style={{ color: "#2A2028", fontWeight: "600", textDecoration: "none", lineHeight: "1.35" }}>
{k.title}
</Link>
{" "}
<div style={{ marginTop: "2px", color: "#665D63" }}>
{k.company}
</div>
</div>
{" "}
{(k.status) ? (<>
<div style={{ display: "flex", gap: "6px", alignItems: "flex-start", fontSize: "13px", color: "#4D444B", lineHeight: "1.4" }}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#665D63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginTop: "2px", flex: "none" }}>
<rect x="3" y="5" width="18" height="14" rx="2" />
<path d="m3 7 9 6 9-6" />
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
<a href="#" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40px", borderRadius: "10px", background: "#7A3E6E", color: "#FFFFFF", fontWeight: "600", textDecoration: "none" }}>
{"Apply on company site ↗"}
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
{"Paste the link to the posting. We'll pull in the title, company and details, and track it with the rest of your jobs."}
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
{"Add job"}
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
