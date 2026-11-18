// Useful links about a company for the job page. We only link directly where we
// know the address (their own site, the posting); elsewhere we link to a search,
// rather than guess a page that may be wrong.

const HIRING_HOSTS = /(greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|myworkdaysite\.com|smartrecruiters\.com|workable\.com|icims\.com|jobvite\.com|bamboohr\.com|recruitee\.com|rippling\.com|breezy\.hr|jazzhr\.com|applytojob\.com|teamtailor\.com|personio\.\w+)$/i;

export function companyWebsite(postingUrl) {
  try {
    const u = new URL(postingUrl);
    if (HIRING_HOSTS.test(u.hostname)) return null;
    const host = u.hostname.replace(/^(www|jobs|careers|boards|apply)\./i, "");
    return `https://${host}`;
  } catch {
    return null;
  }
}

export function companyLinks({ company, url, jobsHref }) {
  const name = (company || "").trim();
  const q = encodeURIComponent(name);
  const site = companyWebsite(url);
  const links = [];
  if (site) links.push({ label: "Website", sub: site.replace(/^https:\/\//, ""), href: site, kind: "web" });
  if (url) links.push({ label: "Original posting", sub: "On their careers site", href: url, kind: "post" });
  if (name) {
    links.push({ label: "LinkedIn", sub: "Company page and people", href: `https://www.linkedin.com/search/results/companies/?keywords=${q}`, kind: "in" });
    links.push({ label: "Glassdoor", sub: "Reviews and interviews", href: `https://www.glassdoor.com/Search/results.htm?keyword=${q}`, kind: "gd" });
    links.push({ label: "Levels.fyi", sub: "Pay by level", href: `https://www.google.com/search?q=${encodeURIComponent(`site:levels.fyi "${name}"`)}`, kind: "lv" });
    links.push({ label: "Recent news", sub: "Google News", href: `https://news.google.com/search?q=${encodeURIComponent(`"${name}"`)}`, kind: "news" });
  }
  if (jobsHref) links.push({ label: `More roles at ${name || "this company"}`, sub: "Open in New York, on aligned", href: jobsHref, kind: "jobs", internal: true });
  return links;
}
