// Shapes the screens use. Both data sources (sample and Supabase) return these.

export type WorkMode = "onsite" | "hybrid" | "remote";

/** One row in the job list. Pay is in thousands of US dollars a year. */
export interface JobSummary {
  id: string;
  mono: string;            // two-letter badge for the company
  title: string;
  company: string;
  companyId: string;       // the hiring board key, e.g. "greenhouse:acme"
  loc: string;             // display line, e.g. "New York · Hybrid"
  stage: string;           // funding stage or "Public"; "" if unknown
  lo: number | null;
  hi: number | null;
  role: string;            // role family (filter value)
  roleLabel: string;
  ind: string;             // industry (filter value)
  indLabel: string;
  l: WorkMode;             // work mode (filter value)
  lvl: string;             // seniority (filter value)
  lvlLabel: string;
  process: boolean;        // interview process known
  steps: number;
  contacts: number;
  days: number;            // days since first seen
  why: string;             // one line on why it might fit; the matcher fills this in later
  possible?: boolean;      // a stretch fit rather than a strong match
}

export interface InterviewStep { name: string; meta: string }
export interface Contact { ini: string; name: string; li: string; title: string; email: string; source: string }
export interface ContactGroup { label: string; people: Contact[] }
export interface PostingSection { h: string; text?: string; items?: string[] }

export interface JobDetail extends JobSummary {
  url: string;               // apply link on the employer's site
  postedLabel: string;       // "Posted 2 days ago"
  payLabel: string;          // "$165k–195k" or ""
  levelLabel: string;
  companyLine: string;       // "Series C · 420 people", "" if unknown
  whyParas: string[];        // personalized reasons; empty until matching exists
  aboutText: string;
  aboutBullets: string[];
  posting: PostingSection[]; // the full posting
  timeline: string;          // "4 weeks" or ""
  timelineSource: string;    // "from 14 candidate reports" or "from the posting"
  steps_: InterviewStep[];
  contactGroups: ContactGroup[];
}

/** Open-job counts and median posted pay; allRoles / allIndustries rows are totals. */
export interface MarketRow {
  role: string | null; industry: string | null; allRoles: boolean; allIndustries: boolean;
  openings: number; withPay: number; payLo: number | null; payHi: number | null;
}

export interface JobQuery {
  limit?: number;
}

export interface DataSource {
  name: "sample" | "supabase";
  listJobs(q?: JobQuery): Promise<JobSummary[]>;
  /** Open NYC jobs right now, labeled or not. */
  countJobs(): Promise<number>;
  getJob(id: string): Promise<JobDetail | null>;
  marketStats(): Promise<MarketRow[]>;
  /** Role families of these jobs, most common first (for the person's liked picks). */
  roleFamiliesOf(ids: string[]): Promise<string[]>;
  /** Jobs for onboarding's quick picks, chosen against the person's profile. */
  quickPicks(profile: import("./data/picks").ProfileForPicks | null, seed: string): Promise<import("./data/picks").PickCard[]>;
}
