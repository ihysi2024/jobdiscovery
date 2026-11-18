"use client";
// Landing page: what aligned is, and sign in with Google.
import React from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AUTH_ENABLED } from "@/lib/supabase/env";

const C = {
  plum: "#7A3E6E", plumDeep: "#4A2141", plumSoft: "#F3E6EF", ink: "#2A2028", muted: "#665D63",
  cream: "#FFFDF5", banana: "#FCEFA8", bananaSoft: "#FFF8D6", line: "#EFE9D8",
};
const serif = "'Instrument Serif', Georgia, serif";

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function GoogleButton({ next, large = false, onError }) {
  const [busy, setBusy] = React.useState(false);
  const signIn = async () => {
    if (!AUTH_ENABLED) {
      onError("Sign-in isn't set up on this copy of the site.");
      return;
    }
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setBusy(false);
      onError(error.message);
    }
    // On success the browser is already on its way to Google.
  };
  return (
    <button type="button" onClick={signIn} disabled={busy} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "12px",
      height: large ? "52px" : "40px", padding: large ? "0 28px" : "0 16px",
      background: "#FFFFFF", color: "#1F1F1F", border: "1px solid #D5CFC2", borderRadius: "999px",
      fontFamily: "inherit", fontSize: large ? "16px" : "14px", fontWeight: 500,
      cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1,
      boxShadow: large ? "0 1px 2px rgba(42,32,40,0.08)" : "none",
    }}>
      <GoogleG />
      {busy ? "Opening Google…" : "Continue with Google"}
    </button>
  );
}

const STEPS = [
  {
    n: "1",
    title: "Tell us what you're after",
    text: "Start from your resume, then pick what matters most and the trade-offs you'd make: more pay for a longer commute, a smaller team for more ownership.",
  },
  {
    n: "2",
    title: "See every opening, not just the ads",
    text: "We read the career pages of thousands of New York employers every day, in every field, so you see the roles that never make it to a job board.",
  },
  {
    n: "3",
    title: "Keep a plan you can stick to",
    text: "Like what's interesting, apply when you're ready, and track it all in one place. Pay ranges and interview steps are shown whenever the posting lists them.",
  },
];

export default function Landing({ count, next, error }) {
  const [err, setErr] = React.useState(error);
  const countLine = typeof count === "number" && count > 0
    ? `${count.toLocaleString("en-US")} open jobs in New York City right now, checked every day.`
    : "Open jobs in New York City, checked every day.";

  return (
    <div style={{ minHeight: "100vh", background: C.cream, color: C.ink, fontFamily: "Inter, system-ui, sans-serif", fontSize: "15px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ fontFamily: serif, fontSize: "30px", letterSpacing: "-0.5px", color: C.plumDeep }}>aligned</div>
        <GoogleButton next={next} onError={setErr} />
      </header>

      <main>
        <section style={{ maxWidth: "880px", margin: "0 auto", padding: "72px 40px 88px", textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
          <div style={{ display: "inline-block", padding: "6px 14px", borderRadius: "999px", background: C.banana,
            color: C.plumDeep, fontSize: "13px", fontWeight: 600, letterSpacing: "0.2px" }}>
            For job seekers in New York City
          </div>
          <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: "clamp(44px, 6.4vw, 76px)", lineHeight: 1.02,
            letterSpacing: "-1.5px", color: C.plumDeep }}>
            New York's open jobs, <em style={{ color: C.plum }}>sorted by what you actually want.</em>
          </h1>
          <p style={{ margin: 0, maxWidth: "620px", fontSize: "18px", lineHeight: 1.6, color: C.muted }}>
            aligned collects openings straight from employers' own career pages and ranks them against your
            priorities, so you spend your time on roles worth applying to.
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginTop: "8px" }}>
            <GoogleButton next={next} large onError={setErr} />
            {err ? (
              <div role="alert" style={{ maxWidth: "460px", padding: "10px 14px", borderRadius: "10px", background: "#FBEAEA",
                color: "#8A2A2A", fontSize: "14px", lineHeight: 1.5 }}>
                {"Couldn't sign you in: "}{err}
              </div>
            ) : null}
            <div style={{ fontSize: "13px", color: C.muted }}>Free. Google is only used to sign you in.</div>
          </div>
          <div style={{ marginTop: "16px", fontSize: "14px", color: C.plumDeep, fontWeight: 500 }}>{countLine}</div>
        </section>

        <section style={{ background: "#FFFFFF", borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "72px 40px",
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "40px" }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "20px", background: C.plumSoft, color: C.plum,
                  display: "flex", alignItems: "center", justifyContent: "center", fontFamily: serif, fontSize: "22px" }}>
                  {s.n}
                </div>
                <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 600, letterSpacing: "-0.2px" }}>{s.title}</h2>
                <p style={{ margin: 0, lineHeight: 1.65, color: C.muted }}>{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: C.plumDeep, color: "#FFFFFF" }}>
          <div style={{ maxWidth: "880px", margin: "0 auto", padding: "72px 40px", textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: "44px", lineHeight: 1.1, letterSpacing: "-0.8px" }}>
              Five minutes to set up. <span style={{ color: C.banana }}>Then the search works for you.</span>
            </h2>
            <GoogleButton next={next} large onError={setErr} />
          </div>
        </section>
      </main>

      <footer style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 40px", display: "flex", flexWrap: "wrap",
        justifyContent: "space-between", gap: "12px", fontSize: "13px", color: C.muted }}>
        <span>aligned · New York City</span>
        <span>Job details come from employers' own career pages and may change.</span>
      </footer>
    </div>
  );
}
