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

// Short names for their long-term goals (setup step 3), for sentences like "a step toward research".
const DREAM_GOAL = {
  research: "research", care: "caring for people", build: "building things", teach: "teaching and mentoring",
  create: "creative work", outdoors: "working outdoors", hands: "hands-on work", own: "starting something of your own",
  community: "helping your community",
};
const HORIZON_GOAL = [
  [/leading projects or people/i, "leading projects or people"], [/managing a team/i, "managing a team"],
  [/leadership role/i, "a leadership role"], [/go-to expert/i, "becoming the go-to expert in your area"],
  [/senior expert/i, "becoming a senior expert in your field"], [/known in my field/i, "being known in your field"],
  [/running my own thing/i, "running your own thing"], [/owning a business/i, "owning a business"],
  [/settled into a new field/i, "a new field"], [/different industry/i, "a different industry"],
  [/studying or training/i, "more training"], [/working less/i, "working less"],
  [/good work in my field/i, "doing good work in your field"],
];

/** A few words for where they want to go long-term, or "" when they didn't say. */
export function goalLabel(future) {
  if (!future) return "";
  const dream = (future.dreams || []).map((x) => DREAM_GOAL[x]).find(Boolean);
  if (dream) return dream;
  for (const k of ["y3", "y5", "y1", "y10"]) {
    const v = (future.horizons || {})[k];
    if (!v || /still exploring/i.test(v)) continue;
    const hit = HORIZON_GOAL.find(([re]) => re.test(v));
    if (hit) return hit[1];
    if (v.length <= 60) return v.charAt(0).toLowerCase() + v.slice(1);
  }
  const own = (future.own || "").trim();
  return own && own.length <= 60 ? own.charAt(0).toLowerCase() + own.slice(1).replace(/\.$/, "") : "";
}

/**
 * @param d      match detail for the job
 * @param job    { title, summary, skills }
 * @param profile { skills, exp: [{ role }], future } or null
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

  // 1b. What it asks for that they have, or don't.
  const DEGREE = { high_school: "a high school diploma", associate: "an associate degree", bachelors: "a bachelor's degree", masters: "a master's degree", phd: "a doctorate", professional: "a professional degree" };
  const missing = [...(d.missing || [])];
  if (d.degree_ok === 0 && DEGREE[d.degree_required]) missing.push(DEGREE[d.degree_required]);
  if (d.req_total >= 2) {
    if (d.req_met === d.req_total) out.push(`You meet all ${d.req_total} of its listed requirements.`);
    else if (d.req_met / d.req_total >= 0.7) out.push(`You meet ${d.req_met} of its ${d.req_total} listed requirements${missing.length ? `; it also asks for ${and(missing.slice(0, 2))}` : ""}.`);
    else if (missing.length) out.push(`It asks for ${and(missing.slice(0, 3))}, which ${missing.length === 1 ? "isn't" : "aren't"} on your profile.`);
  }

  // 2. The priorities a posting can show.
  const extras = [];
  const pay = payRange(d.salary_min, d.salary_max);
  if (d.wants_pay && pay) extras.push((d.pay ?? 0) >= 0.75 ? `it pays ${pay}, more than most roles here` : `it pays ${pay}`);
  if ((d.wants_flex || (d.modes || []).length) && d.mode !== "onsite" && MODE[d.mode]) extras.push(`it's ${lower(MODE[d.mode])}, which suits you`);
  if (d.wants_mission && d.mission) extras.push(`it's in ${d.industry}, if mission matters to you`);
  if (d.wants_growth && (d.growth || d.early_program)) extras.push(d.growth ? "it offers mentorship or training" : "it's a training program");
  if (d.wants_stability && d.stability === 1) extras.push("the employer looks stable");
  if (d.wants_wlb && d.wlb === 1) extras.push("the posting mentions flexible hours or generous leave");
  if (d.wants_status && d.large_employer) extras.push("it's a large, well-known employer");
  if (d.wants_manage && d.manages) extras.push("you'd lead people or projects");
  if (d.wants_own && d.ownership) extras.push("you'd own a lot of the work");
  if (extras.length) out.push(cap(extras.slice(0, 2).join(", and ")) + ".");
  const cautions = [];
  if (d.wants_wlb && d.wlb === -1) cautions.push("the posting mentions on-call or long hours");
  if (d.wants_stability && d.stability === -1) cautions.push("it's contract or early-stage");
  if (cautions.length) out.push(`Heads up: ${and(cautions)}.`);

  // 2b. The long view: does it move them toward where they want to go?
  const goal = goalLabel(profile && profile.future);
  const reach = d.q == null || d.q >= 0.45;
  if (d.has_goals && goal) {
    if ((d.step ?? 0) >= 0.5 && reach) out.push(`Long term, it's a step toward ${goal}: closer to where you want to go than your current work, and within reach.`);
    else if ((d.step ?? 0) >= 0.5) out.push(`It points toward ${goal}, but it's a big jump from where you are now.`);
    else if ((d.goal ?? 0) >= 0.85) out.push(`It lines up with what you want long-term: ${goal}.`);
    else if (d.progress != null && d.progress < -0.04 && (d.bg ?? 0) >= 0.7) out.push(`It fits your background, but it wouldn't move you toward ${goal}.`);
  }

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
