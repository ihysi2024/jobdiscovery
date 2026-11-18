"use client";
// End of onboarding: answers are saved and we show how many open jobs fit the
// person's directions. (Ranking against the whole profile comes later; this
// screen doesn't claim more than it does.)
import React from "react";
import Link from "next/link";
import { savePreferences } from "@/lib/answers";

const C = { plum: "#7A3E6E", plumDeep: "#4A2141", ink: "#2A2028", muted: "#665D63", line: "#EFE9D8", banana: "#FCEFA8" };
const serif = "'Instrument Serif', serif";

export default function Matching({ total, inLanes, lanes, href }) {
  const [step, setStep] = React.useState(0);
  const [saveError, setSaveError] = React.useState("");

  React.useEffect(() => {
    savePreferences({ onboarded_at: new Date().toISOString() }).catch((e) => setSaveError(e.message));
    const t = setInterval(() => setStep((n) => (n >= 3 ? n : n + 1)), 900);
    return () => clearInterval(t);
  }, []);

  const steps = [
    ["Saving your answers", "Profile, priorities and plan"],
    ["Checking New York postings", total != null ? `${total.toLocaleString("en-US")} open jobs` : "Open jobs in New York"],
    [lanes.length ? "Narrowing to your directions" : "No directions picked", lanes.length ? `${(inLanes ?? 0).toLocaleString("en-US")} jobs in ${lanes.length === 1 ? lanes[0] : lanes.length + " directions"}` : "You'll see everything; add directions from your profile any time"],
  ];
  const done = step >= 3;

  return (
    <div style={{ minHeight: "100vh", background: "#F3E8F0", color: C.ink, fontFamily: "Inter, system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "28px 56px" }}>
        <div style={{ fontFamily: serif, fontSize: "30px", letterSpacing: "-0.5px" }}>aligned</div>
      </header>
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ width: "100%", maxWidth: "560px", background: "#FFFFFF", borderRadius: "28px", padding: "40px", boxShadow: "0 12px 40px rgba(42,32,40,0.1)", display: "flex", flexDirection: "column", gap: "28px" }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: "44px", lineHeight: 1.05 }}>{done ? "You're all set." : "Setting things up"}</h1>
            <p style={{ margin: "10px 0 0", color: C.muted, lineHeight: 1.6 }}>
              {!done ? "One moment." : lanes.length ? "Your jobs are filtered to the directions you picked. You can change anything from your profile." : "You'll see every open job. Add directions from your profile any time to narrow it down."}
            </p>
          </div>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "16px" }}>
            {steps.map(([label, detail], i) => {
              const state = i < step ? "done" : i === step ? "active" : "todo";
              return (
                <li key={label} style={{ display: "flex", gap: "14px", alignItems: "flex-start", opacity: state === "todo" ? 0.4 : 1 }}>
                  <span aria-hidden="true" style={{ width: "24px", height: "24px", flex: "none", borderRadius: "12px", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: state === "done" ? C.plum : "#FFFFFF", border: state === "done" ? "none" : `2px solid ${state === "active" ? C.plum : C.line}`, color: "#FFFFFF", fontSize: "13px" }}>
                    {state === "done" ? "✓" : ""}
                  </span>
                  <span>
                    <span style={{ display: "block", fontWeight: 500 }}>{label}</span>
                    <span style={{ display: "block", color: C.muted, fontSize: "14px", marginTop: "2px" }}>{detail}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          {saveError ? <p role="alert" style={{ margin: 0, color: "#8A2A2A", fontSize: "14px" }}>{saveError}</p> : null}
          <Link href={href} aria-disabled={!done} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", height: "52px", padding: "0 32px", borderRadius: "26px",
            background: C.plum, color: "#FFFFFF", fontSize: "16px", fontWeight: 600, textDecoration: "none", opacity: done ? 1 : 0.5, pointerEvents: done ? "auto" : "none" }}>
            {lanes.length ? `See ${(inLanes ?? 0).toLocaleString("en-US")} jobs` : "See all jobs"}
          </Link>
        </div>
      </main>
    </div>
  );
}
