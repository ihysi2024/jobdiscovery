import { test } from "node:test";
import assert from "node:assert/strict";
import { parseResume, splitRoleOrg } from "../src/lib/resume/parse.mjs";

const TECH = `Ira Hysi
New York, NY | ira@example.com | (555) 123-4567 | linkedin.com/in/ira-hysi
Software engineer working across ML and biotech

EXPERIENCE
Software Engineer, Flip — New York, NY            June 2025 – September 2026
• Built voice AI pipelines serving 2M calls a month
• Led migration to streaming ASR
Computer Vision Intern | Genentech                 Jan 2022 – Sep 2022
• Trained segmentation models on oncology images
Research Assistant
Translational Therapeutic Delivery Lab, Northeastern University
2020 – 2022
• 3D-printed GelMA tumor models

EDUCATION
Georgia Institute of Technology
M.S. Computer Science (Machine Learning)          Expected 2028
Northeastern University, Boston, MA               2017 – 2022
B.S. Chemical Engineering and Computer Science

SKILLS
Languages: Python, TypeScript, SQL
ML: PyTorch, computer vision, segmentation
Lab: ddPCR, CRISPR, cell culture
`;

const NURSE = `MARIA SANTOS
Registered Nurse
maria.santos@example.com • 917-555-0199 • Bronx, NY

Professional Experience
Mount Sinai Hospital
Registered Nurse, Cardiac ICU
03/2021 - Present
- Care for 2-3 critical patients per shift
NewYork-Presbyterian
Patient Care Technician                 2018 - 2021

Education
Bachelor of Science in Nursing
Hunter College, CUNY                     2014 - 2018

Licenses
RN License, New York State

Skills
Critical care; ACLS; BLS; Epic charting; Spanish (fluent)
`;

const CAFE = `Sam Lee
sam.lee@example.com

Work History
Shift Lead at Blue Bottle Coffee            Summer 2023 - Present
Barista - Joe Coffee - New York, NY         2021 - 2023

Education
High School Diploma, Stuyvesant High School   2021
`;

test("tech resume", () => {
  const r = parseResume(TECH);
  assert.equal(r.name, "Ira Hysi");
  assert.equal(r.email, "ira@example.com");
  assert.equal(r.headline, "Software engineer working across ML and biotech");
  assert.deepEqual(r.links, ["linkedin.com/in/ira-hysi"]);
  assert.deepEqual(r.experience, [
    { role: "Software Engineer", org: "Flip", dates: "June 2025 – September 2026" },
    { role: "Computer Vision Intern", org: "Genentech", dates: "Jan 2022 – Sep 2022" },
    { role: "Research Assistant", org: "Translational Therapeutic Delivery Lab, Northeastern University", dates: "2020 – 2022" },
  ]);
  assert.equal(r.education.length, 2);
  assert.equal(r.education[0].school, "Georgia Institute of Technology");
  assert.match(r.education[0].degree, /M\.S\. Computer Science/);
  assert.match(r.education[0].dates, /2028/);
  assert.equal(r.education[1].school, "Northeastern University");
  assert.match(r.education[1].degree, /B\.S\. Chemical Engineering/);
  assert.equal(r.education[1].dates, "2017 – 2022");
  for (const s of ["Python", "TypeScript", "PyTorch", "ddPCR", "CRISPR"]) assert.ok(r.skills.includes(s), s);
});

test("nurse resume: company on its own line, dates on their own line", () => {
  const r = parseResume(NURSE);
  assert.equal(r.name, "Maria Santos");
  assert.equal(r.headline, "Registered Nurse");
  assert.deepEqual(r.experience[0], { role: "Registered Nurse, Cardiac ICU", org: "Mount Sinai Hospital", dates: "03/2021 – Present" });
  assert.deepEqual(r.experience[1], { role: "Patient Care Technician", org: "NewYork-Presbyterian", dates: "2018 – 2021" });
  assert.equal(r.education[0].degree, "Bachelor of Science in Nursing");
  assert.equal(r.education[0].school, "Hunter College, CUNY");
  assert.deepEqual(r.skills, ["Critical care", "ACLS", "BLS", "Epic charting", "Spanish (fluent)"]);
});

test("service resume: 'at' and dash separators", () => {
  const r = parseResume(CAFE);
  assert.deepEqual(r.experience, [
    { role: "Shift Lead", org: "Blue Bottle Coffee", dates: "Summer 2023 – Present" },
    { role: "Barista", org: "Joe Coffee", dates: "2021 – 2023" },
  ]);
  assert.equal(r.education[0].school, "Stuyvesant High School");
  assert.equal(r.education[0].degree, "High School Diploma");
  assert.equal(r.headline, "Shift Lead");
});

test("nothing recognizable gives empty fields, not junk", () => {
  const r = parseResume("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor");
  assert.deepEqual(r.experience, []);
  assert.deepEqual(r.education, []);
  assert.deepEqual(r.skills, []);
  assert.equal(r.name, "");
});

test("splitRoleOrg", () => {
  assert.deepEqual(splitRoleOrg("Acme Corp | Product Manager"), { role: "Product Manager", org: "Acme Corp" });
  assert.deepEqual(splitRoleOrg("Data Analyst at City of New York"), { role: "Data Analyst", org: "City of New York" });
});
