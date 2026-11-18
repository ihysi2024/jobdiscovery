"use client";
/* Ported from the mockup (Onboarding-Market.dc.html). Layout and behavior match the design. */
import React from "react";
import Link from "next/link";

export default class OnboardingMarket extends React.Component {
  constructor(props) {
    super(props);
    this.state = { rank: { imaging: '1st', applied: '2nd', platform: '3rd' } };
  }
  renderVals() {
    const s = this.state;
    const defs = [
      { id: 'imaging', tag: 'Strongest background match', role: 'ML Engineer, Medical Imaging', openings: '84', trend: '↑ 12%', trendColor: '#1E6B45', pay: '$160–200k', applicants: '~120', tth: '5 weeks',
        take: 'Steady demand and a small pool of people who have actually worked with pathology or radiology images. Your internship work is directly relevant here.',
        have: ['PyTorch', 'Computer vision'], gap: ['MLOps', 'DICOM'] },
      { id: 'applied', tag: 'Higher pay, longer search', role: 'Applied Scientist, Health AI', openings: '46', trend: '↑ 4%', trendColor: '#1E6B45', pay: '$185–235k', applicants: '~210', tth: '7 weeks',
        take: 'More research-flavored work and the best pay of the three. Many teams look for publications, so your lab research would be worth putting front and center.',
        have: ['Python', 'Research'], gap: ['Publications', 'LLMs'] },
      { id: 'platform', tag: 'Most openings', role: 'Software Engineer, Health Data', openings: '212', trend: '→ flat', trendColor: '#665D63', pay: '$145–185k', applicants: '~90', tth: '4 weeks',
        take: 'The widest set of options and the quickest processes. It is a step away from ML, but many of these teams sit right next to ML groups you could move into later.',
        have: ['TypeScript', 'APIs'], gap: ['Spark', 'HIPAA'] }
    ];
    const lanes = defs.map((d) => Object.assign({}, d, {
      ranks: ['1st', '2nd', '3rd', 'Skip'].map((label) => ({
        label, sel: s.rank[d.id] === label, unsel: s.rank[d.id] !== label,
        pick: () => {
          const next = Object.assign({}, s.rank);
          if (label !== 'Skip') Object.keys(next).forEach((k) => { if (next[k] === label) next[k] = s.rank[d.id]; });
          next[d.id] = label;
          this.setState({ rank: next });
        }
      }))
    }));
    const IND = [['all', 'All industries'], ['bio', 'Biotech'], ['health', 'Health tech'], ['pharma', 'Pharma'], ['devices', 'Medical devices'], ['ai', 'AI / ML'], ['fin', 'Fintech']];
    const indTrend = { all: '↑ 4%', bio: '↑ 3%', health: '↑ 6%', pharma: '↓ 2%', devices: '↑ 1%', ai: '↑ 12%', fin: '↓ 1%' };
    const payAdj = { all: 0, bio: -5, health: 0, pharma: 0, devices: -5, ai: 10, fin: 15 };
    const R = [
      ['ml', 'ML Engineer', 520, 9, 160, 210, 140, 'Strong', { bio: .18, health: .2, pharma: .08, devices: .06, ai: .3, fin: .18 }],
      ['cv', 'Computer Vision Engineer', 140, 6, 165, 215, 110, 'Strong', { bio: .2, health: .25, devices: .2, ai: .3, fin: .05 }],
      ['bioinf', 'Bioinformatics Scientist', 120, 3, 120, 165, 70, 'Strong', { bio: .55, pharma: .35, health: .1 }],
      ['as', 'Applied / Research Scientist', 260, 4, 180, 240, 210, 'Good', { bio: .2, health: .2, pharma: .2, ai: .35, fin: .05 }],
      ['mlops', 'ML Platform / MLOps Engineer', 190, 14, 165, 210, 90, 'Good', { bio: .1, health: .15, pharma: .05, ai: .45, fin: .25 }],
      ['swe', 'Software Engineer, Backend', 1450, 2, 150, 200, 160, 'Good', { bio: .06, health: .14, pharma: .04, devices: .04, ai: .3, fin: .42 }],
      ['de', 'Data Engineer', 480, 5, 145, 190, 120, 'Good', { bio: .08, health: .17, pharma: .1, devices: .05, ai: .2, fin: .4 }],
      ['ds', 'Data Scientist', 610, -3, 140, 185, 180, 'Good', { bio: .1, health: .2, pharma: .15, devices: .05, ai: .1, fin: .4 }],
      ['fas', 'Field Applications Scientist', 60, 7, 120, 160, 45, 'New direction', { bio: .6, devices: .3, pharma: .1 }],
      ['se', 'Solutions Engineer', 210, 8, 140, 185, 85, 'New direction', { bio: .1, health: .25, devices: .05, ai: .35, fin: .25 }],
      ['pm', 'Technical Product Manager', 340, 1, 160, 210, 230, 'New direction', { bio: .1, health: .25, pharma: .05, devices: .05, ai: .3, fin: .25 }],
      ['proc', 'Bioprocess / Process Engineer', 90, -2, 105, 140, 60, 'New direction', { bio: .6, pharma: .3, devices: .1 }]
    ];
    const ind = s.ind || 'all';
    const fitColor = { 'Strong': '#7A3E6E', 'Good': '#B47FA6', 'New direction': '#D9C24E' };
    const added = s.added || ['cv'];
    const rows = R.map(([id, name, total, tr, lo, hi, apps, fit, w]) => {
      const n = ind === 'all' ? total : Math.round(total * (w[ind] || 0));
      const on = added.indexOf(id) >= 0;
      return {
        id, name, n, openings: n.toLocaleString('en-US'),
        trend: (tr > 0 ? '↑ ' : tr < 0 ? '↓ ' : '→ ') + Math.abs(tr) + '%',
        trendColor: tr > 0 ? '#1E6B45' : tr < 0 ? '#8A2D2D' : '#665D63',
        pay: '$' + (lo + payAdj[ind]) + '–' + (hi + payAdj[ind]) + 'k',
        applicants: '~' + apps, fit, fitColor: fitColor[fit],
        added: on, notAdded: !on,
        toggle: () => this.setState({ added: on ? added.filter((x) => x !== id) : added.concat(id) })
      };
    }).filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
    const indTotals = IND.map(([k]) => k === 'all' ? R.reduce((t, r) => t + r[2], 0) : Math.round(R.reduce((t, r) => t + r[2] * (r[8][k] || 0), 0)));
    const maxInd = Math.max.apply(null, indTotals.slice(1));
    const industries = IND.map(([k, label], i) => ({
      label, openings: indTotals[i].toLocaleString('en-US'), trend: indTrend[k],
      trendColor: indTrend[k].indexOf('↑') === 0 ? '#1E6B45' : '#8A2D2D',
      w: k === 'all' ? '100%' : Math.round(indTotals[i] / maxInd * 100) + '%',
      sel: ind === k, unsel: ind !== k, pick: () => this.setState({ ind: k })
    }));
    const skipped = Object.keys(s.rank).filter((k) => s.rank[k] === 'Skip').length;
    return {
      lanes, rows, industries,
      tableTitle: (ind === 'all' ? 'All industries' : IND.find((x) => x[0] === ind)[1]) + ' · ' + rows.length + ' role types',
      laneSummary: (3 - skipped) + ' recommended' + (added.length ? ' + ' + added.length + ' added' : '')
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
{"Step 5 of 6"}
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
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#EFE9D8" }} />
</div>
</div>
</header>
{" "}
<main style={{ flex: "1", width: "100%", maxWidth: "1240px", margin: "0 auto", padding: "8px 24px 40px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "28px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
<h1 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "56px", lineHeight: "1.02", letterSpacing: "-1px" }}>
{"Here's what the market looks like for you."}
</h1>
{" "}
<div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Our top three picks"}
</div>
{" "}
<p style={{ margin: "0", fontSize: "18px", lineHeight: "1.55", color: "#4D444B" }}>
{"Based on your background, your answers and the roles you liked, these three directions make the most sense right now. Rank them however you like. Your ranking decides what you see first."}
</p>
</div>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "20px" }}>
{(vm.lanes || []).map((l, l$i0) => (<React.Fragment key={l$i0}>
<article style={{ background: "#FFFFFF", borderRadius: "28px", padding: "28px", boxShadow: "0 1px 2px rgba(42,32,40,0.06), 0 12px 32px rgba(42,32,40,0.07)", display: "flex", flexDirection: "column", gap: "18px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
<span style={{ alignSelf: "flex-start", padding: "5px 12px", borderRadius: "999px", background: "#FFFDF5", fontSize: "12px", fontWeight: "600", color: "#4D444B" }}>
{l.tag}
</span>
{" "}
<h2 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "32px", lineHeight: "1.08" }}>
{l.role}
</h2>
</div>
{" "}
<p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#3D343B" }}>
{l.take}
</p>
{" "}
<dl style={{ margin: "0", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px 16px" }}>
<div>
<dt style={{ fontSize: "12px", color: "#665D63" }}>
{"NYC openings"}
</dt>
<dd style={{ margin: "2px 0 0", fontSize: "17px", fontWeight: "600" }}>
{l.openings}{" "}
<span style={{ fontSize: "13px", fontWeight: "500", color: l.trendColor }}>
{l.trend}
</span>
</dd>
</div>
{" "}
<div>
<dt style={{ fontSize: "12px", color: "#665D63" }}>
{"Typical pay"}
</dt>
<dd style={{ margin: "2px 0 0", fontSize: "17px", fontWeight: "600" }}>
{l.pay}
</dd>
</div>
{" "}
<div>
<dt style={{ fontSize: "12px", color: "#665D63" }}>
{"Applicants per role"}
</dt>
<dd style={{ margin: "2px 0 0", fontSize: "17px", fontWeight: "600" }}>
{l.applicants}
</dd>
</div>
{" "}
<div>
<dt style={{ fontSize: "12px", color: "#665D63" }}>
{"Time to hire"}
</dt>
<dd style={{ margin: "2px 0 0", fontSize: "17px", fontWeight: "600" }}>
{l.tth}
</dd>
</div>
</dl>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
<div style={{ fontSize: "12px", color: "#665D63" }}>
{"Most-asked skills"}
</div>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
{(l.have || []).map((k, k$i1) => (<React.Fragment key={k$i1}>
<span style={{ padding: "4px 10px", borderRadius: "999px", background: "#F3E6EF", color: "#5E2A54", fontSize: "12px", fontWeight: "500" }}>
{"✓ "}{k}
</span>
</React.Fragment>))}
{" "}
{(l.gap || []).map((k, k$i2) => (<React.Fragment key={k$i2}>
<span style={{ padding: "4px 10px", borderRadius: "999px", background: "#FFFDF5", color: "#4D444B", fontSize: "12px", fontWeight: "500" }}>
{k}
</span>
</React.Fragment>))}
</div>
</div>
{" "}
<div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingTop: "16px", borderTop: "1px solid #F3EFE2" }}>
<div style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase", color: "#665D63" }}>
{"Your ranking"}
</div>
{" "}
<div style={{ display: "flex", gap: "6px" }} role="group" aria-label={`Rank ${l.role}`}>
{(l.ranks || []).map((r, r$i3) => (<React.Fragment key={r$i3}>
{(r.sel) ? (<>
<button type="button" onClick={r.pick} aria-pressed="true" style={{ flex: "1", height: "44px", borderRadius: "22px", border: "1.5px solid #D9C24E", background: "#FCEFA8", color: "#4A3B00", font: "500 14px Inter, sans-serif", cursor: "pointer" }}>
{r.label}
</button>
</>) : null}
{" "}
{(r.unsel) ? (<>
<button type="button" onClick={r.pick} aria-pressed="false" style={{ flex: "1", height: "44px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", color: "#2A2028", font: "500 14px Inter, sans-serif", cursor: "pointer" }}>
{r.label}
</button>
</>) : null}
</React.Fragment>))}
</div>
</div>
</article>
</React.Fragment>))}
</div>
{" "}
<section style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-start", padding: "24px 28px", borderRadius: "20px", background: "#F3E6EF" }}>
<div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "26px", flex: "0 0 auto", color: "#4A2141" }}>
{"Our take"}
</div>
{" "}
<p style={{ margin: "0", flex: "1 1 520px", fontSize: "16px", lineHeight: "1.6", color: "#2D242B" }}>
{"Medical imaging ML looks like where your background stands out most, since few applicants have hands-on oncology image work. If the higher pay of applied science appeals, it's worth keeping in the mix; more of those postings ask for a PhD or publications, so expect a longer search there. Either way, it's your call."}
</p>
</section>
{" "}
<section style={{ display: "flex", flexDirection: "column", gap: "20px", paddingTop: "24px" }}>
<div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "720px" }}>
<h2 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "44px", lineHeight: "1.05" }}>
{"The wider market"}
</h2>
{" "}
<p style={{ margin: "0", fontSize: "16px", lineHeight: "1.55", color: "#4D444B" }}>
{"Every role type in New York that your background could lead to, across the industries hiring for it. Add any of them to your lanes."}
</p>
</div>
{" "}
<div style={{ fontSize: "14px", color: "#4D444B" }}>
{"Your lanes: "}
<strong style={{ color: "#2A2028" }}>
{vm.laneSummary}
</strong>
</div>
</div>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-start" }}>
<aside style={{ flex: "1 1 260px", maxWidth: "300px", background: "#FFFFFF", borderRadius: "24px", padding: "24px", display: "flex", flexDirection: "column", gap: "6px" }} aria-label="Industries">
<h3 style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Openings by industry"}
</h3>
{" "}
{(vm.industries || []).map((n, n$i4) => (<React.Fragment key={n$i4}>
{(n.sel) ? (<>
<button type="button" onClick={n.pick} aria-pressed="true" style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", padding: "10px 12px", borderRadius: "12px", border: "none", background: "#F3E6EF", textAlign: "left", cursor: "pointer", font: "400 14px Inter, sans-serif", color: "#2A2028" }}>
<span style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
<span style={{ fontWeight: "600" }}>
{n.label}
</span>
<span>
{n.openings}{" "}
<span style={{ color: n.trendColor, fontSize: "12px", fontWeight: "500" }}>
{n.trend}
</span>
</span>
</span>
{" "}
<span style={{ display: "block", width: "100%", height: "6px", borderRadius: "3px", background: "#EBDCE6" }}>
<span style={{ display: "block", width: n.w, height: "100%", borderRadius: "3px", background: "#7A3E6E" }} />
</span>
</button>
</>) : null}
{" "}
{(n.unsel) ? (<>
<button type="button" onClick={n.pick} aria-pressed="false" style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", padding: "10px 12px", borderRadius: "12px", border: "none", background: "transparent", textAlign: "left", cursor: "pointer", font: "400 14px Inter, sans-serif", color: "#2A2028" }}>
<span style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
<span style={{ fontWeight: "500" }}>
{n.label}
</span>
<span>
{n.openings}{" "}
<span style={{ color: n.trendColor, fontSize: "12px", fontWeight: "500" }}>
{n.trend}
</span>
</span>
</span>
{" "}
<span style={{ display: "block", width: "100%", height: "6px", borderRadius: "3px", background: "#F3EFE2" }}>
<span style={{ display: "block", width: n.w, height: "100%", borderRadius: "3px", background: "#B47FA6" }} />
</span>
</button>
</>) : null}
</React.Fragment>))}
</aside>
{" "}
<div style={{ flex: "999 1 640px", minWidth: "0", background: "#FFFFFF", borderRadius: "24px", padding: "8px 8px 8px", overflowX: "auto" }}>
<table style={{ width: "100%", minWidth: "760px", borderCollapse: "collapse", fontSize: "14px" }}>
<caption style={{ textAlign: "left", padding: "16px 16px 8px", fontSize: "15px", fontWeight: "600" }}>
{vm.tableTitle}
</caption>
<thead>
<tr style={{ color: "#665D63", fontSize: "12px", textAlign: "left" }}>
<th scope="col" style={{ padding: "10px 16px", fontWeight: "600" }}>
{"Role type"}
</th>
<th scope="col" style={{ padding: "10px 12px", fontWeight: "600", textAlign: "right" }}>
{"NYC openings"}
</th>
<th scope="col" style={{ padding: "10px 12px", fontWeight: "600", textAlign: "right" }}>
{"90 days"}
</th>
<th scope="col" style={{ padding: "10px 12px", fontWeight: "600" }}>
{"Typical pay"}
</th>
<th scope="col" style={{ padding: "10px 12px", fontWeight: "600", textAlign: "right" }}>
{"Applicants / role"}
</th>
<th scope="col" style={{ padding: "10px 12px", fontWeight: "600" }}>
{"Fit with your background"}
</th>
<th scope="col" style={{ padding: "10px 16px" }}>
<span style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden" }}>
{"Lane"}
</span>
</th>
</tr>
</thead>
<tbody>
{(vm.rows || []).map((r, r$i5) => (<React.Fragment key={r$i5}>
<tr style={{ borderTop: "1px solid #F3EFE2" }}>
<th scope="row" style={{ padding: "12px 16px", textAlign: "left", fontWeight: "500" }}>
{r.name}
</th>
<td style={{ padding: "12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
{r.openings}
</td>
<td style={{ padding: "12px", textAlign: "right", color: r.trendColor, fontWeight: "500" }}>
{r.trend}
</td>
<td style={{ padding: "12px", whiteSpace: "nowrap" }}>
{r.pay}
</td>
<td style={{ padding: "12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
{r.applicants}
</td>
<td style={{ padding: "12px" }}>
<span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
<span style={{ width: "8px", height: "8px", borderRadius: "4px", background: r.fitColor }} aria-hidden="true" />
{r.fit}
</span>
</td>
<td style={{ padding: "8px 16px", textAlign: "right" }}>
{(r.added) ? (<>
<button type="button" onClick={r.toggle} aria-pressed="true" aria-label={`Remove ${r.name} from lanes`} style={{ height: "36px", padding: "0 14px", borderRadius: "18px", border: "1.5px solid #D9C24E", background: "#FCEFA8", color: "#4A3B00", font: "500 13px Inter, sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}>
{"Added ✓"}
</button>
</>) : null}
{" "}
{(r.notAdded) ? (<>
<button type="button" onClick={r.toggle} aria-pressed="false" aria-label={`Add ${r.name} to lanes`} style={{ height: "36px", padding: "0 14px", borderRadius: "18px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", color: "#2A2028", font: "500 13px Inter, sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}>
{"+ Add"}
</button>
</>) : null}
</td>
</tr>
</React.Fragment>))}
</tbody>
</table>
</div>
</div>
</section>
{" "}
<p style={{ margin: "0", fontSize: "13px", color: "#665D63" }}>
{"Openings, pay and time to hire from job postings in the last 90 days. Applicant counts from public posting data. Updated daily."}
</p>
</main>
{" "}
<footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "24px", padding: "8px 56px 40px" }}>
<Link href="/onboarding/picks" style={{ fontSize: "15px", fontWeight: "500" }}>
{"Back"}
</Link>
{" "}
<Link href="/onboarding/plan" style={{ display: "inline-flex", alignItems: "center", height: "52px", padding: "0 32px", borderRadius: "26px", background: "#7A3E6E", color: "#FFFFFF", fontSize: "16px", fontWeight: "600", textDecoration: "none" }}>
{"Continue"}
</Link>
</footer>
</div>
</>);
  }
}
