// Meaning-based fingerprint ("embedding") of a profile, made in the browser with the
// same model the job pipeline uses (BAAI/bge-small-en-v1.5, 384 numbers, CLS
// pooling, normalized), so profiles and jobs can be compared directly.
// The resume text stays on the device; only the 384 numbers are saved.

export const EMBED_MODEL = "Xenova/bge-small-en-v1.5";
export const EMBED_DIM = 384;
export const EMBED_DTYPE = (typeof process !== "undefined" && process.env && process.env.EMBED_DTYPE) || "q8";

let extractor = null;

async function load() {
  if (!extractor) {
    const { pipeline } = await import("@huggingface/transformers");
    // q8 is a quarter of the download (about 34 MB, cached after the first time).
    extractor = pipeline("feature-extraction", EMBED_MODEL, { dtype: EMBED_DTYPE });
  }
  return extractor;
}

export async function embedText(text) {
  const run = await load();
  const out = await run(text, { pooling: "cls", normalize: true });
  return Array.from(out.data);
}

/** Text for a profile, shaped like the text the pipeline embeds for jobs. */
export function profileText(p) {
  const roles = (p.exp || []).map((e) => [e.role, e.org].filter(Boolean).join(" at ")).filter(Boolean);
  const parts = [
    p.headline || roles[0] || "",
    roles.slice(0, 5).join(" · "),
    (p.edu || []).map((e) => [e.degree, e.school].filter(Boolean).join(", ")).filter(Boolean).join(" · "),
    p.skills && p.skills.length ? "Skills: " + p.skills.slice(0, 30).join(", ") : "",
    (p.resumeText || "").slice(0, 1500),
  ];
  return parts.filter(Boolean).join("\n");
}
