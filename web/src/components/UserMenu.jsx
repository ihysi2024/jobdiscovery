"use client";
// Header avatar: the signed-in person's initials, with a menu to see the profile or sign out.
import React from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AUTH_ENABLED } from "@/lib/supabase/env";

function initialsOf(name, email) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (email || "?").slice(0, 2).toUpperCase();
}

export default function UserMenu({ dark = false }) {
  const [user, setUser] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!AUTH_ENABLED) return;
    const sb = supabaseBrowser();
    sb.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const meta = user?.user_metadata || {};
  const name = meta.full_name || meta.name || "";
  const email = user?.email || "";
  const avatar = meta.avatar_url || meta.picture;
  const circle = {
    width: "36px", height: "36px", borderRadius: "18px", border: "none", padding: 0, cursor: "pointer",
    background: dark ? "#7A3E6E" : "#F3E6EF", color: dark ? "#FFFFFF" : "#5E2A54",
    display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "14px",
    fontFamily: "inherit", overflow: "hidden",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" style={circle} aria-haspopup="menu" aria-expanded={open}
        aria-label={user ? `Account: ${name || email}` : "Account"} onClick={() => setOpen(!open)}>
        {avatar
          ? <img src={avatar} alt="" width={36} height={36} referrerPolicy="no-referrer" style={{ display: "block" }} />
          : initialsOf(name, email)}
      </button>
      {open ? (
        <div role="menu" style={{ position: "absolute", right: 0, top: "44px", zIndex: 50, minWidth: "220px", background: "#FFFFFF",
          border: "1px solid #E6DED0", borderRadius: "12px", boxShadow: "0 12px 32px rgba(42,32,40,0.12)", padding: "8px", fontSize: "14px" }}>
          {user ? (
            <div style={{ padding: "8px 10px 10px", borderBottom: "1px solid #EFE9D8", marginBottom: "6px" }}>
              <div style={{ fontWeight: 600, color: "#2A2028" }}>{name || "Signed in"}</div>
              <div style={{ color: "#665D63", marginTop: "2px", wordBreak: "break-all" }}>{email}</div>
            </div>
          ) : null}
          <Link role="menuitem" href="/profile" onClick={() => setOpen(false)}
            style={{ display: "block", padding: "8px 10px", borderRadius: "8px", color: "#2A2028", textDecoration: "none" }}>
            Profile and plan
          </Link>
          {user ? (
            <form action="/auth/signout" method="post">
              <button role="menuitem" type="submit" style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px",
                borderRadius: "8px", border: "none", background: "transparent", color: "#2A2028", font: "inherit", cursor: "pointer" }}>
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
