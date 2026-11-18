"use client";
/* Ported from the mockup (Main.dc.html). Layout and behavior match the design. */
import React from "react";
import Link from "next/link";

export default class OnboardingResume extends React.Component {
  constructor(props) {
    super(props);
    const data = {
      name: 'Jordan Reyes',
      headline: 'Software Engineer · New York',
      exp: [
        { role: 'Software Engineer', org: 'Voice AI startup', dates: '2023–2026' },
        { role: 'Computer Vision Intern', org: 'Biotech company', dates: '2022' },
        { role: 'Research Assistant', org: 'Bioengineering lab', dates: '2020–2022' }
      ],
      edu: [
        { degree: 'M.S. Computer Science', school: 'Online program', dates: '2026–present' },
        { degree: 'B.S. Chemical Engineering & Computer Science', school: 'State university', dates: '2017–2022' }
      ]
    };
    this.state = { data, draft: null };
  }
  clone(x) { return JSON.parse(JSON.stringify(x)); }
  renderVals() {
    const s = this.state;
    const data = s.data;
    const d = s.draft || data;
    const upd = (fn) => { const nd = this.clone(this.state.draft); fn(nd); this.setState({ draft: nd }); };
    const dExp = d.exp.map((e, i) => Object.assign({}, e, {
      setRole: (ev) => upd((n) => { n.exp[i].role = ev.target.value; }),
      setOrg: (ev) => upd((n) => { n.exp[i].org = ev.target.value; }),
      setDates: (ev) => upd((n) => { n.exp[i].dates = ev.target.value; }),
      remove: () => upd((n) => { n.exp.splice(i, 1); })
    }));
    const dEdu = d.edu.map((e, i) => Object.assign({}, e, {
      setDegree: (ev) => upd((n) => { n.edu[i].degree = ev.target.value; }),
      setSchool: (ev) => upd((n) => { n.edu[i].school = ev.target.value; }),
      setDates: (ev) => upd((n) => { n.edu[i].dates = ev.target.value; }),
      remove: () => upd((n) => { n.edu.splice(i, 1); })
    }));
    return {
      accent: this.props.accent ?? '#7A3E6E',
      name: data.name, headline: data.headline, exp: data.exp, edu: data.edu,
      skills: ['Python', 'PyTorch', 'Computer vision', 'TypeScript', 'Wet lab'],
      editing: !!s.draft, d, dExp, dEdu,
      openEdit: () => this.setState({ draft: this.clone(data) }),
      cancel: () => this.setState({ draft: null }),
      save: () => this.setState({ data: this.state.draft, draft: null }),
      setName: (ev) => upd((n) => { n.name = ev.target.value; }),
      setHeadline: (ev) => upd((n) => { n.headline = ev.target.value; }),
      addExp: () => upd((n) => { n.exp.push({ role: '', org: '', dates: '' }); }),
      addEdu: () => upd((n) => { n.edu.push({ degree: '', school: '', dates: '' }); })
    };
  }

  render() {
    const vm = this.renderVals();
    return (<>
<style>{"\nbody{margin:0}\na{color:#7A3E6E}a:hover{color:#5E2A54}\n"}</style>
<div style={{ position: "relative", minHeight: "100vh", background: "#F3E8F0", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
<header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 56px" }}>
<div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "30px", letterSpacing: "-0.5px" }}>
{"aligned"}
</div>
{" "}
<div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", color: "#665D63" }}>
<span>
{"Step 1 of 6"}
</span>
{" "}
<div style={{ display: "flex", gap: "6px" }} aria-hidden="true">
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: vm.accent }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#EFE9D8" }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#EFE9D8" }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#EFE9D8" }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#EFE9D8" }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#EFE9D8" }} />
</div>
</div>
</header>
{" "}
<main style={{ flex: "1", display: "flex", flexWrap: "wrap", gap: "64px", alignItems: "flex-start", justifyContent: "center", padding: "24px 56px 56px", maxWidth: "1280px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
<section style={{ flex: "1 1 520px", maxWidth: "580px", display: "flex", flexDirection: "column", gap: "28px", paddingTop: "40px" }}>
<h1 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "64px", lineHeight: "1.02", letterSpacing: "-1px" }}>
{"Let's start with"}
<br />
{"what's on paper."}
</h1>
{" "}
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.55", color: "#4D444B" }}>
{"Your resume covers the what. Next we'll ask a few quick questions about the why, so the jobs you see actually fit. Every question after this one is optional."}
</p>
{" "}
<label htmlFor="resume" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "40px 24px", border: "1.5px dashed #C9C0A8", borderRadius: "24px", background: "#FFFEFA", cursor: "pointer", textAlign: "center" }}>
<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2A2028" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
<path d="M14 3v5h5" />
<path d="M12 17v-6" />
<path d="m9 14 3-3 3 3" />
</svg>
{" "}
<span style={{ fontSize: "17px", fontWeight: "600" }}>
{"Drop your resume here"}
</span>
{" "}
<span style={{ fontSize: "14px", color: "#665D63" }}>
{"PDF or DOCX, up to 10 MB"}
</span>
{" "}
<input id="resume" type="file" style={{ position: "absolute", width: "1px", height: "1px", opacity: "0" }} />
</label>
{" "}
<div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#665D63", fontSize: "14px" }}>
<div style={{ flex: "1", height: "1px", background: "#EFE9D8" }} />
<span>
{"or"}
</span>
<div style={{ flex: "1", height: "1px", background: "#EFE9D8" }} />
</div>
{" "}
<button type="button" style={{ height: "52px", borderRadius: "26px", border: "1.5px solid #2A2028", background: "transparent", font: "600 16px Inter, sans-serif", color: "#2A2028", cursor: "pointer" }}>
{"Import from LinkedIn"}
</button>
</section>
{" "}
<aside style={{ flex: "0 1 420px", display: "flex", flexDirection: "column", gap: "16px" }} aria-label="Profile preview">
<div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"What we picked up"}
</div>
{" "}
<div style={{ background: "#FFFFFF", borderRadius: "28px", padding: "28px", boxShadow: "0 1px 2px rgba(42,32,40,0.06), 0 12px 32px rgba(42,32,40,0.08)", display: "flex", flexDirection: "column", gap: "22px" }}>
<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
<div style={{ width: "56px", height: "56px", borderRadius: "28px", background: "#F3E6EF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Instrument Serif', serif", fontSize: "26px", color: "#5E2A54" }}>
{"JR"}
</div>
{" "}
<div>
<div style={{ fontSize: "18px", fontWeight: "600" }}>
{vm.name}
</div>
{" "}
<div style={{ fontSize: "14px", color: "#665D63" }}>
{vm.headline}
</div>
</div>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
<h2 style={{ margin: "0", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Experience"}
</h2>
{" "}
{(vm.exp || []).map((e, e$i0) => (<React.Fragment key={e$i0}>
<div style={{ display: "flex", justifyContent: "space-between", gap: "12px", paddingBottom: "12px", borderBottom: "1px solid #F3EFE2" }}>
<div>
<div style={{ fontSize: "15px", fontWeight: "500" }}>
{e.role}
</div>
{" "}
<div style={{ fontSize: "14px", color: "#665D63" }}>
{e.org}
</div>
</div>
{" "}
<span style={{ fontSize: "14px", color: "#665D63", whiteSpace: "nowrap" }}>
{e.dates}
</span>
</div>
</React.Fragment>))}
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
<h2 style={{ margin: "0", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Education"}
</h2>
{" "}
{(vm.edu || []).map((e, e$i1) => (<React.Fragment key={e$i1}>
<div style={{ display: "flex", justifyContent: "space-between", gap: "12px", paddingBottom: "12px", borderBottom: "1px solid #F3EFE2" }}>
<div>
<div style={{ fontSize: "15px", fontWeight: "500" }}>
{e.degree}
</div>
{" "}
<div style={{ fontSize: "14px", color: "#665D63" }}>
{e.school}
</div>
</div>
{" "}
<span style={{ fontSize: "14px", color: "#665D63", whiteSpace: "nowrap" }}>
{e.dates}
</span>
</div>
</React.Fragment>))}
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
<h2 style={{ margin: "0", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Skills"}
</h2>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
{(vm.skills || []).map((s, s$i2) => (<React.Fragment key={s$i2}>
<span style={{ padding: "6px 12px", borderRadius: "999px", background: "#FFFDF5", fontSize: "13px" }}>
{s}
</span>
</React.Fragment>))}
</div>
</div>
{" "}
<button type="button" onClick={vm.openEdit} style={{ alignSelf: "flex-start", height: "44px", padding: "0 20px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", font: "600 14px Inter, sans-serif", color: "#2A2028", cursor: "pointer" }}>
{"Edit details"}
</button>
</div>
</aside>
</main>
{" "}
<footer style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "24px", padding: "24px 56px 40px" }}>
<Link href="/onboarding/priorities" style={{ display: "inline-flex", alignItems: "center", height: "52px", padding: "0 32px", borderRadius: "26px", background: vm.accent, color: "#FFFFFF", fontSize: "16px", fontWeight: "600", textDecoration: "none" }}>
{"Continue"}
</Link>
</footer>
{" "}
{(vm.editing) ? (<>
<div style={{ position: "absolute", inset: "0", background: "rgba(42,32,40,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "56px 24px", boxSizing: "border-box" }}>
<div role="dialog" aria-modal="true" aria-labelledby="edit-title" style={{ width: "100%", maxWidth: "640px", maxHeight: "1000px", overflowY: "auto", background: "#FFFFFF", borderRadius: "28px", boxShadow: "0 24px 64px rgba(42,32,40,0.25)", display: "flex", flexDirection: "column" }}>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 32px 8px" }}>
<h2 id="edit-title" style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "36px" }}>
{"Edit your details"}
</h2>
{" "}
<button type="button" onClick={vm.cancel} aria-label="Close" style={{ width: "44px", height: "44px", borderRadius: "22px", border: "none", background: "#FFFDF5", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2A2028" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
<path d="M6 6l12 12M18 6 6 18" />
</svg>
</button>
</div>
{" "}
<div style={{ padding: "16px 32px 24px", display: "flex", flexDirection: "column", gap: "28px" }}>
<section style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" }}>
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#4D444B" }}>
{"Name "}
<input type="text" value={vm.d.name} onChange={vm.setName} style={{ height: "44px", padding: "0 14px", border: "1.5px solid #EFE9D8", borderRadius: "12px", font: "400 15px Inter, sans-serif", color: "#2A2028" }} />
</label>
{" "}
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#4D444B" }}>
{"Headline "}
<input type="text" value={vm.d.headline} onChange={vm.setHeadline} style={{ height: "44px", padding: "0 14px", border: "1.5px solid #EFE9D8", borderRadius: "12px", font: "400 15px Inter, sans-serif", color: "#2A2028" }} />
</label>
</section>
{" "}
<section style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
<h3 style={{ margin: "0", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Experience"}
</h3>
{" "}
{(vm.dExp || []).map((e, e$i3) => (<React.Fragment key={e$i3}>
<div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", borderRadius: "16px", background: "#FCFAF2" }}>
<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#4D444B" }}>
{"Role "}
<input type="text" value={e.role} onChange={e.setRole} style={{ height: "44px", padding: "0 14px", border: "1.5px solid #EFE9D8", borderRadius: "12px", font: "400 15px Inter, sans-serif", color: "#2A2028", background: "#FFFFFF" }} />
</label>
{" "}
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#4D444B" }}>
{"Company "}
<input type="text" value={e.org} onChange={e.setOrg} style={{ height: "44px", padding: "0 14px", border: "1.5px solid #EFE9D8", borderRadius: "12px", font: "400 15px Inter, sans-serif", color: "#2A2028", background: "#FFFFFF" }} />
</label>
</div>
{" "}
<div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
<label style={{ flex: "1", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#4D444B" }}>
{"Dates "}
<input type="text" value={e.dates} onChange={e.setDates} style={{ height: "44px", padding: "0 14px", border: "1.5px solid #EFE9D8", borderRadius: "12px", font: "400 15px Inter, sans-serif", color: "#2A2028", background: "#FFFFFF" }} />
</label>
{" "}
<button type="button" onClick={e.remove} style={{ height: "44px", padding: "0 14px", borderRadius: "12px", border: "none", background: "transparent", font: "500 14px Inter, sans-serif", color: "#8A2D2D", cursor: "pointer" }}>
{"Remove"}
</button>
</div>
</div>
</React.Fragment>))}
{" "}
<button type="button" onClick={vm.addExp} style={{ alignSelf: "flex-start", height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px dashed #C9C0A8", background: "transparent", font: "500 14px Inter, sans-serif", color: "#4D444B", cursor: "pointer" }}>
{"+ Add experience"}
</button>
</section>
{" "}
<section style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
<h3 style={{ margin: "0", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Education"}
</h3>
{" "}
{(vm.dEdu || []).map((e, e$i4) => (<React.Fragment key={e$i4}>
<div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", borderRadius: "16px", background: "#FCFAF2" }}>
<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#4D444B" }}>
{"Degree "}
<input type="text" value={e.degree} onChange={e.setDegree} style={{ height: "44px", padding: "0 14px", border: "1.5px solid #EFE9D8", borderRadius: "12px", font: "400 15px Inter, sans-serif", color: "#2A2028", background: "#FFFFFF" }} />
</label>
{" "}
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#4D444B" }}>
{"School "}
<input type="text" value={e.school} onChange={e.setSchool} style={{ height: "44px", padding: "0 14px", border: "1.5px solid #EFE9D8", borderRadius: "12px", font: "400 15px Inter, sans-serif", color: "#2A2028", background: "#FFFFFF" }} />
</label>
</div>
{" "}
<div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
<label style={{ flex: "1", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#4D444B" }}>
{"Dates "}
<input type="text" value={e.dates} onChange={e.setDates} style={{ height: "44px", padding: "0 14px", border: "1.5px solid #EFE9D8", borderRadius: "12px", font: "400 15px Inter, sans-serif", color: "#2A2028", background: "#FFFFFF" }} />
</label>
{" "}
<button type="button" onClick={e.remove} style={{ height: "44px", padding: "0 14px", borderRadius: "12px", border: "none", background: "transparent", font: "500 14px Inter, sans-serif", color: "#8A2D2D", cursor: "pointer" }}>
{"Remove"}
</button>
</div>
</div>
</React.Fragment>))}
{" "}
<button type="button" onClick={vm.addEdu} style={{ alignSelf: "flex-start", height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px dashed #C9C0A8", background: "transparent", font: "500 14px Inter, sans-serif", color: "#4D444B", cursor: "pointer" }}>
{"+ Add education"}
</button>
</section>
</div>
{" "}
<div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", padding: "20px 32px 28px", borderTop: "1px solid #F3EFE2" }}>
<button type="button" onClick={vm.cancel} style={{ height: "48px", padding: "0 22px", borderRadius: "24px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", font: "600 15px Inter, sans-serif", color: "#2A2028", cursor: "pointer" }}>
{"Cancel"}
</button>
{" "}
<button type="button" onClick={vm.save} style={{ height: "48px", padding: "0 26px", borderRadius: "24px", border: "none", background: vm.accent, font: "600 15px Inter, sans-serif", color: "#FFFFFF", cursor: "pointer" }}>
{"Save changes"}
</button>
</div>
</div>
</div>
</>) : null}
</div>
</>);
  }
}
