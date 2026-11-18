"use client";
/* Ported from the mockup (Loading.dc.html). Layout and behavior match the design. */
import React from "react";
import Link from "next/link";

export default class Matching extends React.Component {
  constructor(props) {
    super(props);
    this.state = { step: 0 };
  }
  componentDidMount() { this.start(); }
  componentWillUnmount() { clearInterval(this.timer); }
  start() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      const n = this.state.step + 1;
      this.setState({ step: n });
      if (n >= 5) clearInterval(this.timer);
    }, 1400);
  }
  renderVals() {
    const step = this.state.step;
    const STEPS = [
      ['Reading your resume and answers', '3 lanes, 3 priorities'],
      ['Scanning New York postings', '1,842 open roles'],
      ['Matching against your background', '64 possible fits'],
      ['Ranking by what matters to you', '12 strong matches'],
      ['Pulling interview processes and contacts', '9 with known process']
    ];
    const steps = STEPS.map(([label, detail], i) => ({ label, detail, isDone: i < step, isActive: i === step, isTodo: i > step }));
    const counts = [0, 0, 1842, 64, 12, 12];
    const done = step >= 5;
    const pct = Math.round(step / 5 * 100);
    return {
      steps, done, working: !done, pct, pctW: pct + '%',
      found: done ? '12' : counts[step] ? counts[step].toLocaleString('en-US') : '',
      numColor: done ? '#FFFFFF' : '#2A2028',
      headline: done ? 'We found your matches.' : 'Finding roles that fit you',
      sub: done ? '12 New York roles ranked by your priorities, with interview details and contacts where we have them.' : 'This takes a few seconds. We look at every open role in New York, not just the ones with the right keywords.',
      replay: () => { this.setState({ step: 0 }); this.start(); }
    };
  }

  render() {
    const vm = this.renderVals();
    return (<>
<style>{"\nbody{margin:0}\na{color:#7A3E6E}a:hover{color:#5E2A54}\n@keyframes al-spin{to{transform:rotate(360deg)}}\n@keyframes al-pulse{0%,100%{opacity:.35}50%{opacity:1}}\n@media (prefers-reduced-motion: reduce){.al-anim{animation:none !important}}\n"}</style>
<div style={{ minHeight: "100vh", background: "#F3E8F0", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
<header style={{ display: "flex", alignItems: "center", padding: "28px 56px" }}>
<div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "30px", letterSpacing: "-0.5px" }}>
{"aligned"}
</div>
</header>
{" "}
<main style={{ flex: "1", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 24px 80px" }}>
<div style={{ width: "100%", maxWidth: "560px", display: "flex", flexDirection: "column", alignItems: "center", gap: "36px", textAlign: "center" }}>
<div style={{ position: "relative", width: "112px", height: "112px" }} aria-hidden="true">
{(vm.working) ? (<>
<div className="al-anim" style={{ position: "absolute", inset: "0", borderRadius: "56px", border: "4px solid #E3CBDD", borderTopColor: "#7A3E6E", animation: "al-spin 1.1s linear infinite" }} />
</>) : null}
{" "}
{(vm.done) ? (<>
<div style={{ position: "absolute", inset: "0", borderRadius: "56px", background: "#7A3E6E" }} />
</>) : null}
{" "}
<div style={{ position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Instrument Serif', serif", fontSize: "34px", color: vm.numColor }}>
{vm.found}
</div>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "12px" }} aria-live="polite">
<h1 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "52px", lineHeight: "1.04", letterSpacing: "-1px" }}>
{vm.headline}
</h1>
{" "}
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.55", color: "#4D444B" }}>
{vm.sub}
</p>
</div>
{" "}
<div style={{ width: "100%", height: "6px", borderRadius: "3px", background: "#EFEADB", overflow: "hidden" }} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={vm.pct} aria-label="Progress">
<div style={{ width: vm.pctW, height: "100%", borderRadius: "3px", background: "#7A3E6E", transition: "width 0.6s ease" }} />
</div>
{" "}
<ol style={{ listStyle: "none", margin: "0", padding: "24px 28px", width: "100%", boxSizing: "border-box", background: "#FFFFFF", borderRadius: "24px", boxShadow: "0 1px 2px rgba(42,32,40,0.06), 0 12px 32px rgba(42,32,40,0.07)", display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
{(vm.steps || []).map((s, s$i0) => (<React.Fragment key={s$i0}>
<li style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "15px" }}>
{(s.isDone) ? (<>
<span style={{ width: "24px", height: "24px", flex: "none", borderRadius: "12px", background: "#7A3E6E", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
<path d="m5 12 5 5L20 7" />
</svg>
</span>
{" "}
<span style={{ flex: "1" }}>
{s.label}
</span>
{" "}
<span style={{ color: "#665D63", fontSize: "14px" }}>
{s.detail}
</span>
</>) : null}
{" "}
{(s.isActive) ? (<>
<span className="al-anim" style={{ width: "24px", height: "24px", flex: "none", borderRadius: "12px", border: "2px solid #7A3E6E", boxSizing: "border-box", animation: "al-pulse 1.2s ease-in-out infinite" }} aria-hidden="true" />
{" "}
<span style={{ flex: "1", fontWeight: "600" }}>
{s.label}{"…"}
</span>
</>) : null}
{" "}
{(s.isTodo) ? (<>
<span style={{ width: "24px", height: "24px", flex: "none", borderRadius: "12px", border: "2px solid #EFE9D8", boxSizing: "border-box" }} aria-hidden="true" />
{" "}
<span style={{ flex: "1", color: "#665D63" }}>
{s.label}
</span>
</>) : null}
</li>
</React.Fragment>))}
</ol>
{" "}
{(vm.done) ? (<>
<div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
<button type="button" onClick={vm.replay} style={{ height: "44px", padding: "0 8px", border: "none", background: "transparent", font: "500 15px Inter, sans-serif", color: "#7A3E6E", cursor: "pointer" }}>
{"Replay"}
</button>
{" "}
<Link href="/jobs" style={{ display: "inline-flex", alignItems: "center", height: "52px", padding: "0 32px", borderRadius: "26px", background: "#7A3E6E", color: "#FFFFFF", fontSize: "16px", fontWeight: "600", textDecoration: "none" }}>
{"See my 12 matches"}
</Link>
</div>
</>) : null}
</div>
</main>
</div>
</>);
  }
}
