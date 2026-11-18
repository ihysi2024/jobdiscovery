// Read the text out of a resume file in the browser: PDF (pdf.js) or Word (mammoth).

export const MAX_BYTES = 10 * 1024 * 1024;

export function kindOf(file) {
  const name = (file.name || "").toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (name.endsWith(".doc")) return "doc";
  return null;
}

/** Group pdf.js text items into lines by their vertical position, left to right. */
export function itemsToLines(items) {
  const rows = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const [, , , d, x, y] = it.transform;
    const h = Math.abs(d) || it.height || 10;
    let row = rows.find((r) => Math.abs(r.y - y) <= Math.max(2, h * 0.45));
    if (!row) { row = { y, h, items: [] }; rows.push(row); }
    row.items.push({ x, w: it.width || 0, str: it.str });
  }
  rows.sort((a, b) => b.y - a.y); // PDF y grows upward
  const lines = [];
  let prev = null;
  for (const r of rows) {
    r.items.sort((a, b) => a.x - b.x);
    let line = "";
    let end = null;
    for (const it of r.items) {
      if (end !== null) {
        const gap = it.x - end;
        // Wide gaps (a date pushed to the right margin) become a run of spaces.
        line += gap > r.h * 2 ? "    " : gap > r.h * 0.15 && !line.endsWith(" ") && !it.str.startsWith(" ") ? " " : "";
      }
      line += it.str;
      end = it.x + it.w;
    }
    if (prev && prev.y - r.y > Math.max(prev.h, r.h) * 1.9) lines.push(""); // paragraph gap
    lines.push(line.replace(/[ \t]+$/, ""));
    prev = r;
  }
  return lines;
}

async function pdfText(buf) {
  const pdfjs = await import("pdfjs-dist");
  // Copied into public/ by `npm run copy-pdf-worker` (runs before dev and build).
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data: new Uint8Array(buf) });
  const doc = await task.promise;
  const out = [];
  for (let p = 1; p <= Math.min(doc.numPages, 6); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    out.push(...itemsToLines(content.items), "");
  }
  await task.destroy();
  return out.join("\n");
}

async function docxText(buf) {
  const mammoth = (await import("mammoth/mammoth.browser")).default ?? (await import("mammoth/mammoth.browser"));
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return value.replace(/\n{3,}/g, "\n\n");
}

/** Returns the resume's text, or throws an Error with a message fit to show the person. */
export async function extractText(file) {
  const kind = kindOf(file);
  if (kind === "doc") throw new Error("That's an older .doc file. Save it as PDF or .docx and try again.");
  if (!kind) throw new Error("Use a PDF or Word (.docx) file.");
  if (file.size > MAX_BYTES) throw new Error("That file is over 10 MB. Try a smaller PDF.");
  const buf = await file.arrayBuffer();
  let text;
  try {
    text = kind === "pdf" ? await pdfText(buf) : await docxText(buf);
  } catch (e) {
    console.warn("resume read failed", e);
    if (e && e.name === "PasswordException") throw new Error("That PDF is password-protected. Remove the password and try again.");
    throw new Error("We couldn't read that file. Try saving it again as a PDF.");
  }
  if (text.replace(/\s/g, "").length < 40) {
    throw new Error("We couldn't find any text in that file. If it's a scan or an image, export it from your editor as a PDF with text, or fill in your details below.");
  }
  return text;
}
