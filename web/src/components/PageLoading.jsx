// Shown while a page loads. It stays invisible for the first second, so quick
// pages don't flash, then fades in; after a few more seconds it says why it's slow.
export default function PageLoading({ what = "Loading" }) {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <div className="page-loading__inner">
        <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "30px", letterSpacing: "-0.5px", color: "#2A2028" }}>aligned</div>
        <div className="page-loading__bar" aria-hidden="true"><span /></div>
        <div style={{ font: "500 16px Inter, sans-serif", color: "#2A2028" }}>{what}…</div>
        <div className="page-loading__later" style={{ font: "400 14px Inter, sans-serif", color: "#665D63", maxWidth: "340px", textAlign: "center", lineHeight: 1.5 }}>
          Still working. Matching thousands of jobs to you can take a few seconds.
        </div>
      </div>
    </div>
  );
}

/** A small "Updating…" note for in-page changes (filters, pages), also after a second. */
export function UpdatingNote({ show, text = "Updating results…" }) {
  if (!show) return null;
  return (
    <div className="updating-note" role="status" aria-live="polite">
      <span className="updating-note__dot" aria-hidden="true" />{text}
    </div>
  );
}
