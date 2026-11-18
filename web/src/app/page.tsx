import { redirect } from "next/navigation";
import Landing from "@/screens/Landing";
import { data } from "@/lib/data";
import { currentUser, onboardingDone } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export const revalidate = 0;

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await currentUser()) redirect(safeNext(next, (await onboardingDone()) ? "/jobs" : "/onboarding"));
  let count: number | null = null;
  try {
    count = await data().countJobs();
  } catch {
    count = null; // the page still works without the live number
  }
  return <Landing count={count} next={safeNext(next)} error={error ?? null} />;
}
