"use client";
// The bar across the top of the signed-in app: logo, Jobs / My jobs, an optional search box, account menu.
import Link from "next/link";
import UserMenu from "@/components/UserMenu";

export default function AppHeader({ active, search = null }) {
  const tab = (href, label, key) => (
    <Link href={href} aria-current={active === key ? "page" : undefined} style={{
      textDecoration: "none", padding: "6px 0", color: active === key ? "#2A2028" : "#665D63",
      borderBottom: active === key ? "2px solid #7A3E6E" : "2px solid transparent",
    }}>{label}</Link>
  );
  return (
    <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "32px", padding: "16px 40px", borderBottom: "1px solid #EFE9D8", background: "#FFFFFF" }}>
      <Link href="/jobs" style={{ fontFamily: "'Instrument Serif', serif", fontSize: "26px", letterSpacing: "-0.5px", color: "#2A2028", textDecoration: "none" }}>aligned</Link>
      <nav style={{ display: "flex", gap: "24px", fontWeight: 500 }} aria-label="Main">
        {tab("/jobs", "Jobs", "jobs")}
        {tab("/my-jobs", "My jobs", "my-jobs")}
      </nav>
      <div style={{ flex: "1 1 320px", display: "flex", justifyContent: "flex-end" }}>{search}</div>
      <UserMenu />
    </header>
  );
}
