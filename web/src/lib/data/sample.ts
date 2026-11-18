// Demo data from the design mockup, used until the jobs database is connected
// (NEXT_PUBLIC_DATA_SOURCE=sample). Shapes match what the Supabase source returns.
import type { JobPage, DataSource, JobDetail, JobSummary, WorkMode } from "../types";
import { choosePicks } from "./picks";

type Raw = Omit<JobSummary, "id" | "companyId" | "roleLabel" | "indLabel" | "lvlLabel" | "l" | "lo" | "hi"> & {
  l: string; lo: number; hi: number;
};

// prettier-ignore
const STRONG: Raw[] = [
      { mono: 'PB', title: 'Machine Learning Engineer, Imaging', company: 'Parallax Bio', loc: 'New York · Hybrid', stage: 'Series C', lo: 165, hi: 195, role: 'ml', ind: 'bio', l: 'nyc', lvl: 'mid', process: true, steps: 5, contacts: 6, days: 2,
        why: 'They are training pathology models to catch tumors earlier. If mission tops your list and you have worked on imaging data before, this is about as close a match as you will find.' },
      { mono: 'CV', title: 'Software Engineer, Data Platform', company: 'Cellvue', loc: 'Remote (US)', stage: 'Series B', lo: 150, hi: 180, role: 'swe', ind: 'bio', l: 'remote', lvl: 'mid', process: true, steps: 4, contacts: 3, days: 5,
        why: 'A small team that protects focus time: no-meeting Wednesdays and a 4-week interview loop that people describe as relaxed. Good if balance matters as much as the work.' },
      { mono: 'TH', title: 'Applied Scientist, Clinical NLP', company: 'Tessellate Health', loc: 'New York · Onsite', stage: 'Public', lo: 180, hi: 220, role: 'ml', ind: 'health', l: 'nyc', lvl: 'senior', process: true, steps: 6, contacts: 9, days: 7,
        why: 'More structure and a bigger name than a startup. Promotions here tend to come quickly, which helps if you are aiming for leading projects within 3 years.' },
      { mono: 'AC', title: 'Senior Software Engineer, Care Tools', company: 'Ardent Care', loc: 'Remote (US)', stage: 'Series D', lo: 175, hi: 205, role: 'swe', ind: 'health', l: 'remote', lvl: 'senior', process: false, steps: 0, contacts: 2, days: 3,
        why: 'Engineers build directly with nurses here. If you said yes to trading some salary for more meaningful work, this is that trade in practice.' },
      { mono: 'NG', title: 'ML Engineer, Sequencing', company: 'Northlight Genomics', loc: 'New York · Hybrid', stage: 'Series A', lo: 155, hi: 185, role: 'ml', ind: 'bio', l: 'nyc', lvl: 'mid', process: true, steps: 4, contacts: 4, days: 0.25,
        why: 'Early-stage and hands-on. You would own models end to end, from instrument data to production. It is less stable, but there is real equity upside.' },
      { mono: 'LD', title: 'ML Engineer, Radiology', company: 'Lumen Diagnostics', loc: 'New York · Hybrid', stage: 'Series B', lo: 160, hi: 190, role: 'ml', ind: 'health', l: 'nyc', lvl: 'mid', process: true, steps: 5, contacts: 3, days: 1,
        why: 'Imaging work again, this time on CT and MRI. The team is small enough that you would shape the model roadmap, not just ship tickets.' },
      { mono: 'QH', title: 'Computer Vision Engineer', company: 'Quarry Health', loc: 'New York · Onsite', stage: 'Series A', lo: 150, hi: 180, role: 'ml', ind: 'health', l: 'nyc', lvl: 'mid', process: true, steps: 4, contacts: 2, days: 3,
        why: 'Vision models that read wound photos for home-care nurses. A clear patient impact, though fully in-office, which you marked as a maybe.' },
      { mono: 'SR', title: 'Senior ML Engineer, Drug Discovery', company: 'Sorrel Therapeutics', loc: 'New York · Hybrid', stage: 'Series C', lo: 190, hi: 230, role: 'ml', ind: 'bio', l: 'nyc', lvl: 'senior', process: true, steps: 6, contacts: 4, days: 12,
        why: 'The highest pay in your matches, and your wet-lab background would matter here. It is a senior role, so expect a longer interview loop.' },
      { mono: 'HB', title: 'Data Engineer, Clinical Data', company: 'Halden Bio', loc: 'New York · Hybrid', stage: 'Public', lo: 145, hi: 175, role: 'swe', ind: 'bio', l: 'nyc', lvl: 'mid', process: false, steps: 0, contacts: 5, days: 8,
        why: 'A stable, public company where people stay a long time. Less ML day to day, but close to the trial data that ML teams depend on.' },
      { mono: 'MW', title: 'Software Engineer, Patient App', company: 'Meadowell', loc: 'Remote (US)', stage: 'Series B', lo: 140, hi: 170, role: 'swe', ind: 'health', l: 'remote', lvl: 'mid', process: true, steps: 3, contacts: 1, days: 2,
        why: 'A short 3-step interview process and a product patients use daily. A good pick if you want to move quickly.' },
      { mono: 'VH', title: 'ML Engineer, Wearables', company: 'Verve Health', loc: 'New York · Hybrid', stage: 'Series C', lo: 170, hi: 200, role: 'ml', ind: 'health', l: 'nyc', lvl: 'senior', process: true, steps: 5, contacts: 3, days: 9,
        why: 'Signal-processing models on heart-rate and sleep data. Different data from imaging, but the same rigor around validation you already know.' },
      { mono: 'AW', title: 'Backend Engineer, Lab Data', company: 'Assay Works', loc: 'New York · Hybrid', stage: 'Seed', lo: 145, hi: 175, role: 'swe', ind: 'bio', l: 'nyc', lvl: 'mid', process: false, steps: 0, contacts: 0, days: 4,
        why: 'A seed-stage team building software for wet labs. You have been the person at the bench, which is rare among engineers here.' },
      { mono: 'FN', title: 'Backend Engineer, Voice', company: 'Fieldnote', loc: 'New York · Onsite', stage: 'Seed', lo: 140, hi: 170, role: 'swe', ind: 'ai', l: 'nyc', lvl: 'mid', process: false, steps: 0, contacts: 0, days: 4,
        why: 'Not health, but it is the voice-AI stack you already know, with a small team and a fast pace. Worth a look if you want to stay close to what you have shipped.' }
];
const POSSIBLE: Raw[] = [
      { mono: 'KT', title: 'MLOps Engineer', company: 'Kestrel Therapeutics', loc: 'New York · Hybrid', stage: 'Series B', lo: 165, hi: 200, role: 'ml', ind: 'bio', l: 'nyc', lvl: 'mid', process: true, steps: 4, contacts: 2, days: 6,
        why: 'Less modeling, more infrastructure. Your production experience carries over; Kubernetes would be the thing to learn.' },
      { mono: 'CH', title: 'ML Engineer, Claims Automation', company: 'Calyx Health', loc: 'New York · Hybrid', stage: 'Series C', lo: 160, hi: 190, role: 'ml', ind: 'health', l: 'nyc', lvl: 'mid', process: true, steps: 4, contacts: 4, days: 5,
        why: 'A strong ML match on paper, but insurance claims sit further from patients than the mission you ranked first.' },
      { mono: 'OM', title: 'Software Engineer, Imaging Pipelines', company: 'Orbital Medical', loc: 'New York · Onsite', stage: 'Series A', lo: 145, hi: 170, role: 'swe', ind: 'health', l: 'nyc', lvl: 'mid', process: false, steps: 0, contacts: 1, days: 10,
        why: 'You would build the pipelines that feed imaging models rather than the models themselves. Close to your CV work, one step from ML.' },
      { mono: 'BB', title: 'Research Engineer, Protein Models', company: 'Bramble Bio', loc: 'New York · Hybrid', stage: 'Series B', lo: 175, hi: 210, role: 'ml', ind: 'bio', l: 'nyc', lvl: 'senior', process: true, steps: 6, contacts: 2, days: 14,
        why: 'Most of the team has PhDs, so this is a stretch. Your lab background is unusual for an engineer and they value it.' },
      { mono: 'FH', title: 'Senior Data Engineer', company: 'Fernhill Health', loc: 'Remote (US)', stage: 'Public', lo: 170, hi: 200, role: 'swe', ind: 'health', l: 'remote', lvl: 'senior', process: true, steps: 5, contacts: 6, days: 3,
        why: 'A senior title asks for a few more years than you have, but your data platform work lines up well.' },
      { mono: 'PL', title: 'Software Engineer, Lab Robotics', company: 'Pipette Labs', loc: 'New York · Onsite', stage: 'Seed', lo: 135, hi: 165, role: 'swe', ind: 'bio', l: 'nyc', lvl: 'mid', process: false, steps: 0, contacts: 0, days: 2,
        why: 'Your bench experience is a real asset here. Pay starts below your range and it is fully in the office.' },
      { mono: 'SH', title: 'Computer Vision Engineer, Skin Checks', company: 'Sona Health', loc: 'New York · Hybrid', stage: 'Series B', lo: 155, hi: 185, role: 'ml', ind: 'health', l: 'nyc', lvl: 'mid', process: true, steps: 3, contacts: 2, days: 11,
        why: 'Good computer vision fit with a short interview loop. The product is consumer-facing, a little lighter on mission.' },
      { mono: 'GG', title: 'Backend Engineer, Genomics Platform', company: 'Gravel Genomics', loc: 'Remote (US)', stage: 'Series A', lo: 150, hi: 175, role: 'swe', ind: 'bio', l: 'remote', lvl: 'mid', process: false, steps: 0, contacts: 3, days: 7,
        why: 'Backend work next to the kind of sequencing data you know. Less ML than your top lanes.' }
];

const ROLE: Record<string, string> = { ml: "ML engineering", swe: "Software engineering", ds: "Data science", research: "Research" };
const IND: Record<string, string> = { bio: "Biotech", health: "Health tech", ai: "AI / ML", fin: "Fintech" };
const LVL: Record<string, string> = { entry: "Entry level", mid: "Mid-level", senior: "Senior", staff: "Staff+" };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const modeOf = (loc: string): WorkMode => (/remote/i.test(loc) ? "remote" : /onsite/i.test(loc) ? "onsite" : "hybrid");

export const SAMPLE_JOBS: JobSummary[] = [
  ...STRONG.map((j) => ({ ...j, possible: false })),
  ...POSSIBLE.map((j) => ({ ...j, possible: true })),
].map((j) => ({
  ...j,
  id: j.mono.toLowerCase() + "-" + slug(j.title),
  companyId: "sample:" + slug(j.company),
  roleLabel: ROLE[j.role] ?? j.role,
  indLabel: IND[j.ind] ?? j.ind,
  lvlLabel: LVL[j.lvl] ?? j.lvl,
  l: modeOf(j.loc),
}));

function detail(j: JobSummary): JobDetail {
  const isPB = j.mono === "PB";
  return {
    ...j,
    url: "https://example.com/careers",
    postedLabel: "Posted " + (j.days < 2 ? "1 day" : Math.floor(j.days) + " days") + " ago",
    payLabel: j.lo != null ? `$${j.lo}k–${j.hi}k` : "",
    levelLabel: j.lvlLabel,
    companyLine: j.stage,
    whyParas: [j.why],
    aboutText: isPB
      ? "You'll join a team of six building whole-slide image models: data pipelines from scanner to training, model development in PyTorch, and deployment into the pathologist review tool."
      : "Sample posting. Connect the jobs database to see real descriptions.",
    aboutBullets: isPB ? ["3+ years shipping ML or production software", "Comfortable with PyTorch, Python and cloud training infrastructure"] : [],
    posting: [{ h: "About the role", text: "This is sample data from the design mockup." }],
    timeline: j.process ? "4 weeks" : "",
    timelineSource: j.process ? "from candidate reports" : "",
    steps_: j.process
      ? ["Recruiter screen", "Hiring manager chat", "Technical screen", "Onsite panel", "Offer"].slice(0, Math.max(2, j.steps)).map((name) => ({ name, meta: "" }))
      : [],
  };
}

export const sampleSource: DataSource = {
  name: "sample",
  async listJobs() {
    return SAMPLE_JOBS;
  },
  async searchJobs(q) {
    const text = (q.q || "").toLowerCase();
    let jobs = SAMPLE_JOBS.filter((j) =>
      (!q.role?.length || q.role.includes(j.roleLabel)) && (!q.ind?.length || q.ind.includes(j.indLabel)) &&
      (!q.mode?.length || q.mode.includes(j.l)) && (!q.lvl?.length || q.lvl.includes(j.lvl)) &&
      (!q.process || j.process) && (!text || (j.title + " " + j.company + " " + j.why).toLowerCase().includes(text)));
    jobs = q.sort === "pay" ? jobs.slice().sort((a, b) => (b.hi ?? -1) - (a.hi ?? -1)) : jobs.slice().sort((a, b) => a.days - b.days);
    const size = q.pageSize ?? 20, page = q.page ?? 0;
    const count = (key: (j: (typeof SAMPLE_JOBS)[number]) => string) => {
      const m = new Map<string, number>();
      SAMPLE_JOBS.forEach((j) => m.set(key(j), (m.get(key(j)) || 0) + 1));
      return [...m.entries()].map(([value, n]) => ({ value, n })).sort((a, b) => b.n - a.n);
    };
    const res: JobPage = {
      jobs: jobs.slice(page * size, page * size + size).map((j) => ({ ...j, roleLabel: j.roleLabel, role: j.roleLabel, ind: j.indLabel })),
      total: jobs.length,
      facets: { role: count((j) => j.roleLabel), ind: count((j) => j.indLabel), mode: count((j) => j.l), lvl: count((j) => j.lvl) },
    };
    return res;
  },
  async countJobs() {
    return SAMPLE_JOBS.length;
  },
  async getJob(id) {
    const j = SAMPLE_JOBS.find((x) => x.id === id) ?? (id === "sample" ? SAMPLE_JOBS[0] : undefined);
    return j ? detail(j) : null;
  },
  async marketStats() {
    const rows = SAMPLE_JOBS.map((j) => ({ role: j.roleLabel, industry: j.indLabel, lo: j.lo, hi: j.hi }));
    const med = (xs: number[]) => { const v = xs.slice().sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] * 1000 : null; };
    const groups = new Map<string, { role: string | null; industry: string | null; allRoles: boolean; allIndustries: boolean; items: typeof rows }>();
    for (const r of rows) {
      for (const [role, industry] of [[r.role, r.industry], [r.role, null], [null, r.industry], [null, null]] as const) {
        const key = `${role}|${industry}`;
        if (!groups.has(key)) groups.set(key, { role, industry, allRoles: role === null, allIndustries: industry === null, items: [] });
        groups.get(key)!.items.push(r);
      }
    }
    return [...groups.values()].map((g) => ({ role: g.role, industry: g.industry, allRoles: g.allRoles, allIndustries: g.allIndustries,
      openings: g.items.length, withPay: g.items.filter((i) => i.lo != null).length,
      payLo: med(g.items.flatMap((i) => (i.lo != null ? [i.lo] : []))), payHi: med(g.items.flatMap((i) => (i.hi != null ? [i.hi] : []))) }));
  },
  async roleFamiliesOf(ids) {
    return [...new Set(SAMPLE_JOBS.filter((j) => ids.includes(j.id)).map((j) => j.roleLabel))];
  },
  async quickPicks(profile, seed) {
    const cands = SAMPLE_JOBS.map((j) => ({ id: j.id, mono: j.mono, title: j.title, company: j.company, loc: j.loc,
      lo: j.lo, hi: j.hi, role: j.roleLabel, ind: j.indLabel, skills: [], summary: j.why }));
    return choosePicks(cands, profile, seed).map(({ c, wild }) => ({
      id: c.id, mono: c.mono, title: c.title, company: c.company, loc: c.loc,
      pay: c.lo != null ? `$${c.lo}–${c.hi}k` : "Pay not listed", stage: c.ind, lane: c.role, wild,
      about: c.summary, does: ["Sample data: connect the jobs database to see real postings."], wants: [],
    }));
  },

};
