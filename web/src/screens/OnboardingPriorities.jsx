"use client";
/* Ported from the mockup (Onboarding-Priorities.dc.html). Layout and behavior match the design. */
import React from "react";
import Link from "next/link";

export default class OnboardingPriorities extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      pri: ['mission', 'work', 'wlb'],
      trade: { mission: 'Yes', title: 'Maybe', commute: 'No', stability: 'Maybe', office: 'Maybe', tenure: 'Yes', promo: 'Maybe', field: 'No' },
      modes: ['hybrid'],
      boroughs: ['manhattan', 'brooklyn'],
      skip: { pri: false, trade: false, loc: false }
    };
  }
  renderVals() {
    const s = this.state;
    const sec = (key) => {
      const on = s.skip[key];
      return {
        skipped: on, label: on ? 'Undo skip' : 'Skip',
        op: on ? '0.35' : '1', pe: on ? 'none' : 'auto',
        bg: on ? '#F2EEE2' : '#FFFFFF',
        shadow: on ? 'none' : '0 1px 2px rgba(42,32,40,0.06), 0 12px 32px rgba(42,32,40,0.07)',
        toggle: () => this.setState({ skip: Object.assign({}, s.skip, { [key]: !on }) })
      };
    };
    const priList = [
      ['mission', 'Mission'], ['work', 'The work itself'], ['wlb', 'Work-life balance'],
      ['comp', 'Compensation'], ['status', 'Status & prestige'], ['culture', 'Culture & people'],
      ['growth', 'Learning & growth'], ['stability', 'Stability'], ['flex', 'Flexibility']
    ];
    const priorities = priList.map(([id, label]) => {
      const i = s.pri.indexOf(id);
      return {
        label, sel: i >= 0, unsel: i < 0, rank: i + 1,
        toggle: () => {
          const next = s.pri.slice();
          if (i >= 0) next.splice(i, 1);
          else if (next.length < 3) next.push(id);
          this.setState({ pri: next });
        }
      };
    });
    const tList = [
      ['mission', 'Some salary', 'a mission-driven industry', 'posted pay · company industry'],
      ['title', 'A lower title', 'a bigger, more established company', 'job level · headcount and stage'],
      ['commute', 'A longer commute', 'higher pay', 'office address · posted pay'],
      ['stability', 'Stability', 'equity upside at an early-stage startup', 'funding stage · equity in posting'],
      ['office', 'More days in the office', 'a more senior title', 'in-office days · job level'],
      ['tenure', 'Some salary', 'a company where people stay longer', 'posted pay · average tenure'],
      ['promo', 'Some salary', 'faster promotions', 'posted pay · average promotion cycle'],
      ['field', 'Work further from my background', 'higher pay', 'your resume vs. the role · posted pay']
    ];
    const tradeoffs = tList.map(([id, give, get, how]) => ({
      give, get, how,
      opts: ['Yes', 'Maybe', 'No'].map((label) => ({
        label, sel: s.trade[id] === label, unsel: s.trade[id] !== label,
        pick: () => this.setState({ trade: Object.assign({}, s.trade, { [id]: label }) })
      }))
    }));
    const chips = (key, list) => list.map(([id, label]) => {
      const on = s[key].indexOf(id) >= 0;
      return { label, sel: on, unsel: !on, toggle: () => this.setState({ [key]: on ? s[key].filter((x) => x !== id) : s[key].concat(id) }) };
    });
    return {
      sp: sec('pri'), st: sec('trade'), sl: sec('loc'),
      priorities, tradeoffs,
      modes: chips('modes', [['office', 'In the office'], ['hybrid', 'Hybrid'], ['remote', 'Remote, from NYC']]),
      boroughs: chips('boroughs', [['manhattan', 'Manhattan'], ['brooklyn', 'Brooklyn'], ['queens', 'Queens'], ['bronx', 'The Bronx'], ['si', 'Staten Island'], ['any', "Doesn't matter"]])
    };
  }

  render() {
    const vm = this.renderVals();
    return (<>
<style>{"\nbody{margin:0}\na{color:#7A3E6E}a:hover{color:#5E2A54}\n"}</style>
<div style={{ minHeight: "100vh", background: "#FFFDF5", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
<header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 56px" }}>
<div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "30px", letterSpacing: "-0.5px" }}>
{"aligned"}
</div>
{" "}
<div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", color: "#665D63" }}>
<span>
{"Step 2 of 6"}
</span>
{" "}
<div style={{ display: "flex", gap: "6px" }} aria-hidden="true">
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#7A3E6E" }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#7A3E6E" }} />
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
<main style={{ flex: "1", width: "100%", maxWidth: "760px", margin: "0 auto", padding: "16px 24px 48px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "28px" }}>
{" "}
<section style={{ background: vm.sp.bg, borderRadius: "28px", padding: "36px", boxShadow: vm.sp.shadow, display: "flex", flexDirection: "column", gap: "20px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
<div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Pick up to 3, in order"}
</div>
{" "}
<button type="button" onClick={vm.sp.toggle} aria-pressed={vm.sp.skipped} style={{ height: "36px", padding: "0 14px", borderRadius: "18px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", font: "500 14px Inter, sans-serif", color: "#4D444B", cursor: "pointer" }}>
{vm.sp.label}
</button>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "20px", opacity: vm.sp.op, pointerEvents: vm.sp.pe }} aria-hidden={vm.sp.skipped}>
<h2 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "44px", lineHeight: "1.05" }}>
{"My next role should prioritize…"}
</h2>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
{(vm.priorities || []).map((p, p$i0) => (<React.Fragment key={p$i0}>
{(p.sel) ? (<>
<button type="button" onClick={p.toggle} style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "44px", padding: "0 18px 0 8px", borderRadius: "22px", border: "1.5px solid #D9C24E", background: "#FCEFA8", color: "#4A3B00", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
<span style={{ width: "28px", height: "28px", borderRadius: "14px", background: "#FFFFFF", color: "#4A3B00", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "600" }}>
{p.rank}
</span>
{p.label}{" "}
</button>
</>) : null}
{" "}
{(p.unsel) ? (<>
<button type="button" onClick={p.toggle} style={{ height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", color: "#2A2028", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
{p.label}
</button>
</>) : null}
</React.Fragment>))}
{" "}
<button type="button" style={{ height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px dashed #C9C0A8", background: "transparent", color: "#4D444B", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
{"+ Add your own"}
</button>
</div>
</div>
{" "}
{(vm.sp.skipped) ? (<>
<p style={{ margin: "0", fontSize: "14px", color: "#665D63" }}>
{"Skipped. We won't use this for matching."}
</p>
</>) : null}
</section>
{" "}
{" "}
<section style={{ background: vm.st.bg, borderRadius: "28px", padding: "36px", boxShadow: vm.st.shadow, display: "flex", flexDirection: "column", gap: "20px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
<div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Tradeoffs"}
</div>
{" "}
<button type="button" onClick={vm.st.toggle} aria-pressed={vm.st.skipped} style={{ height: "36px", padding: "0 14px", borderRadius: "18px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", font: "500 14px Inter, sans-serif", color: "#4D444B", cursor: "pointer" }}>
{vm.st.label}
</button>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "20px", opacity: vm.st.op, pointerEvents: vm.st.pe }} aria-hidden={vm.st.skipped}>
<h2 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "44px", lineHeight: "1.05" }}>
{"I'd trade…"}
</h2>
{" "}
<p style={{ margin: "0", fontSize: "15px", lineHeight: "1.5", color: "#4D444B" }}>
{"Only tradeoffs we can actually check against a job posting, company data or your background."}
</p>
{" "}
<div style={{ display: "flex", flexDirection: "column" }}>
{(vm.tradeoffs || []).map((t, t$i1) => (<React.Fragment key={t$i1}>
<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "16px 0", borderBottom: "1px solid #F3EFE2" }}>
<div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: "4px" }}>
<div style={{ fontSize: "17px" }}>
{t.give}{" "}
<span style={{ color: "#665D63" }}>
{"for"}
</span>
{" "}{t.get}
</div>
{" "}
<div style={{ fontSize: "13px", color: "#665D63" }}>
{"We check: "}{t.how}
</div>
</div>
{" "}
<div style={{ display: "flex", gap: "6px" }} role="group" aria-label={`${t.give} for ${t.get}`}>
{(t.opts || []).map((o, o$i2) => (<React.Fragment key={o$i2}>
{(o.sel) ? (<>
<button type="button" onClick={o.pick} aria-pressed="true" style={{ height: "44px", minWidth: "72px", padding: "0 14px", borderRadius: "22px", border: "1.5px solid #D9C24E", background: "#FCEFA8", color: "#4A3B00", font: "500 14px Inter, sans-serif", cursor: "pointer" }}>
{o.label}
</button>
</>) : null}
{" "}
{(o.unsel) ? (<>
<button type="button" onClick={o.pick} aria-pressed="false" style={{ height: "44px", minWidth: "72px", padding: "0 14px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", color: "#2A2028", font: "500 14px Inter, sans-serif", cursor: "pointer" }}>
{o.label}
</button>
</>) : null}
</React.Fragment>))}
</div>
</div>
</React.Fragment>))}
</div>
</div>
{" "}
{(vm.st.skipped) ? (<>
<p style={{ margin: "0", fontSize: "14px", color: "#665D63" }}>
{"Skipped. We won't use this for matching."}
</p>
</>) : null}
</section>
{" "}
{" "}
<section style={{ background: vm.sl.bg, borderRadius: "28px", padding: "36px", boxShadow: vm.sl.shadow, display: "flex", flexDirection: "column", gap: "20px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
<div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"New York roles · pick any"}
</div>
{" "}
<button type="button" onClick={vm.sl.toggle} aria-pressed={vm.sl.skipped} style={{ height: "36px", padding: "0 14px", borderRadius: "18px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", font: "500 14px Inter, sans-serif", color: "#4D444B", cursor: "pointer" }}>
{vm.sl.label}
</button>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "20px", opacity: vm.sl.op, pointerEvents: vm.sl.pe }} aria-hidden={vm.sl.skipped}>
<h2 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "44px", lineHeight: "1.05" }}>
{"In New York, I'd like to work…"}
</h2>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
{(vm.modes || []).map((p, p$i3) => (<React.Fragment key={p$i3}>
{(p.sel) ? (<>
<button type="button" onClick={p.toggle} aria-pressed="true" style={{ height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px solid #D9C24E", background: "#FCEFA8", color: "#4A3B00", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
{p.label}
</button>
</>) : null}
{" "}
{(p.unsel) ? (<>
<button type="button" onClick={p.toggle} aria-pressed="false" style={{ height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", color: "#2A2028", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
{p.label}
</button>
</>) : null}
</React.Fragment>))}
</div>
{" "}
<div style={{ fontSize: "15px", color: "#4D444B" }}>
{"Ideally the office is in…"}
</div>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
{(vm.boroughs || []).map((p, p$i4) => (<React.Fragment key={p$i4}>
{(p.sel) ? (<>
<button type="button" onClick={p.toggle} aria-pressed="true" style={{ height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px solid #D9C24E", background: "#FCEFA8", color: "#4A3B00", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
{p.label}
</button>
</>) : null}
{" "}
{(p.unsel) ? (<>
<button type="button" onClick={p.toggle} aria-pressed="false" style={{ height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", color: "#2A2028", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
{p.label}
</button>
</>) : null}
</React.Fragment>))}
</div>
</div>
{" "}
{(vm.sl.skipped) ? (<>
<p style={{ margin: "0", fontSize: "14px", color: "#665D63" }}>
{"Skipped. We'll show roles anywhere in New York."}
</p>
</>) : null}
</section>
</main>
{" "}
<footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "24px", padding: "8px 56px 40px" }}>
<Link href="/onboarding" style={{ fontSize: "15px", fontWeight: "500" }}>
{"Back"}
</Link>
{" "}
<Link href="/onboarding/future" style={{ display: "inline-flex", alignItems: "center", height: "52px", padding: "0 32px", borderRadius: "26px", background: "#7A3E6E", color: "#FFFFFF", fontSize: "16px", fontWeight: "600", textDecoration: "none" }}>
{"Continue"}
</Link>
</footer>
</div>
</>);
  }
}
