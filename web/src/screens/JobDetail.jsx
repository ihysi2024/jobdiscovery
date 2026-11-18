"use client";
/* Ported from the mockup (JobDetail.dc.html). Layout and behavior match the design. */
import React from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { likeJob, trackedPostingIds, unlikeJob } from "@/lib/tracker";

export default class JobDetail extends React.Component {
  constructor(props) {
    super(props);
    this.state = { showFull: false };
  }
  componentDidMount() {
    trackedPostingIds().then((ids) => this.setState({ liked: ids.has(this.props.job.id) })).catch(() => {});
  }
  renderVals() {
    const job = this.props.job;
    const showFull = this.state.showFull;
    const liked = !!this.state.liked;
    return {
      job, showFull, fullLabel: showFull ? 'Show less' : 'Read the full posting',
      toggleFull: () => this.setState({ showFull: !showFull }),
      liked, likeLabel: liked ? 'In My jobs' : 'Like',
      toggleLike: async () => {
        this.setState({ liked: !liked, likeError: '' });
        try {
          if (liked) await unlikeJob(job.id);
          else await likeJob({ postingId: job.id, title: job.title, company: job.company, url: job.url });
        } catch (e) {
          this.setState({ liked, likeError: e.message });
        }
      },
      likeError: this.state.likeError || '',
      metaLine: ' · ' + job.loc + ' · ' + job.postedLabel,
      hasPay: !!job.payLabel, hasCompanyLine: !!job.companyLine,
      hasWhy: job.whyParas.length > 0,
      hasAbout: !!job.aboutText || job.aboutBullets.length > 0,
      hasPosting: job.posting.length > 0,
      posting: job.posting,
      hasSteps: job.steps_.length > 0,
      hasTimeline: !!job.timeline,
      timelineNote: job.timelineSource ? ' from application to offer · ' + job.timelineSource : ' from application to offer',
      steps: job.steps_.map((x, i, arr) => Object.assign({}, x, { final: i === arr.length - 1, mid: i < arr.length - 1 })),
    };
  }

  render() {
    const vm = this.renderVals();
    return (<>
<style>{"\nbody{margin:0}\na{color:#7A3E6E}a:hover{color:#5E2A54}\n"}</style>
<div style={{ minHeight: "100vh", background: "#FFFDF5", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif", fontSize: "14px" }}>
<AppHeader active="jobs" />
{" "}
<div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 40px 72px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "28px" }}>
<Link href="/jobs" style={{ color: "#665D63", textDecoration: "none", fontWeight: "500" }}>
{"← All jobs"}
</Link>
{" "}
<section style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "24px", paddingBottom: "28px", borderBottom: "1px solid #EFE9D8" }}>
<div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
<div style={{ width: "64px", height: "64px", borderRadius: "14px", background: "#F7F2E4", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "20px", color: "#4D444B" }}>
{vm.job.mono}
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
<h1 style={{ margin: "0", fontSize: "28px", fontWeight: "600", letterSpacing: "-0.5px" }}>
{vm.job.title}
</h1>
{" "}
<div style={{ fontSize: "15px", color: "#665D63" }}>
<span style={{ color: "#2A2028", fontWeight: "500" }}>
{vm.job.company}
</span>
{vm.metaLine}
</div>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px", fontSize: "13px", fontWeight: "500" }}>
{(typeof vm.job.fit === "number") ? (<span title="How many of the things you told us this job lines up with" style={{ padding: "5px 10px", borderRadius: "6px", fontWeight: 600, background: vm.job.fit >= 75 ? "#7A3E6E" : vm.job.fit >= 50 ? "#F3E6EF" : "#FFFFFF", color: vm.job.fit >= 75 ? "#FFFFFF" : vm.job.fit >= 50 ? "#5E2A54" : "#665D63", border: vm.job.fit >= 50 ? "none" : "1px solid #EFE9D8" }}>
{vm.job.fit + "% match"}
</span>) : null}
{(vm.hasPay) ? (<span style={{ padding: "5px 10px", borderRadius: "6px", background: "#F7F2E4" }}>
{vm.job.payLabel}
</span>) : null}
{" "}
<span style={{ padding: "5px 10px", borderRadius: "6px", background: "#F7F2E4" }}>
{vm.job.levelLabel}
</span>
{" "}
{(vm.hasCompanyLine) ? (<span style={{ padding: "5px 10px", borderRadius: "6px", background: "#F7F2E4" }}>
{vm.job.companyLine}
</span>) : null}
</div>
</div>
</div>
{" "}
<div style={{ display: "flex", gap: "10px" }}>
<button type="button" onClick={vm.toggleLike} aria-pressed={vm.liked} style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "44px", padding: "0 22px", borderRadius: "10px", border: "none", background: "#7A3E6E", color: "#FFFFFF", font: "600 14px Inter, sans-serif", cursor: "pointer" }}>
<svg width="16" height="16" viewBox="0 0 24 24" fill={vm.liked ? "#FFFFFF" : "none"} stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
</svg>
{vm.likeLabel}
</button>
{(vm.likeError) ? (<span role="alert" style={{ color: "#8A2A2A", fontSize: "13px" }}>{vm.likeError}</span>) : null}
</div>
</section>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "48px", alignItems: "flex-start" }}>
<main style={{ flex: "999 1 560px", minWidth: "0", maxWidth: "820px", display: "flex", flexDirection: "column", gap: "40px" }}>
{(vm.hasWhy) ? (<section style={{ background: "#FBF5FA", borderRadius: "16px", padding: "28px 32px", display: "flex", flexDirection: "column", gap: "12px" }}>
<h2 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "30px", lineHeight: "1.1", color: "#4A2141" }}>
{"Why you might be interested"}
</h2>
{vm.job.whyParas.map((t, i) => (
<p key={i} style={{ margin: "0", fontSize: "16px", lineHeight: "1.65", color: "#2D242B" }}>
{t}
</p>))}
</section>) : null}
{" "}
<section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
<h2 style={{ margin: "0", fontSize: "18px", fontWeight: "600" }}>
{"About the role"}
</h2>
{" "}
<p style={{ margin: "0", fontSize: "15px", lineHeight: "1.65", color: "#4D444B" }}>
{vm.job.aboutText}
</p>
{" "}
{(vm.job.aboutBullets.length) ? (<ul style={{ margin: "0", paddingLeft: "20px", fontSize: "15px", lineHeight: "1.8", color: "#4D444B" }}>
{vm.job.aboutBullets.map((x, i) => (<li key={i}>
{x}
</li>))}
</ul>) : null}
{" "}
{(vm.showFull) ? (<>
<div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingTop: "8px" }}>
{(vm.posting || []).map((p, p$i0) => (<React.Fragment key={p$i0}>
<section style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
<h3 style={{ margin: "0", fontSize: "15px", fontWeight: "600" }}>
{p.h}
</h3>
{" "}
{(p.text) ? (<>
<p style={{ margin: "0", fontSize: "15px", lineHeight: "1.65", color: "#4D444B" }}>
{p.text}
</p>
</>) : null}
{" "}
{(p.items) ? (<>
<ul style={{ margin: "0", paddingLeft: "20px", fontSize: "15px", lineHeight: "1.8", color: "#4D444B" }}>
{(p.items || []).map((x, x$i1) => (<React.Fragment key={x$i1}>
<li>
{x}
</li>
</React.Fragment>))}
</ul>
</>) : null}
</section>
</React.Fragment>))}
</div>
</>) : null}
{" "}
{(vm.hasPosting) ? (<><button type="button" onClick={vm.toggleFull} aria-expanded={vm.showFull} style={{ alignSelf: "flex-start", height: "40px", padding: "0", border: "none", background: "transparent", font: "500 15px Inter, sans-serif", color: "#7A3E6E", cursor: "pointer" }}>
{vm.fullLabel}
</button></>) : null}
</section>
{" "}
{(vm.hasSteps) ? (<><section style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "24px", borderTop: "1px solid #EFE9D8" }}>
<div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
<h2 style={{ margin: "0", fontSize: "18px", fontWeight: "600" }}>
{"Interview process"}
</h2>
{" "}
{(vm.hasTimeline) ? (<span style={{ color: "#665D63" }}>
{"About "}
<strong style={{ color: "#2A2028", fontWeight: "600" }}>
{vm.job.timeline}
</strong>
{vm.timelineNote}
</span>) : null}
</div>
{" "}
<ol style={{ listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column" }}>
{(vm.steps || []).map((st, st$i2) => (<React.Fragment key={st$i2}>
<li style={{ display: "flex", gap: "16px" }}>
<div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "16px", flex: "none" }}>
{(st.final) ? (<>
<div style={{ width: "14px", height: "14px", marginTop: "3px", borderRadius: "7px", background: "#7A3E6E" }} />
</>) : null}
{" "}
{(st.mid) ? (<>
<div style={{ width: "14px", height: "14px", marginTop: "3px", borderRadius: "7px", border: "2px solid #7A3E6E", background: "#FFFFFF", boxSizing: "border-box" }} />
{" "}
<div style={{ flex: "1", width: "2px", background: "#E3CBDD", minHeight: "20px" }} />
</>) : null}
</div>
{" "}
<div style={{ flex: "1", paddingBottom: "18px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "4px 16px" }}>
<span style={{ fontSize: "15px", fontWeight: "600" }}>
{st.name}
</span>
{" "}
<span style={{ color: "#665D63" }}>
{st.meta}
</span>
</div>
</li>
</React.Fragment>))}
</ol>
</section></>) : null}
</main>
</div>
</div>
</div>
</>);
  }
}
