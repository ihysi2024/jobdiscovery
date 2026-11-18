import Link from "next/link";

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

export function Contact() {
  return CONTACT ? <a href={`mailto:${CONTACT}`} style={{ color: "#7A3E6E" }}>{CONTACT}</a> : <span>the support email shown on the Google sign-in screen</span>;
}

export default function LegalPage({ title, updated, children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFDF5", color: "#2A2028", fontFamily: "Inter, system-ui, sans-serif" }}>
      <header style={{ maxWidth: "760px", margin: "0 auto", padding: "24px 32px" }}>
        <Link href="/" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "28px", color: "#4A2141", textDecoration: "none" }}>aligned</Link>
      </header>
      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "8px 32px 72px", lineHeight: 1.7, fontSize: "16px" }}>
        <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, fontSize: "44px", margin: "0 0 4px", color: "#4A2141" }}>{title}</h1>
        <p style={{ color: "#665D63", marginTop: 0 }}>Last updated {updated}</p>
        {children}
      </main>
    </div>
  );
}
