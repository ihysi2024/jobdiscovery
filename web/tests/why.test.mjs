import { test } from "node:test";
import assert from "node:assert/strict";
import { whyBlurb, sharedSkills } from "../src/lib/why.mjs";

const ira = { skills: ["Python", "PyTorch", "Computer vision", "SQL", "CRISPR"], exp: [{ role: "Software Engineer" }, { role: "Computer Vision Intern" }] };
const base = { bg: 0.9, liked: 0.5, lane: 1, direction: "Software Engineering", industry: "Fintech", mode: "hybrid", pay: 0.8,
  salary_min: 150000, salary_max: 190000, mission: false, wants_pay: true, wants_flex: true, wants_mission: false,
  modes: ["hybrid", "remote"], q: 1, job_level: 2, level: 2.2, years_min: 3, years: 3.1 };

test("a close, reachable job", () => {
  const b = whyBlurb(base, { title: "ML Engineer", summary: "Train models", skills: ["Python", "PyTorch", "Docker"] }, ira);
  assert.equal(b, "It builds on your Python and PyTorch experience, in Software Engineering, your top direction. It pays $150k–190k, more than most roles here, and it's hybrid, which suits you. And it's right at your level.");
});

test("a stretch says so, with the years", () => {
  const b = whyBlurb({ ...base, q: 0.45, years_min: 6, job_level: 3 }, { title: "Senior ML Engineer", summary: "", skills: ["Python"] }, ira);
  assert.match(b, /It asks for 6\+ years and you have about 3, so it's a stretch\.$/);
});

test("out of reach without stated years", () => {
  const b = whyBlurb({ ...base, q: 0.05, years_min: null, job_level: 5 }, { title: "Director", summary: "", skills: [] }, ira);
  assert.match(b, /well above your current level, so it's a long shot\.$/);
});

test("nothing known gives nothing", () => {
  assert.equal(whyBlurb({ q: 1, level: null, job_level: null }, { title: "x", skills: [] }, null), "");
});

test("skills match words, not pieces of words", () => {
  assert.deepEqual(sharedSkills(["SQL", "R"], { title: "Sales rep", summary: "Uses NoSQL databases", skills: [] }), []);
  assert.deepEqual(sharedSkills(["SQL"], { title: "Analyst", summary: "Write SQL daily", skills: [] }), ["SQL"]);
});

test("company links: website only when the posting is on their own site", async () => {
  const { companyLinks, companyWebsite } = await import("../src/lib/company-links.mjs");
  assert.equal(companyWebsite("https://oscarhealth.com/careers/jobs?gh_jid=1"), "https://oscarhealth.com");
  assert.equal(companyWebsite("https://careers.acme.com/job/1"), "https://acme.com");
  assert.equal(companyWebsite("https://job-boards.greenhouse.io/acme/jobs/1"), null);
  assert.equal(companyWebsite("https://acme.wd1.myworkdayjobs.com/x"), null);
  const links = companyLinks({ company: "Oscar Health", url: "https://boards.greenhouse.io/oscar/jobs/1", jobsHref: "/jobs?q=Oscar" });
  assert.deepEqual(links.map((l) => l.label), ["Original posting", "LinkedIn", "Glassdoor", "Levels.fyi", "Recent news", "More roles at Oscar Health"]);
  assert.match(links[1].href, /keywords=Oscar%20Health$/);
});
