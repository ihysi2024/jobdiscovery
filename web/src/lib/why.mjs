// "Why you might be interested": a short, plain blurb for one job, written from
// the facts behind its match (see match_jobs() detail) plus the person's profile.
// It only says things we actually know; nothing here is generated freely.

const lower = (s) => (s || "").toLowerCase();
const MODE = { remote: "Remote", hybrid: "Hybrid", onsite: "Onsite" };

function k(n) { return Math.round(n / 1000); }
function payRange(min, max) {
  if (min == null && max == null) return "";
  const lo = k(min ?? max), hi = k(max ?? min);
  return lo === hi ? `$${lo}k` : `$${lo}k–${hi}k`;
}
function and(list) {
  if (list.length <= 1) return list[0] || "";
  return list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Profile skills the job also asks for (from its skill list, then its title and summary). */
export function sharedSkills(profileSkills, job) {
  const jobSkills = (job.skills || []).map(lower);
  const text = lower([job.title, job.summary].join(" "));
  const hits = [];
  for (const s of profileSkills || []) {
    const t = lower(s).trim();
    if (t.length < 2) continue;
    const inList = jobSkills.some((j) => j === t || (t.length > 3 && (j.includes(t) || t.includes(j))));
    const inText = t.length > 2 && new RegExp(`(^|[^a-z0-9+#])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9+#])`).test(text);
    if (inList || inText) hits.push({ s, w: inList ? 2 : 1 });
  }
  return hits.sort((a, b) => b.w - a.w).map((h) => h.s).slice(0, 3);
}

/**
 * @param d      match detail for the job
 * @param job    { title, summary, skills }
 * @param profile { skills, exp: [{ role }] } or null
 * @returns string (empty when there's nothing to say)
 */
export function whyBlurb(d, job, profile) {
  if (!d) return "";
  const out = [];

  // 1. How it connects to what they've done or liked, and their direction.
  const skills = sharedSkills(profile && profile.skills, job).slice(0, 2);
  const lastRole = profile && profile.exp && profile.exp.find((e) => e.role && !/intern/i.test(e.role));
  let first = "";
  if (skills.length && (d.bg ?? 0) >= 0.5) first = `It builds on your ${and(skills)} experience`;
  else if (skills.length) first = `It asks for ${and(skills)}, which you have`;
  else if ((d.bg ?? 0) >= 0.75 && lastRole) first = `It's close to your work as ${/^[aeiou]/i.test(lastRole.role) ? "an" : "a"} ${lastRole.role}`;
  else if ((d.liked ?? 0) >= 0.8) first = "It's a lot like the roles you liked";
  if (d.lane) {
    const where = d.lane === 1 ? `${d.direction}, your top direction` : `${d.direction}, one of your directions`;
    first = first ? `${first}, in ${where}` : `It's in ${where}`;
  }
  if (first) out.push(first + ".");

  // 2. The priorities a posting can show.
  const extras = [];
  const pay = payRange(d.salary_min, d.salary_max);
  if (d.wants_pay && pay) extras.push((d.pay ?? 0) >= 0.75 ? `it pays ${pay}, more than most roles here` : `it pays ${pay}`);
  if ((d.wants_flex || (d.modes || []).length) && d.mode !== "onsite" && MODE[d.mode]) extras.push(`it's ${lower(MODE[d.mode])}, which suits you`);
  if (d.wants_mission && d.mission) extras.push(`it's in ${d.industry}, if mission matters to you`);
  if (extras.length) out.push(cap(extras.slice(0, 2).join(", and ")) + ".");

  // 3. Whether it's within reach.
  const years = d.years != null ? Math.round(d.years) : null;
  if (d.q != null && d.q < 0.3) {
    out.push(d.years_min != null && years != null && d.years_min > years
      ? `It asks for ${Math.round(d.years_min)}+ years and you have about ${years}, so it's a long shot.`
      : "It's well above your current level, so it's a long shot.");
  } else if (d.q != null && d.q < 0.9) {
    out.push(d.years_min != null && years != null && d.years_min > years
      ? `It asks for ${Math.round(d.years_min)}+ years and you have about ${years}, so it's a stretch.`
      : "It's a step up from where you are, so think of it as a stretch.");
  } else if (d.q >= 1 && d.level != null && d.job_level != null) {
    out.push(out.length ? "And it's right at your level." : "It's right at your level.");
  }
  return out.join(" ");
}
