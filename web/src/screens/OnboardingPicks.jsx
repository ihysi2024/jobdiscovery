"use client";
/* Ported from the mockup (Onboarding-Swipe.dc.html). Layout and behavior match the design. */
import React from "react";
import Link from "next/link";

export default class OnboardingPicks extends React.Component {
  constructor(props) {
    super(props);
    this.state = { i: 1, liked: ['ML Engineer, Imaging · Parallax Bio'], passing: false, picked: [], custom: '' };
  }
  renderVals() {
    const s = this.state;
    const deck = [
      { mono: 'PB', title: 'ML Engineer, Imaging', company: 'Parallax Bio', loc: 'New York · Hybrid', pay: '$165–195k', stage: 'Series C', lane: 'ML · Health', wild: false,
        about: 'Parallax builds AI tools that help pathologists find cancer in tissue slides sooner. You will join a six-person imaging team that owns models from raw scanner data to the review tool pathologists use every day.',
        does: ['Build data pipelines for gigapixel whole-slide images', 'Train and evaluate detection and segmentation models in PyTorch', 'Work with staff pathologists to define labels and failure cases', 'Ship models into the clinical review product and monitor them'],
        wants: ['3+ years shipping ML or production software', 'Experience with medical or microscopy images', 'Strong Python and PyTorch', 'Comfort with cloud training infrastructure'] },
      { mono: 'OS', title: 'Field Applications Scientist', company: 'Onda Sequencing', loc: 'New York · 40% travel in the Northeast', pay: '$135–165k', stage: 'Public', lane: 'Customer-facing science', wild: true,
        about: 'Onda makes benchtop sequencers used by academic and pharma labs. Field application scientists are the technical bridge between customers and the product team: part scientist, part engineer, part teacher.',
        does: ['Install instruments and train lab teams on workflows', 'Troubleshoot runs, from sample prep to analysis software', 'Help customers set up data pipelines for their sequencing output', 'Bring field feedback back to product and engineering'],
        wants: ['Hands-on experience with sequencing or molecular biology', 'Comfort with Python and bioinformatics tools', 'Clear communication with scientists and engineers', 'Willingness to travel up to 40%'] },
      { mono: 'TH', title: 'Applied Scientist, Clinical NLP', company: 'Tessellate Health', loc: 'New York · Onsite', pay: '$180–220k', stage: 'Public', lane: 'Research', wild: false,
        about: 'Tessellate turns clinical notes into structured data for hospitals and payers. The applied science team researches new modeling approaches and hands proven ones to engineering.',
        does: ['Prototype language models for clinical information extraction', 'Design evaluations with clinicians and annotators', 'Write up results and contribute to publications', 'Partner with engineering to productionize models'],
        wants: ['Graduate degree or equivalent research experience', 'Publications or a strong research portfolio', 'Experience with modern NLP and LLMs', 'Interest in healthcare data'] },
      { mono: 'KL', title: 'Product Manager, Lab Automation', company: 'Kiln Labs', loc: 'New York · Hybrid', pay: '$160–190k', stage: 'Series B', lane: 'Product', wild: true,
        about: 'Kiln builds software that schedules and runs robotic lab equipment for biotech R&D teams. The PM for automation owns how scientists design and launch experiments in the product.',
        does: ['Spend time in customer labs to understand real workflows', 'Write specs and prioritize the roadmap with engineering', 'Run beta programs with early customers', 'Track adoption and decide what to build next'],
        wants: ['Background in lab science, engineering, or both', 'Experience working closely with software teams', 'Strong writing and prioritization', 'No prior PM title required'] },
      { mono: 'NG', title: 'ML Engineer, Sequencing', company: 'Northlight Genomics', loc: 'New York · Hybrid', pay: '$155–185k', stage: 'Series A', lane: 'ML · Biotech', wild: false,
        about: 'Northlight is a 40-person company building faster genomic analysis for rare disease diagnosis. ML engineers own models end to end, from instrument signal to production.',
        does: ['Build models that process raw sequencing signal', 'Own training, evaluation and deployment for your models', 'Work directly with wet-lab scientists on new assays', 'Help set ML practices for a growing team'],
        wants: ['Experience with ML on scientific or signal data', 'Familiarity with sequencing data is a plus', 'Strong Python and software fundamentals', 'Comfort with early-stage ambiguity'] },
      { mono: 'TF', title: 'Process Engineer, Tissue Printing', company: 'Trellis Fabrication', loc: 'New York · Onsite', pay: '$125–150k', stage: 'Series A', lane: 'Bioengineering', wild: true,
        about: 'Trellis 3D-prints living tissue for drug testing. Process engineers make printing reliable and repeatable as the company scales from research to production.',
        does: ['Develop and optimize bioprinting protocols', 'Characterize hydrogels and printed constructs', 'Build data tracking for print runs and quality checks', 'Write SOPs and train technicians'],
        wants: ['Degree in chemical, biomedical or materials engineering', 'Bioprinting or hydrogel experience', 'Scripting for data analysis (Python preferred)', 'Detail-oriented lab practice'] },
      { mono: 'CV', title: 'Software Engineer, Data Platform', company: 'Cellvue', loc: 'New York · Hybrid', pay: '$150–180k', stage: 'Series B', lane: 'Software · Biotech', wild: false,
        about: 'Cellvue makes microscopy analysis software for cell biology labs. The data platform team owns how images and results are stored, searched and shared across customer teams.',
        does: ['Build and scale services for large image datasets', 'Design APIs used by the analysis and ML teams', 'Improve reliability and cost of the data platform', 'Take part in a light, well-supported on-call rotation'],
        wants: ['3+ years of backend or data engineering', 'Experience with cloud storage and databases', 'TypeScript or Python', 'Interest in life sciences'] }
    ];
    const reasonList = ['Wrong industry', 'Pay too low', 'Too junior', 'Too senior', 'Commute or office days', 'Not the work I want', 'Company too big or too small'];
    const done = s.liked.length >= 3 || s.i >= deck.length;
    const card = deck[Math.min(s.i, deck.length - 1)];
    const canConfirm = s.picked.length > 0 || s.custom.trim().length > 0;
    const advance = (liked) => this.setState({ i: s.i + 1, liked: liked ? s.liked.concat(card.title + ' · ' + card.company) : s.liked, passing: false, picked: [], custom: '' });
    return {
      card, done, inProgress: !done,
      passing: s.passing, choosing: !s.passing,
      position: (s.i + 1) + ' of up to ' + deck.length,
      like: () => advance(true),
      startPass: () => this.setState({ passing: true }),
      cancelPass: () => this.setState({ passing: false, picked: [], custom: '' }),
      confirmPass: () => { if (canConfirm) advance(false); },
      canConfirm, cannotConfirm: !canConfirm,
      custom: s.custom,
      setCustom: (ev) => this.setState({ custom: ev.target.value }),
      reasons: reasonList.map((label) => {
        const on = s.picked.indexOf(label) >= 0;
        return { label, sel: on, unsel: !on, toggle: () => this.setState({ picked: on ? s.picked.filter((x) => x !== label) : s.picked.concat(label) }) };
      }),
      reset: () => this.setState({ i: 0, liked: [], passing: false, picked: [], custom: '' }),
      likedCount: s.liked.length, likedList: s.liked,
      dots: [0, 1, 2].map((n) => ({ on: n < s.liked.length, off: n >= s.liked.length }))
    };
  }

  render() {
    const vm = this.renderVals();
    return (<>
<style>{"\nbody{margin:0}\na{color:#7A3E6E}a:hover{color:#5E2A54}\ninput::placeholder{color:#7A7078}\nbutton:disabled{cursor:not-allowed}\n"}</style>
<div style={{ minHeight: "100vh", background: "#F3E8F0", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
<header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 56px" }}>
<div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "30px", letterSpacing: "-0.5px" }}>
{"aligned"}
</div>
{" "}
<div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", color: "#665D63" }}>
<span>
{"Step 4 of 6"}
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
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#EFE9D8" }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#EFE9D8" }} />
</div>
</div>
</header>
{" "}
<main style={{ flex: "1", width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "8px 24px 40px", boxSizing: "border-box", display: "flex", flexWrap: "wrap", gap: "56px", alignItems: "flex-start", justifyContent: "center" }}>
<div style={{ flex: "1 1 320px", maxWidth: "380px", display: "flex", flexDirection: "column", gap: "20px", paddingTop: "24px" }}>
<h1 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "56px", lineHeight: "1.02", letterSpacing: "-1px" }}>
{"A few roles to react to."}
</h1>
{" "}
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.55", color: "#4D444B" }}>
{"Some are close to what you've done, and a few are wild cards: roles next door to your experience that you might never have searched for. Tell us why when something isn't right. That's how we learn. We'll stop once we've found three you'd actually want."}
</p>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "20px", borderRadius: "20px", background: "#FFFEFA" }}>
<div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Good fits found"}
</div>
{" "}
<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
<div style={{ display: "flex", gap: "6px" }} aria-hidden="true">
{(vm.dots || []).map((d, d$i0) => (<React.Fragment key={d$i0}>
{(d.on) ? (<>
<div style={{ width: "36px", height: "8px", borderRadius: "4px", background: "#7A3E6E" }} />
</>) : null}
{" "}
{(d.off) ? (<>
<div style={{ width: "36px", height: "8px", borderRadius: "4px", background: "#EFE9D8" }} />
</>) : null}
</React.Fragment>))}
</div>
{" "}
<span style={{ fontSize: "15px", fontWeight: "500" }}>
{vm.likedCount}{" of 3"}
</span>
</div>
{" "}
{(vm.likedList || []).map((l, l$i1) => (<React.Fragment key={l$i1}>
<div style={{ fontSize: "14px", color: "#3D343B" }}>
{"♥ "}{l}
</div>
</React.Fragment>))}
</div>
</div>
{" "}
<div style={{ flex: "1 1 560px", maxWidth: "620px", display: "flex", flexDirection: "column", gap: "20px" }}>
{(vm.inProgress) ? (<>
<div style={{ position: "relative", paddingTop: "20px" }}>
<div style={{ position: "absolute", top: "0", left: "32px", right: "32px", height: "60px", borderRadius: "28px", background: "#EFEADB" }} aria-hidden="true" />
{" "}
<div style={{ position: "absolute", top: "10px", left: "16px", right: "16px", height: "60px", borderRadius: "28px", background: "#F5F1E6" }} aria-hidden="true" />
{" "}
<article style={{ position: "relative", background: "#FFFFFF", borderRadius: "28px", padding: "32px", boxShadow: "0 1px 2px rgba(42,32,40,0.06), 0 16px 40px rgba(42,32,40,0.10)", display: "flex", flexDirection: "column", gap: "20px" }}>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
<div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#FFFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "18px", color: "#3D343B" }}>
{vm.card.mono}
</div>
{" "}
<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
{(vm.card.wild) ? (<>
<span style={{ padding: "6px 12px", borderRadius: "999px", background: "#F3E6EF", color: "#5E2A54", fontSize: "12px", fontWeight: "600" }}>
{"Wild card"}
</span>
</>) : null}
{" "}
<span style={{ fontSize: "13px", color: "#665D63" }}>
{vm.position}
</span>
</div>
</div>
{" "}
<div>
<h2 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "38px", lineHeight: "1.05" }}>
{vm.card.title}
</h2>
{" "}
<div style={{ marginTop: "8px", fontSize: "15px", color: "#4D444B" }}>
{vm.card.company}{" · "}{vm.card.loc}
</div>
</div>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
<span style={{ padding: "6px 12px", borderRadius: "999px", background: "#FFFDF5", fontSize: "13px", fontWeight: "500" }}>
{vm.card.pay}
</span>
{" "}
<span style={{ padding: "6px 12px", borderRadius: "999px", background: "#FFFDF5", fontSize: "13px", fontWeight: "500" }}>
{vm.card.stage}
</span>
{" "}
<span style={{ padding: "6px 12px", borderRadius: "999px", background: "#FFFDF5", fontSize: "13px", fontWeight: "500" }}>
{vm.card.lane}
</span>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "18px", paddingTop: "20px", borderTop: "1px solid #F3EFE2", fontSize: "15px", lineHeight: "1.6", color: "#2F272D" }}>
<section style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
<h3 style={{ margin: "0", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"About the role"}
</h3>
{" "}
<p style={{ margin: "0" }}>
{vm.card.about}
</p>
</section>
{" "}
<section style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
<h3 style={{ margin: "0", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"What you'll do"}
</h3>
{" "}
<ul style={{ margin: "0", paddingLeft: "20px" }}>
{(vm.card.does || []).map((x, x$i2) => (<React.Fragment key={x$i2}>
<li>
{x}
</li>
</React.Fragment>))}
</ul>
</section>
{" "}
<section style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
<h3 style={{ margin: "0", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"What they're looking for"}
</h3>
{" "}
<ul style={{ margin: "0", paddingLeft: "20px" }}>
{(vm.card.wants || []).map((x, x$i3) => (<React.Fragment key={x$i3}>
<li>
{x}
</li>
</React.Fragment>))}
</ul>
</section>
</div>
</article>
</div>
{" "}
{(vm.choosing) ? (<>
<div style={{ display: "flex", justifyContent: "center", gap: "28px" }}>
<button type="button" onClick={vm.startPass} aria-label="Not for me" style={{ width: "72px", height: "72px", borderRadius: "36px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(42,32,40,0.08)" }}>
<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2A2028" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
<path d="M6 6l12 12M18 6 6 18" />
</svg>
</button>
{" "}
<button type="button" onClick={vm.like} aria-label="Interested" style={{ width: "72px", height: "72px", borderRadius: "36px", border: "none", background: "#7A3E6E", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(122,62,110,0.3)" }}>
<svg width="28" height="28" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
</svg>
</button>
</div>
</>) : null}
{" "}
{(vm.passing) ? (<>
<section style={{ background: "#FFFFFF", borderRadius: "24px", padding: "28px", boxShadow: "0 1px 2px rgba(42,32,40,0.06), 0 12px 32px rgba(42,32,40,0.07)", display: "flex", flexDirection: "column", gap: "16px" }} aria-labelledby="why-pass">
<h3 id="why-pass" style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "30px", lineHeight: "1.1" }}>
{"What's not right about it?"}
</h3>
{" "}
<p style={{ margin: "-8px 0 0", fontSize: "14px", color: "#665D63" }}>
{"Pick any that apply, or tell us in your own words."}
</p>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
{(vm.reasons || []).map((r, r$i4) => (<React.Fragment key={r$i4}>
{(r.sel) ? (<>
<button type="button" onClick={r.toggle} aria-pressed="true" style={{ height: "44px", padding: "0 16px", borderRadius: "22px", border: "1.5px solid #D9C24E", background: "#FCEFA8", color: "#4A3B00", font: "500 14px Inter, sans-serif", cursor: "pointer" }}>
{r.label}
</button>
</>) : null}
{" "}
{(r.unsel) ? (<>
<button type="button" onClick={r.toggle} aria-pressed="false" style={{ height: "44px", padding: "0 16px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", color: "#2A2028", font: "500 14px Inter, sans-serif", cursor: "pointer" }}>
{r.label}
</button>
</>) : null}
</React.Fragment>))}
</div>
{" "}
<label htmlFor="pass-other" style={{ fontSize: "14px", fontWeight: "500", color: "#4D444B" }}>
{"Something else"}
</label>
{" "}
<input id="pass-other" type="text" value={vm.custom} onChange={vm.setCustom} placeholder="e.g. I don't want to travel that much" style={{ height: "52px", padding: "0 20px", borderRadius: "26px", border: "1.5px solid #EFE9D8", background: "#FFFEFA", font: "400 16px Inter, sans-serif", color: "#2A2028", outline: "none" }} />
{" "}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", paddingTop: "4px" }}>
<button type="button" onClick={vm.cancelPass} style={{ height: "44px", padding: "0 4px", border: "none", background: "transparent", font: "500 15px Inter, sans-serif", color: "#7A3E6E", cursor: "pointer" }}>
{"Back to this role"}
</button>
{" "}
{(vm.canConfirm) ? (<>
<button type="button" onClick={vm.confirmPass} style={{ height: "48px", padding: "0 24px", borderRadius: "24px", border: "none", background: "#7A3E6E", font: "600 15px Inter, sans-serif", color: "#FFFFFF", cursor: "pointer" }}>
{"Pass on this role"}
</button>
</>) : null}
{" "}
{(vm.cannotConfirm) ? (<>
<button type="button" disabled={true} style={{ height: "48px", padding: "0 24px", borderRadius: "24px", border: "none", background: "#EFE9D8", font: "600 15px Inter, sans-serif", color: "#665D63" }}>
{"Add a reason to pass"}
</button>
</>) : null}
</div>
</section>
</>) : null}
</>) : null}
{" "}
{(vm.done) ? (<>
<div style={{ background: "#FFFFFF", borderRadius: "28px", padding: "40px", boxShadow: "0 1px 2px rgba(42,32,40,0.06), 0 16px 40px rgba(42,32,40,0.10)", display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px" }}>
<h2 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "44px", lineHeight: "1.05" }}>
{"That's a good read on you."}
</h2>
{" "}
<p style={{ margin: "0", fontSize: "16px", lineHeight: "1.6", color: "#4D444B" }}>
{"You leaned toward hands-on ML work in health, with a clear mission, at smaller companies. Next, here's how the market looks for roles like these."}
</p>
{" "}
<button type="button" onClick={vm.reset} style={{ alignSelf: "flex-start", height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", font: "500 14px Inter, sans-serif", color: "#2A2028", cursor: "pointer" }}>
{"Start over"}
</button>
</div>
</>) : null}
</div>
</main>
{" "}
<footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "24px", padding: "8px 56px 40px" }}>
<Link href="/onboarding/future" style={{ fontSize: "15px", fontWeight: "500" }}>
{"Back"}
</Link>
{" "}
<div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
<Link href="/onboarding/market" style={{ fontSize: "15px", color: "#665D63" }}>
{"Skip"}
</Link>
{" "}
<Link href="/onboarding/market" style={{ display: "inline-flex", alignItems: "center", height: "52px", padding: "0 32px", borderRadius: "26px", background: "#7A3E6E", color: "#FFFFFF", fontSize: "16px", fontWeight: "600", textDecoration: "none" }}>
{"Continue"}
</Link>
</div>
</footer>
</div>
</>);
  }
}
