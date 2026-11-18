// Prints this app's embeddings for a few texts as JSON, to compare with the
// Python pipeline's (see .github/workflows/check-embed.yml).
import { embedText } from "../src/lib/embed.mjs";
const texts = JSON.parse(process.argv[2]);
const out = [];
for (const t of texts) out.push(await embedText(t));
console.log(JSON.stringify(out));
