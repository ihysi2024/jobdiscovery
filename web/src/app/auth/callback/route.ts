import { NextResponse, type NextRequest } from "next/server";
import { onboardingDone, supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

// Google sends the user back here (through Supabase) with a one-time code.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const asked = url.searchParams.get("next");
  const fail = (msg: string) => NextResponse.redirect(new URL("/?error=" + encodeURIComponent(msg), url.origin));

  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (oauthError) return fail(oauthError);
  if (!code) return fail("Sign-in didn't finish. Please try again.");

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);
  // New people start onboarding; people who finished it go to their jobs, unless a page was asked for.
  const fallback = (await onboardingDone()) ? "/jobs" : "/onboarding";
  const next = asked === "/onboarding" ? fallback : safeNext(asked, fallback);
  return NextResponse.redirect(new URL(next, url.origin));
}
