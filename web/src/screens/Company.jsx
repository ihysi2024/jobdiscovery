"use client";
/* Ported from the mockup (Company.dc.html). Layout and behavior match the design. */
import React from "react";
import Link from "next/link";

// Shown until we collect company data (headcount, funding, tenure): name and open roles.
function CompanyBasic({ company }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F1F0F4", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif", fontSize: "14px" }}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "32px", padding: "16px 40px", borderBottom: "1px solid #E6DED0", background: "#FFFFFF" }}>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "26px", letterSpacing: "-0.5px" }}>aligned</div>
        <nav style={{ display: "flex", gap: "24px", fontWeight: "500" }} aria-label="Main">
          <Link href="/jobs" style={{ textDecoration: "none", color: "#2A2028", padding: "6px 0" }}>Jobs</Link>
          <Link href="/my-jobs" style={{ textDecoration: "none", color: "#665D63", padding: "6px 0" }}>My jobs</Link>
        </nav>
      </header>
      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 40px 72px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "14px", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "20px", color: "#4D444B" }}>{company.mono}</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 600, letterSpacing: "-0.5px" }}>{company.name}</h1>
            <p style={{ margin: "6px 0 0", color: "#665D63" }}>Company details like size, funding and tenure are coming soon.</p>
          </div>
        </div>
        <section style={{ background: "#FFFFFF", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 600 }}>
            {company.openRoles.length} open {company.openRoles.length === 1 ? "role" : "roles"} in New York
          </h2>
          {company.openRoles.map((r) => (
            <Link key={r.id} href={"/jobs/" + encodeURIComponent(r.id)} style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "12px 0", borderTop: "1px solid #EFE9D8", textDecoration: "none", color: "#2A2028" }}>
              <span style={{ fontWeight: 500 }}>{r.title}</span>
              <span style={{ color: "#665D63" }}>{r.loc}</span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}

export default class Company extends React.Component {
  renderVals() {
    const data = [['Q4 ’24', 300], ['Q1', 318], ['Q2', 335], ['Q3', 350], ['Q4 ’25', 356], ['Q1', 381], ['Q2', 402], ['Q3', 420]];
    const hc = data.map(([l, v], i) => ({ l, v, h: Math.round(v / 420 * 160) + 'px', c: i === data.length - 1 ? '#7A3E6E' : '#D9B6CF' }));
    return { hc };
  }

  render() {
    const c = this.props.company;
    if (!c.stats) return <CompanyBasic company={c} />;
    const vm = this.renderVals();
    return (<>
<style>{"\nbody{margin:0}\na{color:#7A3E6E}a:hover{color:#5E2A54}\n"}</style>
<div style={{ minHeight: "100vh", background: "#F1F0F4", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif", fontSize: "14px" }}>
<header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "32px", padding: "16px 40px", borderBottom: "1px solid #EFE9D8" }}>
<div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "26px", letterSpacing: "-0.5px" }}>
{"aligned"}
</div>
{" "}
<nav style={{ display: "flex", gap: "24px", fontWeight: "500" }} aria-label="Main">
<Link href="/jobs" style={{ textDecoration: "none", color: "#665D63", padding: "6px 0" }}>
{"Jobs"}
</Link>
{" "}
<Link href="/my-jobs" style={{ textDecoration: "none", color: "#665D63", padding: "6px 0" }}>
{"My jobs"}
</Link>
</nav>
</header>
{" "}
<div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 40px 72px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "24px" }}>
<Link href="/jobs/sample" style={{ color: "#665D63", textDecoration: "none", fontWeight: "500" }}>
{"← Back to the role"}
</Link>
{" "}
<section style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "24px" }}>
<div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
<div style={{ width: "64px", height: "64px", borderRadius: "14px", background: "#FFFFFF", border: "1px solid #EFE9D8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "20px", color: "#4D444B" }}>
{"PB"}
</div>
{" "}
<div>
<h1 style={{ margin: "0", fontSize: "28px", fontWeight: "600", letterSpacing: "-0.5px" }}>
{"Parallax Bio"}
</h1>
{" "}
<div style={{ marginTop: "4px", fontSize: "15px", color: "#665D63" }}>
{"AI pathology · Biotech · New York, NY · Founded 2019 · Private"}
</div>
</div>
</div>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
<a href="#" style={{ display: "inline-flex", alignItems: "center", height: "40px", padding: "0 16px", borderRadius: "10px", border: "1px solid #E6DED0", background: "#FFFFFF", color: "#2A2028", fontWeight: "500", textDecoration: "none" }}>
{"Glassdoor ↗"}
</a>
{" "}
<a href="#" style={{ display: "inline-flex", alignItems: "center", height: "40px", padding: "0 16px", borderRadius: "10px", border: "1px solid #E6DED0", background: "#FFFFFF", color: "#2A2028", fontWeight: "500", textDecoration: "none" }}>
{"Levels.fyi ↗"}
</a>
{" "}
<a href="#" style={{ display: "inline-flex", alignItems: "center", height: "40px", padding: "0 16px", borderRadius: "10px", border: "1px solid #E6DED0", background: "#FFFFFF", color: "#2A2028", fontWeight: "500", textDecoration: "none" }}>
{"Website ↗"}
</a>
</div>
</section>
{" "}
<section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px" }} aria-label="Key numbers">
<div style={{ background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
<div style={{ color: "#665D63", fontWeight: "500" }}>
{"Employees"}
</div>
{" "}
<div style={{ fontSize: "32px", fontWeight: "600", letterSpacing: "-0.5px" }}>
{"420"}
</div>
{" "}
<div style={{ color: "#1E6B45", fontSize: "13px", fontWeight: "500" }}>
{"+20% in the last 12 months"}
</div>
</div>
{" "}
<div style={{ background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
<div style={{ color: "#665D63", fontWeight: "500" }}>
{"Valuation"}
</div>
{" "}
<div style={{ fontSize: "32px", fontWeight: "600", letterSpacing: "-0.5px" }}>
{"$1.2B"}
</div>
{" "}
<div style={{ color: "#665D63", fontSize: "13px" }}>
{"Series C · $140M raised Mar 2026"}
</div>
</div>
{" "}
<div style={{ background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
<div style={{ color: "#665D63", fontWeight: "500" }}>
{"Average tenure"}
</div>
{" "}
<div style={{ fontSize: "32px", fontWeight: "600", letterSpacing: "-0.5px" }}>
{"2.6 yrs"}
</div>
{" "}
<div style={{ color: "#665D63", fontSize: "13px" }}>
{"Similar companies: 2.2 yrs"}
</div>
</div>
{" "}
<div style={{ background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "14px", padding: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
<div style={{ color: "#665D63", fontWeight: "500" }}>
{"Avg promotion cycle"}
</div>
{" "}
<div style={{ fontSize: "32px", fontWeight: "600", letterSpacing: "-0.5px" }}>
{"20 mo"}
</div>
{" "}
<div style={{ color: "#665D63", fontSize: "13px" }}>
{"Engineering · from 31 reports"}
</div>
</div>
</section>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
<section style={{ background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
<div>
<h2 style={{ margin: "0", fontSize: "16px", fontWeight: "600" }}>
{"Employee age distribution"}
</h2>
{" "}
<p style={{ margin: "4px 0 0", color: "#665D63" }}>
{"Estimated from graduation years on public profiles"}
</p>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "12px" }} role="img" aria-label="Age distribution: 22 to 24, 9 percent; 25 to 34, 52 percent; 35 to 44, 26 percent; 45 to 54, 10 percent; 55 plus, 3 percent">
<div style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", alignItems: "center", gap: "12px" }}>
<span style={{ color: "#665D63" }}>
{"22–24"}
</span>
<div style={{ height: "20px", background: "#F3EEE0", borderRadius: "4px" }}>
<div style={{ width: "17%", height: "100%", background: "#8E5383", borderRadius: "4px" }} />
</div>
<span style={{ fontWeight: "500", textAlign: "right" }}>
{"9%"}
</span>
</div>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", alignItems: "center", gap: "12px" }}>
<span style={{ color: "#665D63" }}>
{"25–34"}
</span>
<div style={{ height: "20px", background: "#F3EEE0", borderRadius: "4px" }}>
<div style={{ width: "100%", height: "100%", background: "#8E5383", borderRadius: "4px" }} />
</div>
<span style={{ fontWeight: "500", textAlign: "right" }}>
{"52%"}
</span>
</div>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", alignItems: "center", gap: "12px" }}>
<span style={{ color: "#665D63" }}>
{"35–44"}
</span>
<div style={{ height: "20px", background: "#F3EEE0", borderRadius: "4px" }}>
<div style={{ width: "50%", height: "100%", background: "#8E5383", borderRadius: "4px" }} />
</div>
<span style={{ fontWeight: "500", textAlign: "right" }}>
{"26%"}
</span>
</div>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", alignItems: "center", gap: "12px" }}>
<span style={{ color: "#665D63" }}>
{"45–54"}
</span>
<div style={{ height: "20px", background: "#F3EEE0", borderRadius: "4px" }}>
<div style={{ width: "19%", height: "100%", background: "#8E5383", borderRadius: "4px" }} />
</div>
<span style={{ fontWeight: "500", textAlign: "right" }}>
{"10%"}
</span>
</div>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", alignItems: "center", gap: "12px" }}>
<span style={{ color: "#665D63" }}>
{"55+"}
</span>
<div style={{ height: "20px", background: "#F3EEE0", borderRadius: "4px" }}>
<div style={{ width: "6%", height: "100%", background: "#8E5383", borderRadius: "4px" }} />
</div>
<span style={{ fontWeight: "500", textAlign: "right" }}>
{"3%"}
</span>
</div>
</div>
</section>
{" "}
<section style={{ background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
<div>
<h2 style={{ margin: "0", fontSize: "16px", fontWeight: "600" }}>
{"Headcount"}
</h2>
{" "}
<p style={{ margin: "4px 0 0", color: "#665D63" }}>
{"Last 8 quarters"}
</p>
</div>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: "10px", alignItems: "end", height: "200px" }} role="img" aria-label="Headcount grew from 300 to 420 over eight quarters">
{(vm.hc || []).map((q, q$i0) => (<React.Fragment key={q$i0}>
<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: "6px", height: "100%" }}>
<span style={{ fontSize: "12px", fontWeight: "500", color: "#4D444B" }}>
{q.v}
</span>
{" "}
<div style={{ width: "100%", height: q.h, background: q.c, borderRadius: "4px 4px 0 0" }} />
</div>
</React.Fragment>))}
</div>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: "10px", marginTop: "-12px" }}>
{(vm.hc || []).map((q, q$i1) => (<React.Fragment key={q$i1}>
<span style={{ textAlign: "center", fontSize: "12px", color: "#665D63" }}>
{q.l}
</span>
</React.Fragment>))}
</div>
</section>
</div>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
<section style={{ background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
<h2 style={{ margin: "0", fontSize: "16px", fontWeight: "600" }}>
{"Where people go next"}
</h2>
{" "}
<p style={{ margin: "0", color: "#665D63" }}>
{"Most common next step for engineers who left in the last 2 years"}
</p>
{" "}
<div style={{ display: "flex", flexDirection: "column" }}>
<div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #F3EEE0" }}>
<span>
{"Senior role at a larger biotech"}
</span>
<span style={{ fontWeight: "500" }}>
{"38%"}
</span>
</div>
{" "}
<div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #F3EEE0" }}>
<span>
{"Big tech ML team"}
</span>
<span style={{ fontWeight: "500" }}>
{"27%"}
</span>
</div>
{" "}
<div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #F3EEE0" }}>
<span>
{"Founded a company"}
</span>
<span style={{ fontWeight: "500" }}>
{"14%"}
</span>
</div>
{" "}
<div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
<span>
{"Grad school"}
</span>
<span style={{ fontWeight: "500" }}>
{"9%"}
</span>
</div>
</div>
</section>
{" "}
<section style={{ background: "#FFFFFF", border: "1px solid #EFE9D8", borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
<h2 style={{ margin: "0", fontSize: "16px", fontWeight: "600" }}>
{"Open roles that match you"}
</h2>
{" "}
<Link href="/jobs" style={{ fontWeight: "500" }}>
{"All 11 →"}
</Link>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column" }}>
<Link href="/jobs/sample" style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "12px 0", borderBottom: "1px solid #F3EEE0", textDecoration: "none", color: "#2A2028" }}>
<span style={{ fontWeight: "500" }}>
{"Machine Learning Engineer, Imaging"}
</span>
<span style={{ color: "#665D63" }}>
{"NYC · Hybrid"}
</span>
</Link>
{" "}
<Link href="/jobs/sample" style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "12px 0", borderBottom: "1px solid #F3EEE0", textDecoration: "none", color: "#2A2028" }}>
<span style={{ fontWeight: "500" }}>
{"ML Platform Engineer"}
</span>
<span style={{ color: "#665D63" }}>
{"NYC · Hybrid"}
</span>
</Link>
{" "}
<Link href="/jobs/sample" style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "12px 0", borderBottom: "1px solid #F3EEE0", textDecoration: "none", color: "#2A2028" }}>
<span style={{ fontWeight: "500" }}>
{"Software Engineer, Viewer"}
</span>
<span style={{ color: "#665D63" }}>
{"Remote"}
</span>
</Link>
{" "}
<Link href="/jobs/sample" style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "12px 0", textDecoration: "none", color: "#2A2028" }}>
<span style={{ fontWeight: "500" }}>
{"Research Scientist, Foundation Models"}
</span>
<span style={{ color: "#665D63" }}>
{"NYC · Onsite"}
</span>
</Link>
</div>
</section>
</div>
{" "}
<p style={{ margin: "0", color: "#665D63", fontSize: "13px", lineHeight: "1.6" }}>
{"Sources: headcount, tenure and age come from public profiles; funding from public filings and press; promotion cycle and interview data from candidate and employee reports. Updated weekly."}
</p>
</div>
</div>
</>);
  }
}
