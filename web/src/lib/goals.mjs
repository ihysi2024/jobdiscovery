// Turn setup step 3 (what they'd do if they didn't have to work, their own words,
// where they see themselves in 1-10 years) into text for the long-term goal
// fingerprint. Written to read like a job description, so it can be compared
// with jobs the same way the resume is.

// Work-shaped dreams. "Travel" and "Spend time with family" are about how they
// want to live, not the work, so they shape priorities (work-life balance) in
// matching instead of this text.
const DREAMS = {
  build: "building and making things: products, systems, tools",
  research: "research, science and discovery; learning and investigating",
  teach: "teaching, mentoring and training others",
  care: "caring for people: health care, patient care, support and wellbeing",
  create: "creative work: art, design, music, writing",
  outdoors: "working outdoors and in the field: environment, nature, sites",
  hands: "hands-on work with tools, equipment, labs or crafts",
  own: "starting and running my own business; entrepreneurship and ownership",
  community: "helping my community: public service, nonprofits, social impact",
};

const SWITCH = /new field|different industry|career change|switch/i;

/**
 * @param {{dreams?: string[]|null, own?: string|null, horizons?: Record<string,string>|null}|null} future
 * @param {{headline?: string}|null} profile  anchors "my field" goals to their current field
 * @returns {string} empty when there's nothing to go on
 */
export function goalText(future, profile) {
  if (!future) return "";
  const dreams = (future.dreams || []).map((d) => DREAMS[d]).filter(Boolean);
  const own = (future.own || "").trim();
  const horizons = Object.entries(future.horizons || {})
    .sort(([a], [b]) => parseInt(a.slice(1)) - parseInt(b.slice(1)))
    .filter(([, v]) => v && !/^still exploring$/i.test(v))
    .map(([k, v]) => `In ${k.slice(1)} year${k === "y1" ? "" : "s"}: ${v}`);
  if (!dreams.length && !own && !horizons.length) return "";
  const switching = horizons.some((h) => SWITCH.test(h));
  const field = !switching && profile && profile.headline ? `Field: ${profile.headline}` : "";
  return [
    dreams.length ? "Work I want to do: " + dreams.join("; ") : "",
    own,
    horizons.join(". "),
    field,
  ].filter(Boolean).join("\n");
}
