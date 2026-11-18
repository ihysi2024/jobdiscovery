"use client";
/* Ported from the mockup (DailyEmail.dc.html). Layout and behavior match the design. */
import React from "react";
import Link from "next/link";

export default class DailyEmailPreview extends React.Component {
  renderVals() { return {}; }

  render() {
    const vm = this.renderVals();
    return (<>
<style>{"\nbody{margin:0}\na{color:#7A3E6E}a:hover{color:#5E2A54}\n"}</style>
<div style={{ width: "680px", height: "1160px", boxSizing: "border-box", background: "#F1F0F4", fontFamily: "Inter, system-ui, sans-serif", color: "#2A2028", fontSize: "15px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
<div style={{ background: "#FFFFFF", borderRadius: "12px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", color: "#665D63" }}>
<div>
<strong style={{ color: "#2A2028", fontWeight: "600" }}>
{"aligned"}
</strong>
{" <today@aligned.example> · 8:30 AM"}
</div>
{" "}
<div style={{ fontSize: "16px", fontWeight: "600", color: "#2A2028" }}>
{"Today: 2 applications, 2 people to email (about 1 hour)"}
</div>
</div>
{" "}
<div style={{ background: "#FFFFFF", borderRadius: "12px", padding: "40px 44px", display: "flex", flexDirection: "column", gap: "28px", flex: "1" }}>
<div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "28px", letterSpacing: "-0.5px" }}>
{"aligned"}
</div>
{" "}
<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
<h1 style={{ margin: "0", fontFamily: "'Instrument Serif', serif", fontWeight: "400", fontSize: "40px", lineHeight: "1.05" }}>
{"Morning, Jordan."}
</h1>
{" "}
<p style={{ margin: "0", lineHeight: "1.6", color: "#4D444B" }}>
{"You're focused on Parallax Bio, so most of today is about them. You're at 3 of 6 applications this week, right on pace."}
</p>
</div>
{" "}
<section style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
<h2 style={{ margin: "0", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Apply"}
</h2>
{" "}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 18px", border: "1px solid #EFE9D8", borderRadius: "12px" }}>
<div>
<div style={{ fontWeight: "600" }}>
{"ML Engineer, Imaging"}
</div>
{" "}
<div style={{ marginTop: "2px", fontSize: "14px", color: "#665D63" }}>
{"Parallax Bio · your focus role · ~30 min"}
</div>
</div>
{" "}
<Link href="/my-jobs" style={{ flex: "none", display: "inline-flex", alignItems: "center", height: "40px", padding: "0 16px", borderRadius: "8px", background: "#7A3E6E", color: "#FFFFFF", fontSize: "14px", fontWeight: "600", textDecoration: "none" }}>
{"Apply"}
</Link>
</div>
{" "}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 18px", border: "1px solid #EFE9D8", borderRadius: "12px" }}>
<div>
<div style={{ fontWeight: "600" }}>
{"ML Engineer, Sequencing"}
</div>
{" "}
<div style={{ marginTop: "2px", fontSize: "14px", color: "#665D63" }}>
{"Northlight Genomics · backup · ~20 min"}
</div>
</div>
{" "}
<Link href="/my-jobs" style={{ flex: "none", display: "inline-flex", alignItems: "center", height: "40px", padding: "0 16px", borderRadius: "8px", background: "#7A3E6E", color: "#FFFFFF", fontSize: "14px", fontWeight: "600", textDecoration: "none" }}>
{"Apply"}
</Link>
</div>
</section>
{" "}
<section style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
<h2 style={{ margin: "0", fontSize: "12px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase", color: "#665D63" }}>
{"Reach out"}
</h2>
{" "}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 18px", border: "1px solid #EFE9D8", borderRadius: "12px" }}>
<div>
<div style={{ fontWeight: "600" }}>
{"Maya Okafor"}
</div>
{" "}
<div style={{ marginTop: "2px", fontSize: "14px", color: "#665D63" }}>
{"Head of ML, Imaging at Parallax · hiring manager"}
</div>
</div>
{" "}
<a href="mailto:maya.okafor@parallaxbio.com" style={{ flex: "none", display: "inline-flex", alignItems: "center", height: "40px", padding: "0 16px", borderRadius: "8px", border: "1px solid #E6DED0", color: "#2A2028", fontSize: "14px", fontWeight: "600", textDecoration: "none" }}>
{"Email"}
</a>
</div>
{" "}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", padding: "16px 18px", border: "1px solid #EFE9D8", borderRadius: "12px" }}>
<div>
<div style={{ fontWeight: "600" }}>
{"Sana Patel"}
</div>
{" "}
<div style={{ marginTop: "2px", fontSize: "14px", color: "#665D63" }}>
{"ML Engineer II at Parallax · in a similar role"}
</div>
</div>
{" "}
<a href="mailto:sana.patel@parallaxbio.com" style={{ flex: "none", display: "inline-flex", alignItems: "center", height: "40px", padding: "0 16px", borderRadius: "8px", border: "1px solid #E6DED0", color: "#2A2028", fontSize: "14px", fontWeight: "600", textDecoration: "none" }}>
{"Email"}
</a>
</div>
</section>
{" "}
<div style={{ marginTop: "auto", paddingTop: "24px", borderTop: "1px solid #EFE9D8", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "#665D63", lineHeight: "1.5" }}>
<div>
{"Applied somewhere? We'll see the confirmation email and check it off for you."}
</div>
{" "}
<div>
<Link href="/profile">
{"Change schedule"}
</Link>
{" · "}
<Link href="/profile">
{"Edit plan"}
</Link>
{" · "}
<a href="#">
{"Take today off"}
</a>
</div>
</div>
</div>
</div>
</>);
  }
}
