// Choose the jobs for onboarding's quick picks: a few close to the person's
// resume, plus wild cards from other role types, all real open NYC jobs.
import type { PostingSection } from "../types";

export interface PickCard {
  id: string; mono: string; title: string; company: string; loc: string; pay: string;
  stage: string; lane: string; wild: boolean; about: string; does: string[]; wants: string[];
}

export interface Candidate {
  id: string; mono: string; title: string; company: string; loc: string;
  lo: number | null; hi: number | null; role: string; ind: string; skills: string[]; summary: string;
}

export interface ProfileForPicks {
  headline?: string; skills?: string[]; exp?: { role?: string }[];
}

const STOP = new Set(("and the for with you our are your from that this will have has all any can into who what when where " +
  "senior junior lead staff manager associate assistant intern new york nyc team role work job").split(" "));

function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z+#.]{1,}/g) || []).map((t) => t.replace(/\.$/, "")).filter((t) => t.length > 2 && !STOP.has(t));
}

/** Small deterministic shuffle so a person sees the same wild cards on reload but people differ. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}

export function choosePicks(cands: Candidate[], profile: ProfileForPicks | null, seed: string, close = 4, wild = 3) {
  const want = new Map<string, number>();
  const add = (text: string | undefined, w: number) => tokens(text || "").forEach((t) => want.set(t, Math.max(want.get(t) || 0, w)));
  add(profile?.headline, 3);
  (profile?.exp || []).forEach((e) => add(e.role, 3));
  (profile?.skills || []).forEach((s) => add(s, 2));

  const score = (c: Candidate) => {
    if (!want.size) return 0;
    let n = 0;
    for (const t of new Set(tokens(c.title))) n += (want.get(t) || 0) * 2;
    for (const t of new Set(tokens(c.skills.join(" ")))) n += want.get(t) || 0;
    for (const t of new Set(tokens(c.summary))) n += (want.get(t) || 0) * 0.5;
    return n;
  };

  const chosen: { c: Candidate; wild: boolean }[] = [];
  const usedCo = new Set<string>(), usedTitle = new Set<string>();
  const take = (c: Candidate, isWild: boolean) => {
    chosen.push({ c, wild: isWild });
    usedCo.add(c.company.toLowerCase());
    usedTitle.add(c.title.toLowerCase());
  };
  const fresh = (c: Candidate) => !usedCo.has(c.company.toLowerCase()) && !usedTitle.has(c.title.toLowerCase());

  const ranked = cands.map((c) => ({ c, s: score(c) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  for (const { c } of ranked) {
    if (chosen.length >= close) break;
    if (fresh(c)) take(c, false);
  }

  // Wild cards: other role types, preferably with pay listed, spread across industries.
  const rand = seeded(seed);
  const closeFamilies = new Set(chosen.map((x) => x.c.role));
  const pool = cands.filter((c) => !closeFamilies.has(c.role)).sort(() => rand() - 0.5)
    .sort((a, b) => Number(b.lo != null) - Number(a.lo != null));
  const usedFamily = new Set<string>(), usedInd = new Set<string>();
  const wildTarget = close + wild - chosen.length; // with no resume, everything is a wild card
  let picked = 0;
  for (const strict of [true, false]) {
    for (const c of pool) {
      if (picked >= wildTarget) break;
      if (!fresh(c)) continue;
      if (strict && (usedFamily.has(c.role) || usedInd.has(c.ind))) continue;
      take(c, want.size > 0);
      usedFamily.add(c.role); usedInd.add(c.ind);
      picked++;
    }
  }
  // Close matches first, then wild cards mixed in.
  return chosen;
}

const DOES = /respons|what you.?ll do|what you will do|the role|day[- ]to[- ]day|you will|duties|your impact|in this role/i;
const WANTS = /requir|qualif|what you.?ll (?:bring|need)|you have|you bring|about you|looking for|skills|experience|who you are|must have|nice to have/i;

export function cardDetails(sections: PostingSection[], fallback: { summary: string; wants: string[] }) {
  const items = (re: RegExp) => {
    const s = sections.find((x) => re.test(x.h));
    const list = s ? (s.items?.length ? s.items : s.text ? [s.text] : []) : [];
    return list.map((t) => t.replace(/^[•●▪◦\-–—*]\s*/, "").trim()).filter((t) => t.length > 3)
      .slice(0, 4).map((t) => (t.length > 150 ? t.slice(0, 147).replace(/\s+\S*$/, "") + "…" : t));
  };
  const does = items(DOES);
  const wants = items(WANTS);
  return {
    does: does.length ? does : fallback.summary ? [fallback.summary] : [],
    wants: wants.length ? wants : fallback.wants,
  };
}
