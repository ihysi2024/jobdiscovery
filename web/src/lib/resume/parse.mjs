// Turn resume text into profile fields: name, headline, contact links, experience,
// education and skills. Plain rules, run in the browser; the person reviews and
// edits everything before it's saved, so this aims for a good first draft.

const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const SEASON = "(?:spring|summer|fall|autumn|winter)";
const YEAR = "(?:19|20)\\d{2}";
const POINT = `(?:(?:${MONTH}|${SEASON})\\s+${YEAR}|\\d{1,2}\\/(?:\\d{1,2}\\/)?${YEAR}|${YEAR})`;
const NOW = "(?:present|current|now|today|ongoing)";
const DASH = "\\s*(?:-|–|—|to|until)\\s*";
const DATE_RANGE = new RegExp(`${POINT}(?:${DASH}(?:${POINT}|${NOW}))?|(?:expected|anticipated)\\s+${POINT}`, "i");
const DATE_RANGE_G = new RegExp(DATE_RANGE.source, "gi");

const SECTIONS = [
  ["experience", /^(?:work|professional|relevant|industry|research|employment|career)?\s*(?:experience|employment|work history|history)s?$|^experience\s*&\s*\w+$/i],
  ["education", /^(?:education|academic background|academics|education\s*&\s*\w+)$/i],
  ["skills", /^(?:(?:technical|core|key|relevant)\s+)?(?:skills|competencies|technologies|tools)(?:\s*(?:&|and)\s*\w+)?$|^skills\s*(?:&|and)\s*\w+$|^technical\s+proficiencies$/i],
  ["projects", /^(?:selected\s+|personal\s+|academic\s+)?projects$/i],
  ["summary", /^(?:summary|profile|about(?: me)?|objective|professional summary)$/i],
  ["other", /^(?:certifications?|licenses?|publications?|awards?|honors?|honors\s*&\s*awards|activities|leadership|volunteer(?:ing| experience)?|interests|languages|patents|presentations|references|additional(?: information)?|coursework|relevant coursework)$/i],
];

const ROLE_WORDS = /\b(?:engineer|developer|intern|internship|co-?op|analyst|manager|scientist|assistant|associate|researcher|director|consultant|designer|specialist|lead|fellow|coordinator|technician|nurse|teacher|tutor|officer|administrator|architect|founder|co-?founder|owner|president|vp|head|representative|recruiter|editor|writer|producer|strategist|accountant|advisor|counsel|attorney|paralegal|chef|cook|server|cashier|clerk|operator|mechanic|electrician|therapist|pharmacist|physician|instructor|professor|lecturer|trainee|apprentice|volunteer|member|principal|partner|programmer|staff|sre|devops|ta|ra)\b/i;
const ORG_WORDS = /\b(?:inc|llc|ltd|corp|corporation|company|co|group|labs?|laboratory|university|college|institute|hospital|health|bank|capital|partners|technologies|systems|solutions|therapeutics|bio|foundation|agency|studio|school|center|centre)\b\.?/i;
const DEGREE = /\b(?:b\.?\s?s\.?|b\.?\s?a\.?|b\.?\s?eng|b\.?\s?sc|m\.?\s?s\.?|m\.?\s?a\.?|m\.?\s?eng|m\.?\s?sc|m\.?\s?b\.?\s?a\.?|ph\.?\s?d\.?|m\.?\s?d\.?|j\.?\s?d\.?|bachelor'?s?|master'?s?|doctor(?:ate)?|associate'?s?|diploma|certificate|ged|minor|major|double major|concentration)\b/i;
const SCHOOL = /\b(?:university|college|institute|school|academy|polytechnic|conservatory|community college|bootcamp|omscs|georgia tech|mit|ucla|nyu|cuny|suny)\b/i;
// "New York, NY", "Brooklyn, NY, USA", "Remote" at the end of a line. Only two-letter state codes, so
// "Software Engineer, Flip" isn't mistaken for a place.
const LOCATION = /(?:\s*[,|·•–—-]?\s*)(?:\(?(?:remote|hybrid|on-?site)\)?|(?:[A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2}(?:,\s*USA?)?))\s*$/;
const BULLET = /^\s*(?:[•●▪◦‣∙·*\-–—]|\d+[.)])\s+/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const URL_RE = /\b(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/[\w-]+|github\.com\/[\w-]+|[\w-]+\.(?:com|io|dev|me|org|net)(?:\/[\w\-./]*)?)\/?/gi;

const clean = (s) => s.replace(/\s+/g, " ").replace(/^[\s,|·•–—-]+|[\s,|·•–—:-]+$/g, "").trim();

function sectionOf(line) {
  const t = clean(line.replace(/[:：]$/, ""));
  if (!t || t.length > 40 || t.split(" ").length > 5) return null;
  for (const [key, re] of SECTIONS) if (re.test(t)) return key;
  return null;
}

function isContactLine(line) {
  const rest = line.replace(EMAIL, "").replace(PHONE, "").replace(URL_RE, "").replace(/[|·•,]/g, " ");
  return (EMAIL.test(line) || PHONE.test(line) || /linkedin|github/i.test(line)) && clean(rest).split(" ").length <= 6;
}

function datesIn(line) {
  const m = line.match(DATE_RANGE_G);
  return m ? m.map((d) => d.replace(/\s*(?:-|—|to|until)\s*/i, " – ").replace(/\s+/g, " ").trim()).join(", ") : "";
}

function stripDates(line) {
  return clean(line.replace(DATE_RANGE_G, " ").replace(/\(\s*\)/g, " "));
}

function stripLocation(s) {
  let out = s;
  for (let i = 0; i < 2; i++) out = out.replace(LOCATION, "");
  return clean(out);
}

/** Split "Software Engineer, Acme Corp" or "Acme | Software Engineer" into role and org. */
export function splitRoleOrg(text) {
  const t = stripLocation(text);
  const at = t.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (at) return { role: clean(at[1]), org: stripLocation(at[2]) };
  const parts = t.split(/\s+[|·•–—]\s+|\s+-\s+|,\s+(?=[A-Z])/).map(clean).filter(Boolean);
  if (parts.length >= 2) {
    const roleIdx = parts.findIndex((p) => ROLE_WORDS.test(p) && !ORG_WORDS.test(p));
    const i = roleIdx >= 0 ? roleIdx : ORG_WORDS.test(parts[0]) ? 1 : 0;
    const role = parts[i];
    const org = parts.filter((_, j) => j !== i)[0];
    return { role, org };
  }
  return ROLE_WORDS.test(t) && !ORG_WORDS.test(t) ? { role: t, org: "" } : { role: "", org: t };
}

function groupByDates(lines) {
  // Each line with a date starts or completes an entry; up to two header lines above it join in.
  const entries = [];
  let cur = null;
  let pending = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = BULLET.test(line);
    const dates = bullet ? "" : datesIn(line);
    if (dates) {
      const rest = stripDates(line);
      cur = { header: [...pending, rest].filter(Boolean), dates, body: [] };
      entries.push(cur);
      pending = [];
    } else if (bullet || line.length > 110) {
      if (cur) cur.body.push(line);
      pending = [];
    } else if (cur && cur.header.length < 2 && !cur.body.length) {
      cur.header.push(line); // a title or company on the line after the dates
    } else {
      pending.push(line);
      if (pending.length > 2) pending.shift();
    }
  }
  return entries;
}

function parseExperience(lines) {
  const out = [];
  for (const e of groupByDates(lines)) {
    const header = e.header.map(stripLocation).filter(Boolean);
    let role = "", org = "";
    if (header.length >= 2) {
      const [a, b] = header;
      const aRole = ROLE_WORDS.test(a) && !ORG_WORDS.test(a);
      const bRole = ROLE_WORDS.test(b) && !ORG_WORDS.test(b);
      if (aRole && !bRole) { role = a; org = b; }
      else if (bRole && !aRole) { role = b; org = a; }
      else {
        const s = splitRoleOrg(a);
        if (s.role && s.org) ({ role, org } = s);
        else { org = a; role = b; }
      }
    } else if (header.length === 1) {
      ({ role, org } = splitRoleOrg(header[0]));
    }
    if (role || org) out.push({ role: clean(role), org: clean(org), dates: e.dates });
  }
  return out.slice(0, 12);
}

function parseEducation(lines) {
  const out = [];
  let cur = null;
  const push = () => { if (cur && (cur.school || cur.degree)) out.push(cur); };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || BULLET.test(line)) continue;
    const dates = datesIn(line);
    const text = stripLocation(stripDates(line));
    const isSchool = SCHOOL.test(text);
    const isDegree = DEGREE.test(text);
    if (isSchool && !(cur && !cur.school && cur.degree && !isDegree)) {
      push();
      cur = { degree: "", school: "", dates: "" };
    }
    if (!cur) cur = { degree: "", school: "", dates: "" };
    if (isSchool && isDegree) {
      const parts = text.split(/\s+[|·•–—]\s+|\s+-\s+|,\s+(?=[A-Z])/).map(clean);
      let si = parts.findIndex((p) => SCHOOL.test(p) && !DEGREE.test(p));
      if (si < 0) si = parts.findIndex((p) => SCHOOL.test(p));
      cur.school = cur.school || parts[si] || text;
      cur.degree = cur.degree || parts.filter((_, j) => j !== si).join(", ");
    } else if (isSchool) cur.school = cur.school || text;
    else if (isDegree && !cur.degree) cur.degree = text;
    if (dates && !cur.dates) cur.dates = dates;
  }
  push();
  return out.slice(0, 6).map((e) => ({ degree: clean(e.degree), school: clean(e.school), dates: e.dates }));
}

function parseSkills(lines) {
  const seen = new Set();
  const out = [];
  for (const raw of lines) {
    const line = raw.replace(BULLET, "").replace(/^[^:]{1,40}:\s*/, "");
    for (const piece of line.split(/\s*[,;|•·●▪]\s*|\s{3,}/)) {
      const s = clean(piece.replace(/\.$/, ""));
      if (!s || s.length > 40 || s.split(" ").length > 5) continue;
      const k = s.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(s); }
    }
  }
  return out.slice(0, 30);
}

function looksLikeName(line) {
  const t = clean(line);
  if (!t || t.length > 50 || /\d|@|https?:|www\./.test(t)) return false;
  const words = t.split(" ");
  return words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Za-zÀ-ÿ'’.-]+$/.test(w)) && !sectionOf(t);
}

const titleCase = (s) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s'’-])\p{L}/gu, (m) => m.toUpperCase()) : s);

export function parseResume(text) {
  const lines = (text || "").replace(/\r/g, "").split("\n").map((l) => l.replace(/ /g, " ").trimEnd());
  const sections = { top: [] };
  let key = "top";
  for (const line of lines) {
    const k = sectionOf(line);
    if (k) { key = k; sections[key] = sections[key] || []; continue; }
    (sections[key] = sections[key] || []).push(line);
  }

  const top = sections.top.map((l) => l.trim()).filter(Boolean);
  const nameLine = top.slice(0, 4).find(looksLikeName) || "";
  const name = titleCase(clean(nameLine));
  const email = (text.match(EMAIL) || [""])[0];
  const links = [...new Set((text.match(URL_RE) || []).filter((u) => !EMAIL.test(u) && /linkedin|github|\.(io|dev|me)\b/i.test(u)))]
    .map((u) => u.replace(/\/$/, "")).slice(0, 3);

  const experience = parseExperience(sections.experience || []);
  const education = parseEducation(sections.education || []);
  const skills = parseSkills(sections.skills || []);

  const afterName = top.slice(top.indexOf(nameLine) + 1).find((l) => !isContactLine(l) && l.length <= 90 && !datesIn(l));
  const usable = afterName && (!looksLikeName(afterName) || ROLE_WORDS.test(afterName));
  const headline = clean(usable ? afterName : experience[0]?.role || "");

  return { name, headline, email, links, experience, education, skills };
}
