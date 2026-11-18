"use client";
/* Ported from the mockup (Profile.dc.html). Layout and behavior match the design. */
import React from "react";
import Link from "next/link";

export default class Profile extends React.Component {
  constructor(props) {
    super(props);
    this.state = { done: [false, false, true, false] };
  }
  renderVals() {
    const s = this.state;
    const items = [
      { text: 'Apply: ML Engineer, Imaging at Parallax Bio', sub: 'Your focus role · about 30 min' },
      { text: 'Email Maya Okafor, hiring manager at Parallax', sub: 'maya.okafor@parallaxbio.com' },
      { text: 'Email Sana Patel, ML Engineer at Parallax', sub: 'Ask what the first 6 months look like' },
      { text: 'Apply: ML Engineer, Sequencing at Northlight', sub: 'Your backup · about 20 min' }
    ];
    const todos = items.map((t, i) => Object.assign({}, t, { done: s.done[i], toggle: () => { const d = s.done.slice(); d[i] = !d[i]; this.setState({ done: d }); } }));
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => ({ l, on: i < 5, off: i >= 5 }));
    return { todos, days };
  }

  render() {
    const vm = this.renderVals();
    return (<>
<style>{"\nbody{margin:0}\na{color:#7A3E6E}a:hover{color:#5E2A54}\n"}</style>
<div style={{ minHeight: "100vh", background: "#FFFDF5", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif", fontSize: "14px" }}>
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
<Link href="/my-jobs" style={{ textDecoration: "none", color: "#665D63", padding: "6px 0" }}>
{"My jobs"}
</Link>
</nav>
{" "}
<Link href="/profile" aria-label="Your profile and plan" style={{ width: "36px", height: "36px", borderRadius: "18px", background: "#7A3E6E", color: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "600", textDecoration: "none" }}>
{"JR"}
</Link>
</header>
{" "}
<div style={{ maxWidth: "1240px", margin: "0 auto", padding: "32px 40px 64px", boxSizing: "border-box", display: "flex", flexWrap: "wrap", gap: "32px", alignItems: "flex-start" }}>
<aside style={{ flex: "1 1 300px", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "16px" }} aria-label="Profile">
<section style={{ background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
<div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
<div style={{ width: "52px", height: "52px", borderRadius: "26px", background: "#F3E6EF", color: "#5E2A54", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Instrument Serif', serif", fontSize: "24px" }}>
{"JR"}
</div>
{" "}
<div>
<div style={{ fontSize: "17px", fontWeight: "600" }}>
{"Jordan Reyes"}
</div>
{" "}
<div style={{ color: "#665D63" }}>
{"Software Engineer · New York"}
</div>
</div>
</div>
{" "}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: "10px", background: "#F8F4E8" }}>
<span>
{"Resume_JReyes_Nov.pdf"}
</span>
<a href="#" style={{ fontWeight: "500" }}>
{"Replace"}
</a>
</div>
</section>
{" "}
<section style={{ background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
<h2 style={{ margin: "0", fontSize: "16px", fontWeight: "600" }}>
{"What you're looking for"}
</h2>
{" "}
<Link href="/onboarding/priorities" style={{ fontWeight: "500" }}>
{"Edit"}
</Link>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
<div style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase", color: "#665D63" }}>
{"Priorities"}
</div>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
<span style={{ padding: "5px 10px", borderRadius: "999px", background: "#F3E6EF", color: "#5E2A54", fontWeight: "500" }}>
{"1 Mission"}
</span>
{" "}
<span style={{ padding: "5px 10px", borderRadius: "999px", background: "#F3E6EF", color: "#5E2A54", fontWeight: "500" }}>
{"2 The work itself"}
</span>
{" "}
<span style={{ padding: "5px 10px", borderRadius: "999px", background: "#F3E6EF", color: "#5E2A54", fontWeight: "500" }}>
{"3 Work-life balance"}
</span>
</div>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
<div style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase", color: "#665D63" }}>
{"Your lanes"}
</div>
{" "}
<ol style={{ margin: "0", paddingLeft: "20px", lineHeight: "1.8" }}>
<li>
{"ML Engineer, Medical Imaging"}
</li>
<li>
{"Applied Scientist, Health AI"}
</li>
<li>
{"Software Engineer, Health Data"}
</li>
</ol>
{" "}
<Link href="/onboarding/market" style={{ fontWeight: "500" }}>
{"See market read"}
</Link>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
<div style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase", color: "#665D63" }}>
{"Where"}
</div>
{" "}
<div>
{"New York, Remote"}
</div>
</div>
</section>
</aside>
{" "}
<main style={{ flex: "999 1 560px", minWidth: "0", display: "flex", flexDirection: "column", gap: "16px" }}>
<section style={{ background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "16px", padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
<div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
<h1 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "36px" }}>
{"Your plan"}
</h1>
{" "}
<span style={{ color: "#665D63" }}>
{"Week 3 of 15"}
</span>
</div>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }}>
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "500" }}>
{"Offer by "}
<input type="date" defaultValue="2027-03-01" style={{ height: "40px", padding: "0 12px", border: "1px solid #E6DED0", borderRadius: "8px", font: "400 14px Inter, sans-serif", color: "#2A2028" }} />
</label>
{" "}
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "500" }}>
{"Hours per week "}
<select style={{ height: "40px", padding: "0 10px", border: "1px solid #E6DED0", borderRadius: "8px", font: "400 14px Inter, sans-serif", color: "#2A2028", background: "#FFFFFF" }}>
<option>
{"5"}
</option>
<option selected={true}>
{"10"}
</option>
<option>
{"20"}
</option>
<option>
{"30+"}
</option>
</select>
</label>
{" "}
<label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "500", paddingTop: "22px", cursor: "pointer" }}>
<input type="checkbox" checked={true} style={{ width: "16px", height: "16px", accentColor: "#7A3E6E", margin: "0" }} />
{"Date is flexible "}
</label>
</div>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px", padding: "18px 20px", borderRadius: "12px", background: "#FBF5FA" }}>
<div style={{ flex: "1 1 320px" }}>
<div style={{ fontWeight: "600", color: "#4A2141" }}>
{"Focus: Parallax Bio · ML Engineer, Imaging"}
</div>
{" "}
<div style={{ marginTop: "4px", color: "#4D444B", lineHeight: "1.5" }}>
{"Your plan puts this role first. New applications are paused except for backups."}
</div>
</div>
{" "}
<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
<input type="checkbox" checked={true} style={{ width: "16px", height: "16px", accentColor: "#7A3E6E", margin: "0" }} />
{"Keep 1 backup active "}
</label>
{" "}
<button type="button" style={{ height: "36px", padding: "0 14px", borderRadius: "8px", border: "1px solid #D9B6CF", background: "#FFFFFF", font: "500 13px Inter, sans-serif", color: "#4A2141", cursor: "pointer" }}>
{"End focus"}
</button>
</div>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
<div style={{ padding: "18px", borderRadius: "12px", border: "1px solid #EFE9D8", display: "flex", flexDirection: "column", gap: "10px" }}>
<div style={{ display: "flex", justifyContent: "space-between" }}>
<span style={{ fontWeight: "500" }}>
{"Applications this week"}
</span>
<span style={{ fontWeight: "600" }}>
{"3 of 6"}
</span>
</div>
{" "}
<div style={{ height: "8px", borderRadius: "4px", background: "#F3EEE0" }}>
<div style={{ width: "50%", height: "100%", borderRadius: "4px", background: "#7A3E6E" }} />
</div>
{" "}
<div style={{ fontSize: "13px", color: "#665D63" }}>
{"Counted from confirmation emails"}
</div>
</div>
{" "}
<div style={{ padding: "18px", borderRadius: "12px", border: "1px solid #EFE9D8", display: "flex", flexDirection: "column", gap: "10px" }}>
<div style={{ display: "flex", justifyContent: "space-between" }}>
<span style={{ fontWeight: "500" }}>
{"Outreach target"}
</span>
<span style={{ fontWeight: "600" }}>
{"8 / week"}
</span>
</div>
{" "}
<div style={{ fontSize: "13px", color: "#665D63", lineHeight: "1.5" }}>
{"Suggested people show up in your daily to-do. Outreach isn't tracked."}
</div>
</div>
</div>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", padding: "14px 18px", borderRadius: "10px", background: "#F8F4E8", color: "#4D444B" }}>
<span>
{"Per to-do day: "}
<strong style={{ color: "#2A2028", fontWeight: "600" }}>
{"1–2 applications"}
</strong>
{" · "}
<strong style={{ color: "#2A2028", fontWeight: "600" }}>
{"1–2 outreach messages"}
</strong>
</span>
{" "}
<span style={{ color: "#665D63" }}>
{"Send last applications by Jan 25 to hit Mar 1"}
</span>
</div>
</section>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
<section style={{ flex: "1 1 320px", background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
<h2 style={{ margin: "0", fontSize: "16px", fontWeight: "600" }}>
{"Today"}
</h2>
{" "}
<span style={{ color: "#665D63" }}>
{"Tue, Nov 18"}
</span>
</div>
{" "}
{(vm.todos || []).map((t, t$i0) => (<React.Fragment key={t$i0}>
<label style={{ display: "flex", gap: "12px", alignItems: "flex-start", cursor: "pointer" }}>
<input type="checkbox" checked={t.done} onChange={t.toggle} style={{ width: "16px", height: "16px", margin: "2px 0 0", accentColor: "#7A3E6E" }} />
{" "}
<span style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
<span style={{ fontWeight: "500" }}>
{t.text}
</span>
{" "}
<span style={{ fontSize: "13px", color: "#665D63" }}>
{t.sub}
</span>
</span>
</label>
</React.Fragment>))}
</section>
{" "}
<section style={{ flex: "1 1 280px", background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
<h2 style={{ margin: "0", fontSize: "16px", fontWeight: "600" }}>
{"Daily to-do email"}
</h2>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }} role="group" aria-label="Days">
{(vm.days || []).map((d, d$i1) => (<React.Fragment key={d$i1}>
{(d.on) ? (<>
<span style={{ width: "40px", height: "32px", borderRadius: "8px", background: "#7A3E6E", color: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "500" }}>
{d.l}
</span>
</>) : null}
{" "}
{(d.off) ? (<>
<span style={{ width: "40px", height: "32px", borderRadius: "8px", border: "1px solid #E6DED0", color: "#4D444B", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "500" }}>
{d.l}
</span>
</>) : null}
</React.Fragment>))}
</div>
{" "}
<div style={{ color: "#4D444B" }}>
{"8:30 am · jordan.reyes@gmail.com"}
</div>
{" "}
<div style={{ display: "flex", gap: "16px" }}>
<a href="#" style={{ fontWeight: "500" }}>
{"Change schedule"}
</a>
<Link href="/email-preview" style={{ fontWeight: "500" }}>
{"Preview email"}
</Link>
</div>
</section>
</div>
</main>
</div>
</div>
</>);
  }
}
