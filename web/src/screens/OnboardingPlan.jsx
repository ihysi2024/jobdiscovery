"use client";
/* Ported from the mockup (Onboarding-Plan.dc.html). Layout and behavior match the design. */
import React from "react";
import Link from "next/link";

export default class OnboardingPlan extends React.Component {
  constructor(props) {
    super(props);
    this.state = { date: 'mar', custom: null, calOpen: false, calY: 2026, calM: 10, hours: 10, flexible: true, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] };
  }
  renderVals() {
    const s = this.state;
    const TODAY = new Date(2026, 10, 18);
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const fmt = (d) => MON[d.getMonth()] + ' ' + d.getDate();
    const P = { jan: new Date(2027, 0, 15), mar: new Date(2027, 2, 1), may: new Date(2027, 4, 1) };
    const target = s.date === 'custom' && s.custom ? new Date(s.custom) : P[s.date];
    const weeks = Math.max(1, Math.ceil((target - TODAY) / (7 * 864e5)));

    const dates = Object.keys(P).map((k) => ({ label: 'By ' + fmt(P[k]), sel: s.date === k, unsel: s.date !== k, pick: () => this.setState({ date: k, calOpen: false }) }));
    const customSel = s.date === 'custom' && !!s.custom;

    // calendar
    const y = s.calY, m = s.calM;
    const first = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push({ empty: true });
    for (let d = 1; d <= dim; d++) {
      const dt = new Date(y, m, d);
      const past = dt <= TODAY;
      const sel = customSel && new Date(s.custom).getTime() === dt.getTime();
      cells.push({ d, empty: false, past, sel: !past && sel, open: !past && !sel, aria: MONL[m] + ' ' + d + ', ' + y,
        pick: () => this.setState({ date: 'custom', custom: dt.getTime(), calOpen: false }) });
    }
    const atMin = y === TODAY.getFullYear() && m === TODAY.getMonth();
    const shift = (n) => { let nm = m + n, ny = y; if (nm < 0) { nm = 11; ny--; } if (nm > 11) { nm = 0; ny++; } this.setState({ calY: ny, calM: nm }); };

    // targets: only applications and outreach
    const appsWeek = Math.min(15, Math.max(3, Math.round(90 / weeks)));
    const outWeek = Math.round(appsWeek * 1.3);
    const nDays = Math.max(1, s.days.length);
    const perDay = (w) => { const lo = Math.floor(w / nDays), hi = Math.ceil(w / nDays); return lo === hi ? String(lo) : (lo || 1) + '–' + hi; };
    const hoursNeeded = Math.ceil(appsWeek * 0.5 + outWeek * 0.15);
    const lastApply = new Date(target.getTime() - 35 * 864e5);
    let note = 'Roles in your top lane take about 5 weeks from application to offer, so plan to send your last applications by ' + fmt(lastApply) + '.';
    if (hoursNeeded > s.hours) note = 'This pace needs about ' + hoursNeeded + ' hours a week, more than you have. A later date or a flexible one would ease it.';

    return {
      dates, customSel, customUnsel: !customSel,
      customLabel: customSel ? 'By ' + fmt(new Date(s.custom)) : 'Pick a date',
      calOpen: s.calOpen, toggleCal: () => this.setState({ calOpen: !s.calOpen }),
      monthLabel: MONL[m] + ' ' + y, cells,
      prevMonth: () => { if (!atMin) shift(-1); }, nextMonth: () => shift(1),
      prevDisabled: atMin, prevOp: atMin ? '0.4' : '1',
      hours: [5, 10, 20, 30].map((h) => ({ label: h === 30 ? '30+ hrs' : h + ' hrs', sel: s.hours === h, unsel: s.hours !== h, pick: () => this.setState({ hours: h }) })),
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => {
        const on = s.days.indexOf(x) >= 0;
        return { label: x, sel: on, unsel: !on, toggle: () => this.setState({ days: on ? s.days.filter((z) => z !== x) : s.days.concat(x) }) };
      }),
      weeks, dateLabel: fmt(target),
      appsWeek, outWeek, appsDay: perDay(appsWeek), outDay: perDay(outWeek), note,
      flexible: s.flexible, toggleFlex: () => this.setState({ flexible: !s.flexible })
    };
  }

  render() {
    const vm = this.renderVals();
    return (<>
<style>{"\nbody{margin:0}\na{color:#7A3E6E}a:hover{color:#5E2A54}\nbutton:disabled{cursor:default}\n"}</style>
<div style={{ minHeight: "100vh", background: "#F1F0F4", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
<header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 56px" }}>
<div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "30px", letterSpacing: "-0.5px" }}>
{"aligned"}
</div>
{" "}
<div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", color: "#665D63" }}>
<span>
{"Step 6 of 6"}
</span>
{" "}
<div style={{ display: "flex", gap: "6px" }} aria-hidden="true">
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#7A3E6E" }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#7A3E6E" }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#7A3E6E" }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#7A3E6E" }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#7A3E6E" }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#7A3E6E" }} />
</div>
</div>
</header>
{" "}
<main style={{ flex: "1", width: "100%", maxWidth: "1240px", margin: "0 auto", padding: "8px 24px 40px", boxSizing: "border-box", display: "flex", flexWrap: "wrap", gap: "32px", alignItems: "flex-start" }}>
<div style={{ flex: "1 1 560px", display: "flex", flexDirection: "column", gap: "24px" }}>
<h1 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "56px", lineHeight: "1.02", letterSpacing: "-1px" }}>
{"Let's make a plan."}
</h1>
{" "}
<section style={{ position: "relative", zIndex: "2", background: "#FFFFFF", borderRadius: "28px", padding: "32px", boxShadow: "0 1px 2px rgba(42,32,40,0.06), 0 12px 32px rgba(42,32,40,0.07)", display: "flex", flexDirection: "column", gap: "18px" }}>
<h2 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "36px", lineHeight: "1.05" }}>
{"I'd like an offer by…"}
</h2>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-start" }}>
{(vm.dates || []).map((d, d$i0) => (<React.Fragment key={d$i0}>
{(d.sel) ? (<>
<button type="button" onClick={d.pick} aria-pressed="true" style={{ height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px solid #D9C24E", background: "#FCEFA8", color: "#4A3B00", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
{d.label}
</button>
</>) : null}
{" "}
{(d.unsel) ? (<>
<button type="button" onClick={d.pick} aria-pressed="false" style={{ height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", color: "#2A2028", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
{d.label}
</button>
</>) : null}
</React.Fragment>))}
{" "}
<div style={{ position: "relative" }}>
{(vm.customSel) ? (<>
<button type="button" onClick={vm.toggleCal} aria-expanded={vm.calOpen} aria-haspopup="dialog" style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px solid #D9C24E", background: "#FCEFA8", color: "#4A3B00", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
<rect x="3" y="5" width="18" height="16" rx="2" />
<path d="M3 10h18M8 3v4M16 3v4" />
</svg>
{vm.customLabel}{" "}
</button>
</>) : null}
{" "}
{(vm.customUnsel) ? (<>
<button type="button" onClick={vm.toggleCal} aria-expanded={vm.calOpen} aria-haspopup="dialog" style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px dashed #C9C0A8", background: "transparent", color: "#4D444B", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4D444B" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
<rect x="3" y="5" width="18" height="16" rx="2" />
<path d="M3 10h18M8 3v4M16 3v4" />
</svg>
{"Pick a date "}
</button>
</>) : null}
{" "}
{(vm.calOpen) ? (<>
<div role="dialog" aria-label="Choose a date" style={{ position: "absolute", top: "52px", left: "0", width: "320px", background: "#FFFFFF", borderRadius: "20px", padding: "18px", boxShadow: "0 2px 4px rgba(42,32,40,0.08), 0 20px 48px rgba(42,32,40,0.18)", display: "flex", flexDirection: "column", gap: "12px" }}>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
<button type="button" onClick={vm.prevMonth} aria-label="Previous month" disabled={vm.prevDisabled} style={{ width: "40px", height: "40px", borderRadius: "20px", border: "none", background: "#FFFDF5", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: vm.prevOp }}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2A2028" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
<path d="m15 18-6-6 6-6" />
</svg>
</button>
{" "}
<div style={{ fontWeight: "600", fontSize: "15px" }}>
{vm.monthLabel}
</div>
{" "}
<button type="button" onClick={vm.nextMonth} aria-label="Next month" style={{ width: "40px", height: "40px", borderRadius: "20px", border: "none", background: "#FFFDF5", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2A2028" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
<path d="m9 18 6-6-6-6" />
</svg>
</button>
</div>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "2px", textAlign: "center", fontSize: "12px", color: "#665D63" }} aria-hidden="true">
<span>
{"S"}
</span>
<span>
{"M"}
</span>
<span>
{"T"}
</span>
<span>
{"W"}
</span>
<span>
{"T"}
</span>
<span>
{"F"}
</span>
<span>
{"S"}
</span>
</div>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "2px" }}>
{(vm.cells || []).map((c, c$i1) => (<React.Fragment key={c$i1}>
{(c.empty) ? (<>
<span />
</>) : null}
{" "}
{(c.past) ? (<>
<button type="button" disabled={true} style={{ height: "40px", borderRadius: "20px", border: "none", background: "transparent", font: "400 14px Inter, sans-serif", color: "#C9C0A8" }}>
{c.d}
</button>
</>) : null}
{" "}
{(c.sel) ? (<>
<button type="button" onClick={c.pick} aria-pressed="true" aria-label={c.aria} style={{ height: "40px", borderRadius: "20px", border: "none", background: "#7A3E6E", font: "600 14px Inter, sans-serif", color: "#FFFFFF", cursor: "pointer" }}>
{c.d}
</button>
</>) : null}
{" "}
{(c.open) ? (<>
<button type="button" onClick={c.pick} aria-label={c.aria} style={{ height: "40px", borderRadius: "20px", border: "none", background: "transparent", font: "500 14px Inter, sans-serif", color: "#2A2028", cursor: "pointer" }}>
{c.d}
</button>
</>) : null}
</React.Fragment>))}
</div>
</div>
</>) : null}
</div>
</div>
{" "}
<label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "15px", color: "#3D343B", cursor: "pointer" }}>
<input type="checkbox" checked={vm.flexible} onChange={vm.toggleFlex} style={{ width: "18px", height: "18px", accentColor: "#7A3E6E", margin: "0" }} />
{"This date is flexible "}
</label>
</section>
{" "}
<section style={{ background: "#FFFFFF", borderRadius: "28px", padding: "32px", boxShadow: "0 1px 2px rgba(42,32,40,0.06), 0 12px 32px rgba(42,32,40,0.07)", display: "flex", flexDirection: "column", gap: "18px" }}>
<h2 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "36px", lineHeight: "1.05" }}>
{"Each week I can give this…"}
</h2>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
{(vm.hours || []).map((h, h$i2) => (<React.Fragment key={h$i2}>
{(h.sel) ? (<>
<button type="button" onClick={h.pick} aria-pressed="true" style={{ height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px solid #D9C24E", background: "#FCEFA8", color: "#4A3B00", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
{h.label}
</button>
</>) : null}
{" "}
{(h.unsel) ? (<>
<button type="button" onClick={h.pick} aria-pressed="false" style={{ height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", color: "#2A2028", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
{h.label}
</button>
</>) : null}
</React.Fragment>))}
</div>
</section>
{" "}
<section style={{ background: "#FFFFFF", borderRadius: "28px", padding: "32px", boxShadow: "0 1px 2px rgba(42,32,40,0.06), 0 12px 32px rgba(42,32,40,0.07)", display: "flex", flexDirection: "column", gap: "18px" }}>
<h2 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "36px", lineHeight: "1.05" }}>
{"Send my to-do list…"}
</h2>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }} role="group" aria-label="Days">
{(vm.days || []).map((d, d$i3) => (<React.Fragment key={d$i3}>
{(d.sel) ? (<>
<button type="button" onClick={d.toggle} aria-pressed="true" style={{ width: "52px", height: "44px", borderRadius: "22px", border: "1.5px solid #D9C24E", background: "#FCEFA8", color: "#4A3B00", font: "500 14px Inter, sans-serif", cursor: "pointer" }}>
{d.label}
</button>
</>) : null}
{" "}
{(d.unsel) ? (<>
<button type="button" onClick={d.toggle} aria-pressed="false" style={{ width: "52px", height: "44px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", color: "#2A2028", font: "500 14px Inter, sans-serif", cursor: "pointer" }}>
{d.label}
</button>
</>) : null}
</React.Fragment>))}
</div>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", fontSize: "15px", color: "#3D343B" }}>
<label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
{"at "}
<select style={{ height: "44px", padding: "0 14px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", font: "500 15px Inter, sans-serif", color: "#2A2028" }}>
<option>
{"7:30 am"}
</option>
<option selected={true}>
{"8:30 am"}
</option>
<option>
{"12:00 pm"}
</option>
<option>
{"6:00 pm"}
</option>
</select>
</label>
{" "}
<span>
{"by email to jordan.reyes@gmail.com"}
</span>
</div>
</section>
</div>
{" "}
<aside style={{ flex: "1 1 380px", maxWidth: "460px", display: "flex", flexDirection: "column", gap: "16px", paddingTop: "92px" }} aria-label="Plan preview">
<div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Your plan"}
</div>
{" "}
<div style={{ background: "#7A3E6E", color: "#FFFFFF", borderRadius: "28px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
<div>
<div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "40px", lineHeight: "1" }}>
{vm.weeks}{" weeks"}
</div>
{" "}
<div style={{ marginTop: "6px", color: "#F0DDEA", fontSize: "15px" }}>
{"to an offer by "}{vm.dateLabel}
</div>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
<div style={{ background: "#6A3460", borderRadius: "16px", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
<div style={{ fontSize: "15px" }}>
{"Applications"}
</div>
{" "}
<div style={{ display: "flex", gap: "20px", textAlign: "right" }}>
<div>
<div style={{ fontSize: "26px", fontWeight: "600" }}>
{vm.appsWeek}
</div>
<div style={{ fontSize: "12px", color: "#F0DDEA" }}>
{"per week"}
</div>
</div>
{" "}
<div>
<div style={{ fontSize: "26px", fontWeight: "600" }}>
{vm.appsDay}
</div>
<div style={{ fontSize: "12px", color: "#F0DDEA" }}>
{"per to-do day"}
</div>
</div>
</div>
</div>
{" "}
<div style={{ background: "#6A3460", borderRadius: "16px", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
<div style={{ fontSize: "15px" }}>
{"Outreach messages"}
</div>
{" "}
<div style={{ display: "flex", gap: "20px", textAlign: "right" }}>
<div>
<div style={{ fontSize: "26px", fontWeight: "600" }}>
{vm.outWeek}
</div>
<div style={{ fontSize: "12px", color: "#F0DDEA" }}>
{"per week"}
</div>
</div>
{" "}
<div>
<div style={{ fontSize: "26px", fontWeight: "600" }}>
{vm.outDay}
</div>
<div style={{ fontSize: "12px", color: "#F0DDEA" }}>
{"per to-do day"}
</div>
</div>
</div>
</div>
</div>
{" "}
<p style={{ margin: "0", fontSize: "14px", lineHeight: "1.55", color: "#F0DDEA" }}>
{vm.note}
</p>
</div>
{" "}
<p style={{ margin: "0", fontSize: "14px", color: "#665D63" }}>
{"You can change any of this later from your profile."}
</p>
</aside>
</main>
{" "}
<footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "24px", padding: "8px 56px 40px" }}>
<Link href="/onboarding/market" style={{ fontSize: "15px", fontWeight: "500" }}>
{"Back"}
</Link>
{" "}
<Link href="/matching" style={{ display: "inline-flex", alignItems: "center", height: "52px", padding: "0 32px", borderRadius: "26px", background: "#7A3E6E", color: "#FFFFFF", fontSize: "16px", fontWeight: "600", textDecoration: "none" }}>
{"Find my matches"}
</Link>
</footer>
</div>
</>);
  }
}
