import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

// Google sends the user back here (through Supabase) with a one-time code.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const fail = (msg: string) => NextResponse.redirect(new URL("/?error=" + encodeURIComponent(msg), url.origin));

  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (oauthError) return fail(oauthError);
  if (!code) return fail("Sign-in didn't finish. Please try again.");

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);
  return NextResponse.redirect(new URL(next, url.origin));
}
