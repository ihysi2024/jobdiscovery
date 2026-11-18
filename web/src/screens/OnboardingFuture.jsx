"use client";
/* Ported from the mockup (Onboarding-Future.dc.html). Layout and behavior match the design. */
import React from "react";
import { useRouter } from "next/navigation";
import { loadPreferences, savePreferences } from "@/lib/answers";

// Where people see themselves, in words that fit any field.
const HORIZONS = [
  ['y1', '1 year', ['Doing good work in my field', 'Settled into a new field', 'Studying or training', 'Still exploring']],
  ['y3', '3 years', ['Leading projects or people', 'The go-to expert on something', 'Working in a different industry', 'Still exploring']],
  ['y5', '5 years', ['Managing a team', 'A senior expert in my field', 'Running my own thing', 'Still exploring']],
  ['y10', '10 years', ['In a leadership role', 'Known in my field', 'Owning a business', 'Working less']]
];
import Link from "next/link";

class OnboardingFuture extends React.Component {
  constructor(props) {
    super(props);
    this.state = { dreams: [], dreamOwn: '', h: {}, own: {}, ownOpen: {}, skip: { d: false, h: false }, saving: false, saveError: '' };
  }
  async componentDidMount() {
    try {
      const { row } = await loadPreferences();
      const f = row && row.future;
      if (!f) return;
      const h = {}, own = {}, ownOpen = {};
      HORIZONS.forEach(([id, , opts]) => {
        const v = (f.horizons || {})[id];
        if (!v) return;
        const i = opts.indexOf(v);
        if (i >= 0) h[id] = i; else { own[id] = v; ownOpen[id] = true; }
      });
      this.setState({ dreams: f.dreams || [], dreamOwn: f.own || '', h, own, ownOpen });
    } catch (e) {
      this.setState({ saveError: e.message });
    }
  }
  async next() {
    const s = this.state;
    this.setState({ saving: true, saveError: '' });
    try {
      const horizons = {};
      HORIZONS.forEach(([id, , opts]) => {
        const own = (s.own[id] || '').trim();
        if (own) horizons[id] = own; else if (s.h[id] !== undefined) horizons[id] = opts[s.h[id]];
      });
      const future = {
        dreams: s.skip.d ? null : s.dreams, own: s.skip.d ? null : s.dreamOwn.trim() || null,
        horizons: s.skip.h ? null : horizons
      };
      await savePreferences({ future: future.dreams === null && future.horizons === null ? null : future });
      this.props.router.push('/onboarding/picks');
    } catch (e) {
      this.setState({ saving: false, saveError: e.message });
    }
  }
  renderVals() {
    const s = this.state;
    const dList = [['build', 'Build or make things'], ['research', 'Learn or research'], ['teach', 'Teach or mentor'], ['care', 'Care for people'], ['create', 'Make art, music or writing'], ['outdoors', 'Be outside'], ['hands', 'Work with my hands'], ['own', 'Start something of my own'], ['community', 'Help my community'], ['travel', 'Travel'], ['family', 'Spend time with family']];
    const dreams = dList.map(([id, label]) => {
      const on = s.dreams.indexOf(id) >= 0;
      return { label, sel: on, unsel: !on, toggle: () => this.setState({ dreams: on ? s.dreams.filter((x) => x !== id) : s.dreams.concat(id) }) };
    });
    const hDefs = HORIZONS;
    const horizons = hDefs.map(([id, label, opts]) => ({
      label,
      opts: opts.map((o, i) => {
        const sel = s.h[id] === i && !(s.own[id] || '').trim();
        return { label: o, sel, unsel: !sel, pick: () => this.setState({ h: Object.assign({}, s.h, { [id]: i }), own: Object.assign({}, s.own, { [id]: '' }) }) };
      }),
      ownOpen: !!s.ownOpen[id], ownClosed: !s.ownOpen[id], own: s.own[id] || '', ownSel: !!(s.own[id] || '').trim(),
      openOwn: () => this.setState({ ownOpen: Object.assign({}, s.ownOpen, { [id]: true }) }),
      setOwn: (ev) => this.setState({ own: Object.assign({}, s.own, { [id]: ev.target.value }) })
    }));
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
    return { dreams, horizons, dreamOwn: s.dreamOwn, setDreamOwn: (ev) => this.setState({ dreamOwn: ev.target.value }), sd: sec('d'), sh: sec('h'), saving: s.saving, saveError: s.saveError, next: () => this.next() };
  }

  render() {
    const vm = this.renderVals();
    return (<>
<style>{"\nbody{margin:0}\na{color:#7A3E6E}a:hover{color:#5E2A54}\ninput::placeholder{color:#7A7078}\n"}</style>
<div style={{ minHeight: "100vh", background: "#F1F0F4", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
<header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 56px" }}>
<div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "30px", letterSpacing: "-0.5px" }}>
{"aligned"}
</div>
{" "}
<div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", color: "#665D63" }}>
<span>
{"Step 3 of 6"}
</span>
{" "}
<div style={{ display: "flex", gap: "6px" }} aria-hidden="true">
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#7A3E6E" }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#7A3E6E" }} />
{" "}
<div style={{ width: "28px", height: "4px", borderRadius: "2px", background: "#7A3E6E" }} />
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
<main style={{ flex: "1", width: "100%", maxWidth: "1040px", margin: "0 auto", padding: "16px 24px 48px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "28px" }}>
<section style={{ background: vm.sd.bg, borderRadius: "28px", padding: "36px", boxShadow: vm.sd.shadow, display: "flex", flexDirection: "column", gap: "20px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
<div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Just for fun, but it helps"}
</div>
{" "}
<button type="button" onClick={vm.sd.toggle} aria-pressed={vm.sd.skipped} style={{ height: "36px", padding: "0 14px", borderRadius: "18px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", font: "500 14px Inter, sans-serif", color: "#4D444B", cursor: "pointer" }}>
{vm.sd.label}
</button>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "20px", opacity: vm.sd.op, pointerEvents: vm.sd.pe }} aria-hidden={vm.sd.skipped}>
<h2 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "44px", lineHeight: "1.05" }}>
{"If I didn't have to work, I'd…"}
</h2>
{" "}
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
{(vm.dreams || []).map((d, d$i0) => (<React.Fragment key={d$i0}>
{(d.sel) ? (<>
<button type="button" onClick={d.toggle} aria-pressed="true" style={{ height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px solid #D9C24E", background: "#FCEFA8", color: "#4A3B00", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
{d.label}
</button>
</>) : null}
{" "}
{(d.unsel) ? (<>
<button type="button" onClick={d.toggle} aria-pressed="false" style={{ height: "44px", padding: "0 18px", borderRadius: "22px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", color: "#2A2028", font: "500 15px Inter, sans-serif", cursor: "pointer" }}>
{d.label}
</button>
</>) : null}
</React.Fragment>))}
</div>
{" "}
<label htmlFor="dream-own" style={{ fontSize: "14px", color: "#4D444B" }}>
{"Or in your own words"}
</label>
{" "}
<input id="dream-own" type="text" value={vm.dreamOwn} onChange={vm.setDreamOwn} placeholder="Open a tiny bakery that only sells croissants" style={{ height: "52px", padding: "0 20px", borderRadius: "26px", border: "1.5px solid #EFE9D8", background: "#FFFEFA", font: "400 16px Inter, sans-serif", color: "#2A2028", outline: "none" }} />
</div>
{" "}
{(vm.sd.skipped) ? (<>
<p style={{ margin: "0", fontSize: "14px", color: "#665D63" }}>
{"Skipped. We won't use this for matching."}
</p>
</>) : null}
</section>
{" "}
<section style={{ background: vm.sh.bg, borderRadius: "28px", padding: "36px", boxShadow: vm.sh.shadow, display: "flex", flexDirection: "column", gap: "24px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
<div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"One pick per horizon"}
</div>
{" "}
<button type="button" onClick={vm.sh.toggle} aria-pressed={vm.sh.skipped} style={{ height: "36px", padding: "0 14px", borderRadius: "18px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", font: "500 14px Inter, sans-serif", color: "#4D444B", cursor: "pointer" }}>
{vm.sh.label}
</button>
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "24px", opacity: vm.sh.op, pointerEvents: vm.sh.pe }} aria-hidden={vm.sh.skipped}>
<h2 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "44px", lineHeight: "1.05" }}>
{"Where I see myself in…"}
</h2>
{" "}
<div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px" }}>
{(vm.horizons || []).map((h, h$i1) => (<React.Fragment key={h$i1}>
<div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "20px", borderRadius: "20px", background: "#FFFDF5" }}>
<div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "34px", lineHeight: "1" }}>
{h.label}
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
{(h.opts || []).map((o, o$i2) => (<React.Fragment key={o$i2}>
{(o.sel) ? (<>
<button type="button" onClick={o.pick} aria-pressed="true" style={{ minHeight: "44px", padding: "10px 14px", textAlign: "left", borderRadius: "14px", border: "1.5px solid #D9C24E", background: "#FCEFA8", color: "#4A3B00", font: "500 14px/1.3 Inter, sans-serif", cursor: "pointer" }}>
{o.label}
</button>
</>) : null}
{" "}
{(o.unsel) ? (<>
<button type="button" onClick={o.pick} aria-pressed="false" style={{ minHeight: "44px", padding: "10px 14px", textAlign: "left", borderRadius: "14px", border: "1.5px solid #EFE9D8", background: "#FFFFFF", color: "#2A2028", font: "500 14px/1.3 Inter, sans-serif", cursor: "pointer" }}>
{o.label}
</button>
</>) : null}
</React.Fragment>))}
{" "}
{(h.ownClosed) ? (<button type="button" onClick={h.openOwn} style={{ minHeight: "44px", padding: "10px 14px", textAlign: "left", borderRadius: "14px", border: "1.5px dashed #C9C0A8", background: "transparent", color: "#4D444B", font: "500 14px Inter, sans-serif", cursor: "pointer" }}>
{"+ Something else"}
</button>) : (<input type="text" value={h.own} onChange={h.setOwn} autoFocus placeholder="In your own words" aria-label={"Where I see myself in " + h.label} style={{ minHeight: "44px", padding: "10px 14px", borderRadius: "14px", border: h.ownSel ? "1.5px solid #D9C24E" : "1.5px solid #EFE9D8", background: h.ownSel ? "#FCEFA8" : "#FFFFFF", color: "#2A2028", font: "500 14px Inter, sans-serif", boxSizing: "border-box", width: "100%" }} />)}
</div>
</div>
</React.Fragment>))}
</div>
</div>
{" "}
{(vm.sh.skipped) ? (<>
<p style={{ margin: "0", fontSize: "14px", color: "#665D63" }}>
{"Skipped. We won't use this for matching."}
</p>
</>) : null}
</section>
</main>
{" "}
<footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "24px", padding: "8px 56px 40px" }}>
<Link href="/onboarding/priorities" style={{ fontSize: "15px", fontWeight: "500" }}>
{"Back"}
</Link>
{" "}
{(vm.saveError) ? (<span role="alert" style={{ color: "#8A2A2A", fontSize: "14px" }}>
{vm.saveError}
</span>) : null}
<button type="button" onClick={vm.next} disabled={vm.saving} style={{ display: "inline-flex", alignItems: "center", height: "52px", padding: "0 32px", borderRadius: "26px", background: "#7A3E6E", color: "#FFFFFF", fontSize: "16px", fontWeight: "600", textDecoration: "none" , border: "none", font: "600 16px Inter, sans-serif", cursor: vm.saving ? "progress" : "pointer", opacity: vm.saving ? 0.7 : 1 }}>
{vm.saving ? "Saving…" : "Continue"}
</button>
</footer>
</div>
</>);
  }
}

export default function OnboardingFuturePage(props) {
  const router = useRouter();
  return <OnboardingFuture {...props} router={router} />;
}
