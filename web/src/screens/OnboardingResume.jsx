"use client";
/* Ported from the mockup (Main.dc.html). Layout and behavior match the design. */
import React from "react";
import { useRouter } from "next/navigation";
import { EMPTY_PROFILE, loadProfile, saveProfile, uploadResume } from "@/lib/profile";
import { extractText, kindOf } from "@/lib/resume/extract.mjs";
import { parseResume } from "@/lib/resume/parse.mjs";

class OnboardingResume extends React.Component {
  constructor(props) {
    super(props);
    // Starts empty: filled from the person's resume, their own typing, or what they saved before.
    this.state = { data: { ...EMPTY_PROFILE }, draft: null, status: 'loading', message: '', saving: false, saveError: '', dragging: false };
    this.onFile = this.onFile.bind(this);
  }
  async componentDidMount() {
    try {
      const { user, profile } = await loadProfile();
      if (profile) {
        this.setState({ data: { ...EMPTY_PROFILE, ...profile }, status: profile.resumeName ? 'done' : 'idle' });
      } else {
        const meta = (user && user.user_metadata) || {};
        this.setState({ data: { ...EMPTY_PROFILE, name: meta.full_name || meta.name || '' }, status: 'idle' });
      }
    } catch (e) {
      this.setState({ status: 'idle', saveError: e.message });
    }
  }
  clone(x) { return JSON.parse(JSON.stringify(x)); }
  autosave() {
    // Saved as soon as there's something worth keeping, not only on Continue.
    if (!this.state.data.name.trim()) return;
    saveProfile(this.state.data).catch((e) => this.setState({ saveError: e.message }));
  }
  async onFile(file) {
    if (!file) return;
    this.setState({ status: 'reading', message: '', dragging: false });
    try {
      const text = await extractText(file);
      const parsed = parseResume(text);
      const kind = kindOf(file);
      const prev = this.state.data;
      const data = {
        ...prev,
        name: prev.name || parsed.name,
        headline: parsed.headline || prev.headline,
        exp: parsed.experience.length ? parsed.experience : prev.exp,
        edu: parsed.education.length ? parsed.education : prev.edu,
        skills: parsed.skills.length ? parsed.skills : prev.skills,
        links: parsed.links.length ? parsed.links : prev.links,
        resumeName: file.name,
        resumeText: text.slice(0, 50000),
      };
      const found = parsed.experience.length + parsed.education.length + parsed.skills.length;
      this.setState({
        data, status: 'done',
        message: found ? 'Check what we picked up and fix anything we got wrong.' : "We read the file but couldn't pick out your experience. Add it with Edit details.",
      });
      try {
        const path = await uploadResume(file, kind);
        this.setState({ data: { ...this.state.data, resumePath: path } }, () => this.autosave());
      } catch (e) {
        this.setState({ message: e.message + " Your details are still filled in below." }, () => this.autosave());
      }
    } catch (e) {
      this.setState({ status: 'error', message: e.message });
    }
  }
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
    const words = (data.name || '').trim().split(/\s+/).filter(Boolean);
    const initials = words.length > 1 ? (words[0][0] + words[words.length - 1][0]).toUpperCase() : words.length ? words[0].slice(0, 2).toUpperCase() : '';
    const empty = !data.exp.length && !data.edu.length && !data.skills.length;
    return {
      accent: this.props.accent ?? '#7A3E6E',
      name: data.name || 'Your name', headline: data.headline, exp: data.exp, edu: data.edu, skills: data.skills,
      hasExp: data.exp.length > 0, hasEdu: data.edu.length > 0, hasSkills: data.skills.length > 0, empty, initials,
      status: s.status, reading: s.status === 'reading', idle: s.status === 'idle' || s.status === 'loading',
      done: s.status === 'done', failed: s.status === 'error', message: s.message, fileName: data.resumeName,
      dragging: s.dragging,
      onPick: (ev) => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; this.onFile(f); },
      onDragOver: (ev) => { ev.preventDefault(); if (!this.state.dragging) this.setState({ dragging: true }); },
      onDragLeave: () => this.setState({ dragging: false }),
      onDrop: (ev) => { ev.preventDefault(); this.onFile(ev.dataTransfer.files && ev.dataTransfer.files[0]); },
      editing: !!s.draft, d, dExp, dEdu,
      skillsText: (d.skills || []).join(', '),
      setSkills: (ev) => upd((n) => { n.skills = ev.target.value.split(',').map((x) => x.replace(/^\s+/, '')); }),
      openEdit: () => this.setState({ draft: this.clone(data) }),
      cancel: () => this.setState({ draft: null }),
      save: () => {
        const nd = this.clone(this.state.draft);
        nd.skills = nd.skills.map((x) => x.trim()).filter(Boolean);
        this.setState({ data: nd, draft: null, saveError: '' }, () => this.autosave());
      },
      setName: (ev) => upd((n) => { n.name = ev.target.value; }),
      setHeadline: (ev) => upd((n) => { n.headline = ev.target.value; }),
      addExp: () => upd((n) => { n.exp.push({ role: '', org: '', dates: '' }); }),
      addEdu: () => upd((n) => { n.edu.push({ degree: '', school: '', dates: '' }); }),
      saving: s.saving, saveError: s.saveError,
      next: async () => {
        if (!this.state.data.name.trim()) {
          this.setState({ saveError: 'Add your name to continue.', draft: this.clone(this.state.data) });
          return;
        }
        this.setState({ saving: true, saveError: '' });
        try {
          await saveProfile(this.state.data);
          this.props.router.push('/onboarding/priorities');
        } catch (e) {
          this.setState({ saving: false, saveError: e.message });
        }
      },
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
<label htmlFor="resume" onDragOver={vm.onDragOver} onDragLeave={vm.onDragLeave} onDrop={vm.onDrop} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "40px 24px", border: vm.dragging ? "1.5px solid #7A3E6E" : "1.5px dashed #C9C0A8", borderRadius: "24px", background: vm.dragging ? "#FBF5FA" : "#FFFEFA", cursor: vm.reading ? "progress" : "pointer", textAlign: "center" }}>
<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2A2028" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
<path d="M14 3v5h5" />
<path d="M12 17v-6" />
<path d="m9 14 3-3 3 3" />
</svg>
<span style={{ fontSize: "17px", fontWeight: "600" }}>
{vm.reading ? "Reading your resume…" : vm.done ? vm.fileName : "Drop your resume here"}
</span>
<span style={{ fontSize: "14px", color: "#665D63" }}>
{vm.done ? "Drop another file or click to replace it" : "PDF or Word (.docx), up to 10 MB · or click to choose"}
</span>
<input id="resume" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={vm.onPick} disabled={vm.reading} style={{ position: "absolute", width: "1px", height: "1px", opacity: "0" }} />
</label>
{(vm.message) ? (<p role={vm.failed ? "alert" : "status"} style={{ margin: "0", padding: "12px 16px", borderRadius: "12px", background: vm.failed ? "#FBEAEA" : "#FFF8D6", color: vm.failed ? "#8A2A2A" : "#4A2141", fontSize: "14px", lineHeight: "1.5" }}>
{vm.message}
</p>) : null}
{" "}
<div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#665D63", fontSize: "14px" }}>
<div style={{ flex: "1", height: "1px", background: "#EFE9D8" }} />
<span>
{"or"}
</span>
<div style={{ flex: "1", height: "1px", background: "#EFE9D8" }} />
</div>
{" "}
<button type="button" onClick={vm.openEdit} style={{ height: "52px", borderRadius: "26px", border: "1.5px solid #2A2028", background: "transparent", font: "600 16px Inter, sans-serif", color: "#2A2028", cursor: "pointer" }}>
{"Fill it in yourself"}
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
{vm.initials}
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
{(vm.hasExp) ? (<><div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
</div></>) : null}
{" "}
{(vm.hasEdu) ? (<><div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
</div></>) : null}
{" "}
{(vm.hasSkills) ? (<><div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
</div></>) : null}
{" "}
{(vm.empty) ? (<p style={{ margin: "0", fontSize: "15px", lineHeight: "1.6", color: "#665D63" }}>
{"Your experience, education and skills will show up here once you add a resume, or you can type them in."}
</p>) : null}
<button type="button" onClick={vm.openEdit} style={{ alignSelf: "flex-start", height: "44px", padding: "0 20px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", font: "600 14px Inter, sans-serif", color: "#2A2028", cursor: "pointer" }}>
{vm.empty ? "Add details" : "Edit details"}
</button>
</div>
</aside>
</main>
{" "}
<footer style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "24px", padding: "24px 56px 40px" }}>
{(vm.saveError) ? (<span role="alert" style={{ color: "#8A2A2A", fontSize: "14px" }}>
{vm.saveError}
</span>) : null}
<button type="button" onClick={vm.next} disabled={vm.saving || vm.reading} style={{ display: "inline-flex", alignItems: "center", height: "52px", padding: "0 32px", borderRadius: "26px", border: "none", background: vm.accent, color: "#FFFFFF", font: "600 16px Inter, sans-serif", cursor: vm.saving ? "progress" : "pointer", opacity: vm.saving || vm.reading ? 0.7 : 1 }}>
{vm.saving ? "Saving…" : "Continue"}
</button>
</footer>
{" "}
{(vm.editing) ? (<>
<div style={{ position: "absolute", inset: "0", background: "rgba(42,32,40,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "56px 24px", boxSizing: "border-box" }}>
<div role="dialog" aria-modal="true" aria-labelledby="edit-title" style={{ width: "100%", maxWidth: "640px", maxHeight: "calc(100vh - 112px)", overflowY: "auto", background: "#FFFFFF", borderRadius: "28px", boxShadow: "0 24px 64px rgba(42,32,40,0.25)", display: "flex", flexDirection: "column" }}>
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
<label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#4D444B" }}>
{"Skills, separated by commas"}
<textarea value={vm.skillsText} onChange={vm.setSkills} rows={3} placeholder="e.g. Excel, customer service, Spanish, Python" style={{ padding: "10px 14px", border: "1.5px solid #EFE9D8", borderRadius: "12px", font: "400 15px Inter, sans-serif", color: "#2A2028", resize: "vertical" }} />
</label>
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

export default function OnboardingResumePage(props) {
  const router = useRouter();
  return <OnboardingResume {...props} router={router} />;
}
